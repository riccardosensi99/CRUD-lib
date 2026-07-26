export type IdempotencyRecord = {
  status: number;
  body: unknown;
};

/**
 * Storage port for idempotency keys, used by the `idempotent` middleware to
 * replay a stored response instead of re-running a handler for a repeated
 * request (retries, concurrent duplicate calls from other services).
 */
export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null>;
  set(key: string, record: IdempotencyRecord, ttlMs?: number): Promise<void>;
}
