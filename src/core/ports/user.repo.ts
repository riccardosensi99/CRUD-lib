import type { AdminCreateUserInput, AdminUpdateUserInput, ListUsersQuery, UserListItem } from "../../modules/user/user.types.js";

/**
 * Storage port implemented by every adapter (Prisma, in-memory, or custom).
 * `updatePassword` and `markEmailVerified` are optional; omitting them
 * disables password reset and email verification respectively.
 */
export interface UserRepo {
  /** Counts users matching the given filters, for pagination totals. */
  count(where: { role?: string; search?: string; tenantId?: string | number } ): Promise<number>;
  /** Returns one page of users, sorted per `sortField`/`sortDir`. */
  findMany(params: {
    page: number;
    pageSize: number;
    role?: string;
    search?: string;
    tenantId?: string | number;
    sortField: 'createdAt'|'updatedAt'|'email'|'name';
    sortDir: 'asc'|'desc';
  }): Promise<UserListItem[]>;
  findById(id: number | string): Promise<UserListItem | null>;
  /** Must include `passwordHash` so the auth service can verify credentials. */
  findByEmail(email: string): Promise<UserListItem & { passwordHash?: string } | null>;
  create(input: { email: string; passwordHash: string; name?: string | null; role?: string; bio?: string | null; avatarUrl?: string | null; tenantId?: string | number | null }): Promise<UserListItem>;
  update(id: number | string, input: AdminUpdateUserInput): Promise<UserListItem>;
  delete(id: number | string): Promise<void>;
  /** Self-service update, restricted to the profile fields a user may change on their own account. */
  updateMe(userId: number | string, input: { name?: string | null; bio?: string | null; avatarUrl?: string | null }): Promise<UserListItem>;
  /** Required for the password reset flow; omit to leave it unsupported. */
  updatePassword?(id: number | string, passwordHash: string): Promise<UserListItem | void>;
  /** Required for the email verification flow; omit to leave it unsupported. */
  markEmailVerified?(id: number | string, verifiedAt?: Date): Promise<UserListItem | void>;
}
