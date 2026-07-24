import type { UserRepo } from '../core/ports/user.repo.js';
import type { AdminUpdateUserInput, Role, UserListItem } from '../modules/user/user.types.js';

type StoredUser = UserListItem & { passwordHash: string };

function toPublic(user: StoredUser): UserListItem {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function matchesFilters(user: StoredUser, role?: string, search?: string): boolean {
  if (role && user.role !== role) return false;
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
    async count({ role, search } = {}) {
      return [...users.values()].filter((u) => matchesFilters(u, role, search)).length;
    },

    async findMany({ page, pageSize, role, search, sortField, sortDir }) {
      const filtered = [...users.values()]
        .filter((u) => matchesFilters(u, role, search))
        .sort((a, b) => compare(a, b, sortField, sortDir));
      return filtered.slice((page - 1) * pageSize, page * pageSize).map(toPublic);
    },

    async findById(id) {
      const user = users.get(Number(id));
      return user ? toPublic(user) : null;
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
