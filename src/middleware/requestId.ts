import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export type RequestWithId = Request & { id: string };

/**
 * Reads a correlation id from the request (default `X-Request-Id`), or
 * generates one, attaches it as `req.id`, and reflects it back in the
 * response header — so a request can be traced across services that all
 * mount this middleware (gateway -> this service -> downstream calls).
 */
export function requestId(options?: { headerName?: string }) {
  const headerName = (options?.headerName ?? 'x-request-id').toLowerCase();

  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers[headerName];
    const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    (req as RequestWithId).id = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}
