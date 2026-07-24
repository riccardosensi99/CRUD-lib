import { Router, type Request, type Response } from 'express';
import { isAuth, type AuthRequest } from '../../middleware/isAuth.js';
import { idempotent } from '../../middleware/idempotent.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { sendAppError } from '../../utils/errorHandler.js';
import type { IdempotencyStore } from '../../core/ports/idempotency.repo.js';
import type { RateLimiter } from '../../core/ports/rateLimiter.repo.js';
import {
  emailVerificationConfirmSchema,
  emailVerificationRequestSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerSchema,
} from './auth.schemas.js';
import { makeAuthService } from './auth.service.js';
import type { AuthServiceDeps } from './auth.types.js';

export type AuthRouterDeps = AuthServiceDeps & {
  /** Enables `Idempotency-Key` support on `POST /register` when provided. */
  idempotencyStore?: IdempotencyStore;
  /** Enables rate limiting on `POST /login` and `POST /register` when provided, keyed by IP + route. */
  rateLimiter?: RateLimiter;
};

/**
 * Builds the auth router: register, login, refresh, logout, password reset,
 * email verification, and `GET /me`. Password reset, email verification, and
 * OAuth linking are only active when their corresponding repo/callback deps
 * are provided; otherwise those routes respond with `NotConfiguredError`.
 */
export function createAuthRouter(deps: AuthRouterDeps) {
  const router = Router();
  const service = makeAuthService(deps);

  const registerMiddleware = [
    ...(deps.rateLimiter ? [rateLimit(deps.rateLimiter, { keyFn: (req) => `register:${req.ip}` })] : []),
    ...(deps.idempotencyStore ? [idempotent(deps.idempotencyStore)] : []),
  ];
  const loginMiddleware = deps.rateLimiter
    ? [rateLimit(deps.rateLimiter, { keyFn: (req) => `login:${req.ip}` })]
    : [];

  router.post('/register', ...registerMiddleware, async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await service.registerUser(data);
      return res.status(201).json(result);
    } catch (err) {
      return sendAppError(res, err);
    }
  });

  router.post('/login', ...loginMiddleware, async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await service.loginUser(data);
      return res.json(result);
    } catch (err) {
      return sendAppError(res, err);
    }
  });

  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (!refreshToken) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing refreshToken' } });

      const tokens = await service.refreshSession(refreshToken);
      return res.json(tokens);
    } catch {
      return sendAppError(res, new Error('INVALID_REFRESH_TOKEN'));
    }
  });

  router.post('/logout', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (!refreshToken) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing refreshToken' } });

      await service.revokeRefreshToken(refreshToken);
      return res.status(204).send();
    } catch {
      return sendAppError(res, new Error('INVALID_REFRESH_TOKEN'));
    }
  });

  router.post('/password-reset/request', async (req: Request, res: Response) => {
    try {
      const data = passwordResetRequestSchema.parse(req.body);
      await service.requestPasswordReset(data);
      return res.status(202).json({ ok: true });
    } catch (err) {
      return sendAppError(res, err);
    }
  });

  router.post('/password-reset/confirm', async (req: Request, res: Response) => {
    try {
      const data = passwordResetConfirmSchema.parse(req.body);
      await service.confirmPasswordReset(data);
      return res.json({ ok: true });
    } catch (err) {
      return sendAppError(res, err);
    }
  });

  router.post('/email-verification/request', async (req: Request, res: Response) => {
    try {
      const data = emailVerificationRequestSchema.parse(req.body);
      await service.requestEmailVerification(data);
      return res.status(202).json({ ok: true });
    } catch (err) {
      return sendAppError(res, err);
    }
  });

  router.post('/email-verification/confirm', async (req: Request, res: Response) => {
    try {
      const data = emailVerificationConfirmSchema.parse(req.body);
      const result = await service.confirmEmailVerification(data);
      return res.json(result);
    } catch (err) {
      return sendAppError(res, err);
    }
  });

  router.get('/me', isAuth, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const me = await service.getMe(userId);
    if (!me) return sendAppError(res, new Error('USER_NOT_FOUND'));
    return res.json(me);
  });

  return router;
}
