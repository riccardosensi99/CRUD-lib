export type RateLimitResult = {
  allowed: boolean;
  remaining?: number;
  retryAfterMs?: number;
};

/**
 * Rate limiting port. `consume` should be atomic per `key` — implementations
 * backed by a shared store (Redis, a database) let multiple instances of a
 * service enforce one limit together.
 */
export interface RateLimiter {
  /** Attempts to spend `cost` (default 1) points for `key`. Returns whether the request is allowed. */
  consume(key: string, cost?: number): Promise<RateLimitResult>;
}
