export type Role = 'USER' | 'ADMIN';

export type UserListItem = {
  id: number | string;
  email: string;
  name: string | null;
  role: Role;
  /** Optional tenant/organization scope for multi-tenant SaaS deployments. Absent in single-tenant apps. */
  tenantId?: string | number | null;
  emailVerifiedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  profile?: { bio: string | null; avatarUrl: string | null } | null;
};

export type ListUsersQuery = {
  page: number;
  pageSize: number;
  role?: Role;
  search?: string;
  tenantId?: string | number;
  sort?: `${'createdAt'|'updatedAt'|'email'|'name'}:${'asc'|'desc'}`;
};

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

export type UpdateMeInput = {
  name?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};

export type AdminCreateUserInput = {
  email: string;
  password: string;
  name?: string | null;
  role?: Role;
  bio?: string | null;
  avatarUrl?: string | null;
  tenantId?: string | number | null;
};

export type AdminUpdateUserInput = {
  name?: string | null;
  role?: Role;
  bio?: string | null;
  avatarUrl?: string | null;
};
