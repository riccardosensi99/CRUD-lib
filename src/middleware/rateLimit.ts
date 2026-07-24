import type { Request, Response, NextFunction } from 'express';
import type { RateLimiter } from '../core/ports/rateLimiter.repo.js';

function defaultKey(req: Request): string {
  return req.ip ?? 'unknown';
}

/** Enforces a `RateLimiter` on a route, keyed by `keyFn` (defaults to `req.ip`). Responds `429` with `Retry-After` when exceeded. */
export function rateLimit(limiter: RateLimiter, options?: { keyFn?: (req: Request) => string; cost?: number }) {
  const keyFn = options?.keyFn ?? defaultKey;

  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await limiter.consume(keyFn(req), options?.cost);
    if (!result.allowed) {
      if (result.retryAfterMs !== undefined) {
        res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000).toString());
      }
      return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    }
    return next();
  };
}
