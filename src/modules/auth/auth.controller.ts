import { Router, type Request, type Response } from 'express';
import { isAuth, type AuthRequest } from '../../middleware/isAuth.js';
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

export function createAuthRouter(deps: AuthServiceDeps) {
  const router = Router();
  const service = makeAuthService(deps);

  router.post('/register', async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await service.registerUser(data);
      return res.status(201).json(result);
    } catch (err: any) {
      if (err?.message === 'EMAIL_TAKEN') return res.status(409).json({ error: 'Email already registered' });
      if (err?.issues) return res.status(400).json({ error: 'ValidationError', details: err.issues });
      return res.status(500).json({ error: 'InternalError' });
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await service.loginUser(data);
      return res.json(result);
    } catch (err: any) {
      if (err?.message === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Invalid credentials' });
      if (err?.issues) return res.status(400).json({ error: 'ValidationError', details: err.issues });
      return res.status(500).json({ error: 'InternalError' });
    }
  });

  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });

      const tokens = await service.refreshSession(refreshToken);
      return res.json(tokens);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  });

  router.post('/logout', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });

      await service.revokeRefreshToken(refreshToken);
      return res.status(204).send();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  });

  router.post('/password-reset/request', async (req: Request, res: Response) => {
    try {
      const data = passwordResetRequestSchema.parse(req.body);
      await service.requestPasswordReset(data);
      return res.status(202).json({ ok: true });
    } catch (err: any) {
      if (err?.message === 'PASSWORD_RESET_UNSUPPORTED') return res.status(501).json({ error: 'Password reset is not configured' });
      if (err?.issues) return res.status(400).json({ error: 'ValidationError', details: err.issues });
      return res.status(500).json({ error: 'InternalError' });
    }
  });

  router.post('/password-reset/confirm', async (req: Request, res: Response) => {
    try {
      const data = passwordResetConfirmSchema.parse(req.body);
      await service.confirmPasswordReset(data);
      return res.json({ ok: true });
    } catch (err: any) {
      if (err?.message === 'PASSWORD_RESET_UNSUPPORTED') return res.status(501).json({ error: 'Password reset is not configured' });
      if (err?.message === 'INVALID_PASSWORD_RESET_TOKEN') return res.status(400).json({ error: 'Invalid or expired password reset token' });
      if (err?.issues) return res.status(400).json({ error: 'ValidationError', details: err.issues });
      return res.status(500).json({ error: 'InternalError' });
    }
  });

  router.post('/email-verification/request', async (req: Request, res: Response) => {
    try {
      const data = emailVerificationRequestSchema.parse(req.body);
      await service.requestEmailVerification(data);
      return res.status(202).json({ ok: true });
    } catch (err: any) {
      if (err?.message === 'EMAIL_VERIFICATION_UNSUPPORTED') return res.status(501).json({ error: 'Email verification is not configured' });
      if (err?.issues) return res.status(400).json({ error: 'ValidationError', details: err.issues });
      return res.status(500).json({ error: 'InternalError' });
    }
  });

  router.post('/email-verification/confirm', async (req: Request, res: Response) => {
    try {
      const data = emailVerificationConfirmSchema.parse(req.body);
      const result = await service.confirmEmailVerification(data);
      return res.json(result);
    } catch (err: any) {
      if (err?.message === 'EMAIL_VERIFICATION_UNSUPPORTED') return res.status(501).json({ error: 'Email verification is not configured' });
      if (err?.message === 'INVALID_EMAIL_VERIFICATION_TOKEN') return res.status(400).json({ error: 'Invalid or expired email verification token' });
      if (err?.issues) return res.status(400).json({ error: 'ValidationError', details: err.issues });
      return res.status(500).json({ error: 'InternalError' });
    }
  });

  router.get('/me', isAuth, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const me = await service.getMe(userId);
    if (!me) return res.status(404).json({ error: 'User not found' });
    return res.json(me);
  });

  return router;
}
