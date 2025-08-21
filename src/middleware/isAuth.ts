import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

export type AuthRequest = Request & { user?: { id: number; role: 'USER' | 'ADMIN' } };

export function isAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.substring('Bearer '.length);
  try {
    const payload = verifyToken<{ sub: number; role: 'USER' | 'ADMIN' }>(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
