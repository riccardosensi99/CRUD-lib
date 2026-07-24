import type { Request, Response, NextFunction } from 'express';
import type { IdempotencyStore } from '../core/ports/idempotency.repo.js';

/**
 * Replays a stored response for repeated requests carrying the same
 * `Idempotency-Key` header, instead of re-running the handler. Requests
 * without the header pass through unaffected — idempotency is opt-in per
 * call, not enforced on every request.
 */
export function idempotent(store: IdempotencyStore, options?: { headerName?: string; ttlMs?: number }) {
  const headerName = (options?.headerName ?? 'idempotency-key').toLowerCase();
  const ttlMs = options?.ttlMs;

  return async (req: Request, res: Response, next: NextFunction) => {
    const raw = req.headers[headerName];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key) return next();

    const existing = await store.get(key);
    if (existing) {
      res.setHeader('Idempotent-Replay', 'true');
      return res.status(existing.status).json(existing.body);
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      store.set(key, { status: res.statusCode, body }, ttlMs).catch((err) => {
        console.error('[my-crud-lib] failed to persist idempotency record:', err);
      });
      return originalJson(body);
    }) as Response['json'];

    return next();
  };
}
