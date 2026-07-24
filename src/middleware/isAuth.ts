import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

export type AuthRequest = Request & {
  user?: { id: number | string; role: 'USER' | 'ADMIN'; tenantId?: string | number };
};

/** Verifies the `Authorization: Bearer <token>` header and attaches `req.user`. Responds 401 if missing/invalid. */
export function isAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.substring('Bearer '.length);
  try {
    const payload = verifyToken<{ sub: number | string; role: 'USER' | 'ADMIN'; tenantId?: string | number }>(token);
    req.user = { id: payload.sub, role: payload.role, ...(payload.tenantId !== undefined ? { tenantId: payload.tenantId } : {}) };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
