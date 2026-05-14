import { Response, NextFunction } from 'express';
import { AuthRequest } from './isAuth.js';

export function hasRole(...allowed: Array<'ADMIN' | 'USER'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export function isSelfOrAdmin() {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const uid = req.user?.id;
    const role = req.user?.role;
    if (role === 'ADMIN' || String(uid) === req.params.id) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}
