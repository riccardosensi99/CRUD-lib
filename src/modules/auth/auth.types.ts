import type { UserRepo } from '../../core/ports/user.repo.js';
import type { Role, UserListItem } from '../user/user.types.js';

export type AuthUserRepo = Pick<UserRepo, 'create' | 'findByEmail' | 'findById'>;

export type AuthServiceDeps = {
  userRepo: AuthUserRepo;
  passwordHashRounds?: number;
  defaultRegisterRole?: Role;
};

export type AuthUser = UserListItem;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResult = AuthTokens & {
  user: AuthUser;
};
