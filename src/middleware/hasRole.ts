import { Response, NextFunction } from 'express';
import { AuthRequest } from './isAuth.js';

/** Requires `req.user.role` (set by `isAuth`) to be one of `allowed`; responds 403 otherwise. */
export function hasRole(...allowed: Array<'ADMIN' | 'USER'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

/** Allows the request through if `req.user` is an admin or owns the `:id` route param; responds 403 otherwise. */
export function isSelfOrAdmin() {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const uid = req.user?.id;
    const role = req.user?.role;
    if (role === 'ADMIN' || String(uid) === req.params.id) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}
