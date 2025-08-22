import { Router } from 'express';
import { isAuth, type AuthRequest } from '../../middleware/isAuth.js';
import { hasRole, isSelfOrAdmin } from '../../middleware/hasRole.js';
import {
  listUsersQuerySchema,
  updateMeSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
} from './user.schemas.js';
import { makeUserService } from './user.service.js';
import type { UserRepo } from '../../core/ports/user.repo.js';

export function createUserRouter(deps: { userRepo: UserRepo }) {
  const router = Router();
  const service = makeUserService({ userRepo: deps.userRepo });

  router.get('/', isAuth, hasRole('ADMIN'), async (req, res) => {
    try {
      const q = listUsersQuerySchema.parse(req.query);
      const data = await service.listUsers(q);
      res.json(data);
    } catch (e: any) {
      if (e?.issues) return res.status(400).json({ error: 'ValidationError', details: e.issues });
      res.status(500).json({ error: 'InternalError' });
    }
  });

  router.get('/me', isAuth, async (req: AuthRequest, res) => {
    const data = await service.getUserById(req.user!.id);
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  });

  router.put('/me', isAuth, async (req: AuthRequest, res) => {
    try {
      const body = updateMeSchema.parse(req.body);
      const data = await service.updateMe(req.user!.id, body);
      res.json(data);
    } catch (e: any) {
      if (e?.issues) return res.status(400).json({ error: 'ValidationError', details: e.issues });
      res.status(500).json({ error: 'InternalError' });
    }
  });

  router.post('/', isAuth, hasRole('ADMIN'), async (req, res) => {
    try {
      const body = adminCreateUserSchema.parse(req.body);
      const data = await service.adminCreateUser(body);
      res.status(201).json(data);
    } catch (e: any) {
      if (e?.message === 'EMAIL_TAKEN') return res.status(409).json({ error: 'Email already in use' });
      if (e?.issues) return res.status(400).json({ error: 'ValidationError', details: e.issues });
      res.status(500).json({ error: 'InternalError' });
    }
  });

  router.get('/:id', isAuth, isSelfOrAdmin(), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const data = await service.getUserById(id);
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  });

  router.put('/:id', isAuth, isSelfOrAdmin(), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

      const body = adminUpdateUserSchema.parse(req.body);

      if (req.user!.role !== 'ADMIN' && body.role) {
        return res.status(403).json({ error: 'Forbidden: cannot change role' });
      }

      const sanitizedBody = { ...body, role: body.role === null ? undefined : body.role };
      const data = await service.adminUpdateUser(id, sanitizedBody);
      res.json(data);
    } catch (e: any) {
      if (e?.issues) return res.status(400).json({ error: 'ValidationError', details: e.issues });
      res.status(500).json({ error: 'InternalError' });
    }
  });

  router.delete('/:id', isAuth, hasRole('ADMIN'), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

      await service.adminDeleteUser(id);
      res.status(204).end();
    } catch {
      res.status(500).json({ error: 'InternalError' });
    }
  });

  return router;
}
