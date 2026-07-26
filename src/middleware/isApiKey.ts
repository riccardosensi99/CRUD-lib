import type { Request, Response, NextFunction } from 'express';
import type { ApiKeyRepo } from '../core/ports/apiKey.repo.js';
import { verifyApiKey } from '../utils/apiKey.js';
import { sendAppError } from '../utils/errorHandler.js';

export type ApiKeyRequest = Request & {
  apiKey?: { id: string; name?: string | null; scopes: string[]; tenantId?: string | number };
};

function extractKey(req: Request): string | null {
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey) return headerKey;

  const auth = req.headers.authorization;
  if (auth?.startsWith('ApiKey ')) return auth.slice('ApiKey '.length);

  return null;
}

/**
 * Authenticates machine-to-machine requests via an API key, read from the
 * `X-API-Key` header or `Authorization: ApiKey <key>`. Attaches `req.apiKey`
 * on success. Pass `requiredScopes` to also enforce scope membership.
 */
export function isApiKey(apiKeyRepo: ApiKeyRepo, options?: { requiredScopes?: string[] }) {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    const key = extractKey(req);
    if (!key) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing API key' } });
    }

    const [id] = key.split('.');
    let record;
    try {
      record = id ? await apiKeyRepo.findById(id) : null;
    } catch (err) {
      return sendAppError(res, err);
    }

    if (!record || record.revokedAt || !verifyApiKey(key, record)) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked API key' } });
    }

    const scopes = record.scopes ?? [];
    if (options?.requiredScopes?.length && options.requiredScopes.some((scope) => !scopes.includes(scope))) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Missing required API key scope' } });
    }

    req.apiKey = { id: record.id, name: record.name, scopes, tenantId: record.tenantId ?? undefined };
    return next();
  };
}
