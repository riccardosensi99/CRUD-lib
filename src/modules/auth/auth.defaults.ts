import type { Role } from '../user/user.types.js';

export const DEFAULT_REGISTER_ROLE: Role = 'USER';

export function resolveRegisterRole(role?: Role): Role {
  return role ?? DEFAULT_REGISTER_ROLE;
}
