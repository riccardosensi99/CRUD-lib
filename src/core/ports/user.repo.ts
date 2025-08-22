import type { AdminCreateUserInput, AdminUpdateUserInput, ListUsersQuery, UserListItem } from "../../modules/user/user.types.js";

export interface UserRepo {
  count(where: { role?: string; search?: string } ): Promise<number>;
  findMany(params: {
    page: number;
    pageSize: number;
    role?: string;
    search?: string;
    sortField: 'createdAt'|'updatedAt'|'email'|'name';
    sortDir: 'asc'|'desc';
  }): Promise<UserListItem[]>;
  findById(id: number | string): Promise<UserListItem | null>;
  findByEmail(email: string): Promise<UserListItem & { passwordHash?: string } | null>;
  create(input: { email: string; passwordHash: string; name?: string | null; role?: string; bio?: string | null; avatarUrl?: string | null }): Promise<UserListItem>;
  update(id: number | string, input: AdminUpdateUserInput): Promise<UserListItem>;
  delete(id: number | string): Promise<void>;
  updateMe(userId: number | string, input: { name?: string | null; bio?: string | null; avatarUrl?: string | null }): Promise<UserListItem>;
}
