import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { ApiKeyRecord, ApiKeyRepo } from '../core/ports/apiKey.repo.js';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generates a new API key, stores its hash via `apiKeyRepo.create`, and
 * returns the plaintext key. The plaintext is only ever available here —
 * only its hash is persisted, so store this return value immediately.
 */
export async function issueApiKey(
  apiKeyRepo: ApiKeyRepo,
  input: { name?: string | null; scopes?: string[]; tenantId?: string | number | null } = {},
): Promise<{ id: string; key: string }> {
  const id = randomUUID();
  const secret = randomBytes(32).toString('base64url');
  const key = `${id}.${secret}`;

  await apiKeyRepo.create({
    id,
    name: input.name ?? null,
    keyHash: hashKey(key),
    scopes: input.scopes ?? [],
    tenantId: input.tenantId ?? null,
  });

  return { id, key };
}

/** Verifies a plaintext API key against a stored record's hash using a constant-time comparison. */
export function verifyApiKey(key: string, record: Pick<ApiKeyRecord, 'keyHash'>): boolean {
  const expected = Buffer.from(record.keyHash);
  const actual = Buffer.from(hashKey(key));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
