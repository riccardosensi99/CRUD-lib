import bcrypt from 'bcryptjs';
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  ListUsersQuery,
  Paginated,
  UpdateMeInput,
  UserListItem
} from './user.types.js';
import type { UserRepo } from '../../core/ports/user.repo.js';

const allowedFields = ['createdAt', 'updatedAt', 'email', 'name'] as const;

function parseSort(sort?: string): { sortField: typeof allowedFields[number]; sortDir: 'asc'|'desc' } {
  const [rawField, rawDir] = (sort ?? 'createdAt:desc').split(':');
  const sortField = (allowedFields as readonly string[]).includes(rawField || '')
    ? (rawField as typeof allowedFields[number])
    : 'createdAt';
  const sortDir: 'asc' | 'desc' = rawDir === 'asc' || rawDir === 'desc' ? rawDir : 'desc';
  return { sortField, sortDir };
}

export function makeUserService(deps: { userRepo: UserRepo }) {
  const { userRepo } = deps;

  return {
    async listUsers(q: ListUsersQuery): Promise<Paginated<UserListItem>> {
      const { page, pageSize, role, search } = q;
      const { sortField, sortDir } = parseSort(q.sort);
      const [total, items] = await Promise.all([
        userRepo.count({ role, search }),
        userRepo.findMany({ page, pageSize, role, search, sortField, sortDir }),
      ]);
      return { page, pageSize, total, totalPages: Math.ceil(total / pageSize), items };
    },

    getUserById(id: number | string) {
      return userRepo.findById(id);
    },

    updateMe(userId: number | string, data: UpdateMeInput) {
      return userRepo.updateMe(userId, data);
    },

    async adminCreateUser(input: AdminCreateUserInput) {
      const exists = await userRepo.findByEmail(input.email);
      if (exists) throw new Error('EMAIL_TAKEN');
      const rounds = Number(process.env.BCRYPT_SALT) || 10;
      const passwordHash = await bcrypt.hash(input.password, rounds);
      return userRepo.create({
        email: input.email,
        passwordHash,
        name: input.name ?? null,
        role: input.role ?? 'USER',
        bio: input.bio ?? null,
        avatarUrl: input.avatarUrl ?? null,
      });
    },

    adminUpdateUser(id: number | string, input: AdminUpdateUserInput) {
      return userRepo.update(id, input);
    },

    async adminDeleteUser(id: number | string) {
      await userRepo.delete(id);
      return { ok: true as const };
    },
  };
}
