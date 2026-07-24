import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './isAuth.js';

/** Requires `req.user.tenantId` to be set (rejects tokens issued for a single-tenant/no-tenant context). Responds 403 otherwise. */
export function requireTenant() {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.tenantId === undefined) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden: no tenant on this token' } });
    }
    next();
  };
}

/**
 * Compares `req.user.tenantId` against a tenant id resolved from the request
 * (by default `req.params.tenantId`). Responds 403 on mismatch, or when
 * either side is missing. Pass a custom `getResourceTenantId` to resolve the
 * tenant id from elsewhere (e.g. a loaded resource) instead of a route param.
 */
export function isSameTenant(getResourceTenantId?: (req: AuthRequest) => string | number | undefined) {
  const resolve = getResourceTenantId ?? ((req: AuthRequest) => req.params.tenantId);
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userTenantId = req.user?.tenantId;
    const resourceTenantId = resolve(req);
    if (userTenantId === undefined || resourceTenantId === undefined || String(userTenantId) !== String(resourceTenantId)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden: tenant mismatch' } });
    }
    next();
  };
}
