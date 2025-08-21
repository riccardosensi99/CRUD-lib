import { Router, type Request, type Response } from 'express';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { registerUser, loginUser } from './auth.service.js';
import { verifyToken, signAccessToken, signRefreshToken } from '../../utils/jwt.js';
import { isAuth, type AuthRequest } from '../../middleware/isAuth.js';
import { prisma } from '../../utils/prisma.js';

export function createAuthRouter() {
  const router = Router();

  router.post('/register', async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await registerUser(data);
      return res.status(201).json(result);
    } catch (err: any) {
      if (err?.message === 'EMAIL_TAKEN') return res.status(409).json({ error: 'Email già registrata' });
      if (err?.issues) return res.status(400).json({ error: 'ValidationError', details: err.issues });
      return res.status(500).json({ error: 'InternalError' });
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await loginUser(data);
      return res.json(result);
    } catch (err: any) {
      if (err?.message === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Credenziali non valide' });
      if (err?.issues) return res.status(400).json({ error: 'ValidationError', details: err.issues });
      return res.status(500).json({ error: 'InternalError' });
    }
  });

  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });
      const payload = verifyToken<{ sub: number; role: 'USER' | 'ADMIN'; typ?: string }>(refreshToken);
      if (payload.typ !== 'refresh') return res.status(401).json({ error: 'Invalid refresh token' });

      const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true } });
      if (!user) return res.status(401).json({ error: 'User not found' });

      const accessToken = signAccessToken({ sub: user.id, role: user.role as 'USER' | 'ADMIN' });
      const newRefreshToken = signRefreshToken({ sub: user.id, role: user.role as 'USER' | 'ADMIN' });
      return res.json({ accessToken, refreshToken: newRefreshToken });
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  });

  router.get('/me', isAuth, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, profile: { select: { bio: true, avatarUrl: true } } },
    });
    if (!me) return res.status(404).json({ error: 'User not found' });
    return res.json(me);
  });

  return router;
}
