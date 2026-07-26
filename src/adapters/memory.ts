import type { UserRepo } from '../core/ports/user.repo.js';
import type { ApiKeyRecord, ApiKeyRepo } from '../core/ports/apiKey.repo.js';
import type { IdempotencyRecord, IdempotencyStore } from '../core/ports/idempotency.repo.js';
import type { RateLimiter } from '../core/ports/rateLimiter.repo.js';
import type { AdminUpdateUserInput, Role, UserListItem } from '../modules/user/user.types.js';

type StoredUser = UserListItem & { passwordHash: string };

function toPublic(user: StoredUser): UserListItem {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function matchesFilters(user: StoredUser, role?: string, search?: string, tenantId?: string | number): boolean {
  if (role && user.role !== role) return false;
  if (tenantId !== undefined && String(user.tenantId ?? '') !== String(tenantId)) return false;
  if (search?.trim()) {
    const needle = search.trim().toLowerCase();
    const haystack = `${user.email} ${user.name ?? ''}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function compare(a: StoredUser, b: StoredUser, field: 'createdAt' | 'updatedAt' | 'email' | 'name', dir: 'asc' | 'desc'): number {
  const av = field === 'name' ? a.name ?? '' : a[field];
  const bv = field === 'name' ? b.name ?? '' : b[field];
  const result = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
  return dir === 'asc' ? result : -result;
}

/**
 * In-memory `UserRepo` implementation with no external dependencies.
 * Useful for demos, prototyping, and tests. State is lost on process exit
 * and is not shared across instances — do not use in production.
 */
export function makeMemoryUserRepo(): UserRepo {
  const users = new Map<number, StoredUser>();
  let nextId = 1;

  return {
    async count({ role, search, tenantId } = {}) {
      return [...users.values()].filter((u) => matchesFilters(u, role, search, tenantId)).length;
    },

    async findMany({ page, pageSize, role, search, tenantId, sortField, sortDir }) {
      const filtered = [...users.values()]
        .filter((u) => matchesFilters(u, role, search, tenantId))
        .sort((a, b) => compare(a, b, sortField, sortDir));
      return filtered.slice((page - 1) * pageSize, page * pageSize).map(toPublic);
    },

    async findById(id) {
      const user = users.get(Number(id));
      return user ? toPublic(user) : null;
    },

    async findManyByIds(ids) {
      const wanted = new Set(ids.map((id) => Number(id)));
      return [...users.values()].filter((u) => wanted.has(Number(u.id))).map(toPublic);
    },

    async findByEmail(email) {
      const user = [...users.values()].find((u) => u.email === email);
      return user ? { ...toPublic(user), passwordHash: user.passwordHash } : null;
    },

    async create(input) {
      const now = new Date().toISOString();
      const user: StoredUser = {
        id: nextId++,
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name ?? null,
        role: (input.role as Role) === 'ADMIN' ? 'ADMIN' : 'USER',
        tenantId: input.tenantId ?? null,
        emailVerifiedAt: null,
        createdAt: now,
        updatedAt: now,
        profile: { bio: input.bio ?? null, avatarUrl: input.avatarUrl ?? null },
      };
      users.set(Number(user.id), user);
      return toPublic(user);
    },

    async update(id, input: AdminUpdateUserInput) {
      const user = users.get(Number(id));
      if (!user) throw new Error('USER_NOT_FOUND');
      const updated: StoredUser = {
        ...user,
        name: input.name ?? user.name,
        role: input.role ?? user.role,
        updatedAt: new Date().toISOString(),
        profile: {
          bio: input.bio ?? user.profile?.bio ?? null,
          avatarUrl: input.avatarUrl ?? user.profile?.avatarUrl ?? null,
        },
      };
      users.set(Number(id), updated);
      return toPublic(updated);
    },

    async delete(id) {
      users.delete(Number(id));
    },

    async updateMe(userId, input) {
      const user = users.get(Number(userId));
      if (!user) throw new Error('USER_NOT_FOUND');
      const updated: StoredUser = {
        ...user,
        name: input.name ?? user.name,
        updatedAt: new Date().toISOString(),
        profile: {
          bio: input.bio ?? user.profile?.bio ?? null,
          avatarUrl: input.avatarUrl ?? user.profile?.avatarUrl ?? null,
        },
      };
      users.set(Number(userId), updated);
      return toPublic(updated);
    },

    async updatePassword(id, passwordHash) {
      const user = users.get(Number(id));
      if (!user) throw new Error('USER_NOT_FOUND');
      const updated: StoredUser = { ...user, passwordHash, updatedAt: new Date().toISOString() };
      users.set(Number(id), updated);
      return toPublic(updated);
    },

    async markEmailVerified(id, verifiedAt = new Date()) {
      const user = users.get(Number(id));
      if (!user) throw new Error('USER_NOT_FOUND');
      const updated: StoredUser = { ...user, emailVerifiedAt: verifiedAt, updatedAt: new Date().toISOString() };
      users.set(Number(id), updated);
      return toPublic(updated);
    },
  };
}

/** In-memory `ApiKeyRepo` implementation. Useful for demos, prototyping, and tests. */
export function makeMemoryApiKeyRepo(): ApiKeyRepo {
  const keys = new Map<string, ApiKeyRecord>();

  return {
    async findById(id) {
      return keys.get(id) ?? null;
    },

    async create(input) {
      const record: ApiKeyRecord = {
        id: input.id,
        name: input.name ?? null,
        keyHash: input.keyHash,
        scopes: input.scopes ?? [],
        tenantId: input.tenantId ?? null,
        revokedAt: null,
        createdAt: new Date().toISOString(),
      };
      keys.set(record.id, record);
      return record;
    },

    async revoke(id, input = {}) {
      const record = keys.get(id);
      if (!record) return;
      keys.set(id, { ...record, revokedAt: input.revokedAt ?? new Date() });
    },
  };
}

/** In-memory `IdempotencyStore` implementation. Useful for demos, prototyping, and tests. */
export function makeMemoryIdempotencyStore(): IdempotencyStore {
  const records = new Map<string, IdempotencyRecord & { expiresAt: number | null }>();

  return {
    async get(key) {
      const record = records.get(key);
      if (!record) return null;
      if (record.expiresAt !== null && record.expiresAt <= Date.now()) {
        records.delete(key);
        return null;
      }
      return { status: record.status, body: record.body };
    },

    async set(key, record, ttlMs) {
      records.set(key, {
        ...record,
        expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : null,
      });
    },
  };
}

/**
 * In-memory fixed-window `RateLimiter`: allows up to `points` calls per `key`
 * within each `durationMs` window. Per-process only — use a shared store
 * (Redis, a database) to enforce one limit across multiple instances.
 */
export function makeMemoryRateLimiter(options: { points: number; durationMs: number }): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    async consume(key, cost = 1) {
      const now = Date.now();
      const window = windows.get(key);

      if (!window || window.resetAt <= now) {
        const resetAt = now + options.durationMs;
        windows.set(key, { count: cost, resetAt });
        return { allowed: cost <= options.points, remaining: Math.max(options.points - cost, 0) };
      }

      if (window.count + cost > options.points) {
        return { allowed: false, remaining: Math.max(options.points - window.count, 0), retryAfterMs: window.resetAt - now };
      }

      window.count += cost;
      return { allowed: true, remaining: options.points - window.count };
    },
  };
}
