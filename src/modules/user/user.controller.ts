import { Router } from 'express';
import { isAuth, type AuthRequest } from '../../middleware/isAuth.js';
import { hasRole, isSelfOrAdmin } from '../../middleware/hasRole.js';
import { idempotent } from '../../middleware/idempotent.js';
import { ForbiddenError, sendAppError } from '../../utils/errorHandler.js';
import {
  listUsersQuerySchema,
  updateMeSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  userIdsBatchSchema,
} from './user.schemas.js';
import { makeUserService } from './user.service.js';
import type { UserRepo } from '../../core/ports/user.repo.js';
import type { IdempotencyStore } from '../../core/ports/idempotency.repo.js';

export type UserRouterDeps = {
  userRepo: UserRepo;
  /** Enables `Idempotency-Key` support on `POST /` (admin create) when provided. */
  idempotencyStore?: IdempotencyStore;
};

/**
 * Builds the user CRUD router: admin list/create/update/delete plus
 * `GET/PUT /me` for the authenticated user. Admin routes require an
 * `ADMIN` bearer token; `/:id` routes allow the resource owner or an admin.
 */
export function createUserRouter(deps: UserRouterDeps) {
  const router = Router();
  const service = makeUserService({ userRepo: deps.userRepo });
  const createMiddleware = deps.idempotencyStore ? [idempotent(deps.idempotencyStore)] : [];

  router.get('/', isAuth, hasRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const q = listUsersQuerySchema.parse(req.query);
      // An admin scoped to a tenant can only ever list users within that tenant.
      const scopedQuery = req.user!.tenantId !== undefined ? { ...q, tenantId: req.user!.tenantId } : q;
      const data = await service.listUsers(scopedQuery);
      res.json(data);
    } catch (err) {
      sendAppError(res, err);
    }
  });

  router.get('/me', isAuth, async (req: AuthRequest, res) => {
    const data = await service.getUserById(req.user!.id);
    if (!data) return sendAppError(res, new Error('USER_NOT_FOUND'));
    res.json(data);
  });

  router.put('/me', isAuth, async (req: AuthRequest, res) => {
    try {
      const body = updateMeSchema.parse(req.body);
      const data = await service.updateMe(req.user!.id, body);
      res.json(data);
    } catch (err) {
      sendAppError(res, err);
    }
  });

  router.post('/', isAuth, hasRole('ADMIN'), ...createMiddleware, async (req, res) => {
    try {
      const body = adminCreateUserSchema.parse(req.body);
      const data = await service.adminCreateUser(body);
      res.status(201).json(data);
    } catch (err) {
      sendAppError(res, err);
    }
  });

  router.post('/batch', isAuth, hasRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const { ids } = userIdsBatchSchema.parse(req.body);
      const data = await service.getUsersByIds(ids, req.user!.tenantId);
      res.json({ items: data });
    } catch (err) {
      sendAppError(res, err);
    }
  });

  router.get('/:id', isAuth, isSelfOrAdmin(), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } });

    const data = await service.getUserById(id, req.user!.tenantId);
    if (!data) return sendAppError(res, new Error('USER_NOT_FOUND'));
    res.json(data);
  });

  router.put('/:id', isAuth, isSelfOrAdmin(), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } });

      const existing = await service.getUserById(id, req.user!.tenantId);
      if (!existing) return sendAppError(res, new Error('USER_NOT_FOUND'));

      const body = adminUpdateUserSchema.parse(req.body);

      if (req.user!.role !== 'ADMIN' && body.role) {
        return sendAppError(res, new ForbiddenError('Forbidden: cannot change role'));
      }

      const sanitizedBody = { ...body, role: body.role === null ? undefined : body.role };
      const data = await service.adminUpdateUser(id, sanitizedBody);
      res.json(data);
    } catch (err) {
      sendAppError(res, err);
    }
  });

  router.delete('/:id', isAuth, hasRole('ADMIN'), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } });

      const existing = await service.getUserById(id, req.user!.tenantId);
      if (!existing) return sendAppError(res, new Error('USER_NOT_FOUND'));

      await service.adminDeleteUser(id);
      res.status(204).end();
    } catch (err) {
      sendAppError(res, err);
    }
  });

  return router;
}
