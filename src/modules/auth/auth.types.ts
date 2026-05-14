import type { UserRepo } from '../../core/ports/user.repo.js';
import type { Role, UserListItem } from '../user/user.types.js';

export type AuthUserRepo = Pick<UserRepo, 'create' | 'findByEmail' | 'findById'> &
  Pick<Partial<UserRepo>, 'updatePassword' | 'markEmailVerified'>;

export type RefreshTokenRecord = {
  id: string;
  userId: number | string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date | string;
  revokedAt?: Date | string | null;
  replacedByTokenId?: string | null;
};

export type RefreshTokenRepo = {
  create(input: {
    id: string;
    userId: number | string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord | void>;
  findById(id: string): Promise<RefreshTokenRecord | null>;
  revoke(
    id: string,
    input?: { revokedAt?: Date; replacedByTokenId?: string | null; reason?: string },
  ): Promise<void>;
  revokeFamily?(
    familyId: string,
    input?: { revokedAt?: Date; reason?: string },
  ): Promise<void>;
};

export type PasswordResetTokenRecord = {
  id: string;
  userId: number | string;
  tokenHash: string;
  expiresAt: Date | string;
  usedAt?: Date | string | null;
  revokedAt?: Date | string | null;
};

export type PasswordResetTokenRepo = {
  create(input: {
    id: string;
    userId: number | string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord | void>;
  findById(id: string): Promise<PasswordResetTokenRecord | null>;
  markUsed(id: string, input?: { usedAt?: Date }): Promise<void>;
  revoke?(id: string, input?: { revokedAt?: Date; reason?: string }): Promise<void>;
};

export type EmailVerificationTokenRecord = {
  id: string;
  userId: number | string;
  tokenHash: string;
  expiresAt: Date | string;
  usedAt?: Date | string | null;
  revokedAt?: Date | string | null;
};

export type EmailVerificationTokenRepo = {
  create(input: {
    id: string;
    userId: number | string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationTokenRecord | void>;
  findById(id: string): Promise<EmailVerificationTokenRecord | null>;
  markUsed(id: string, input?: { usedAt?: Date }): Promise<void>;
  revoke?(id: string, input?: { revokedAt?: Date; reason?: string }): Promise<void>;
};

export type OAuthProviderProfile = {
  provider: string;
  providerAccountId: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  avatarUrl?: string | null;
};

export type OAuthAccount = {
  provider: string;
  providerAccountId: string;
  userId: number | string;
  email?: string | null;
};

export type OAuthAccountRepo = {
  findByProviderAccount(provider: string, providerAccountId: string): Promise<OAuthAccount | null>;
  findByUserAndProvider?(userId: number | string, provider: string): Promise<OAuthAccount | null>;
  create(input: OAuthAccount): Promise<OAuthAccount | void>;
};

export type AuthServiceDeps = {
  userRepo: AuthUserRepo;
  passwordHashRounds?: number;
  defaultRegisterRole?: Role;
  refreshTokenRepo?: RefreshTokenRepo;
  refreshTokenTtlMs?: number;
  passwordResetTokenRepo?: PasswordResetTokenRepo;
  passwordResetTtlMs?: number;
  sendPasswordReset?: (input: { user: AuthUser; token: string; expiresAt: Date }) => Promise<void> | void;
  emailVerificationTokenRepo?: EmailVerificationTokenRepo;
  emailVerificationTtlMs?: number;
  sendEmailVerification?: (input: { user: AuthUser; token: string; expiresAt: Date }) => Promise<void> | void;
  oauthAccountRepo?: OAuthAccountRepo;
  linkOAuthByVerifiedEmail?: boolean;
  tokenHashSecret?: string;
  idFactory?: () => string;
  now?: () => Date;
};

export type AuthUser = UserListItem;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResult = AuthTokens & {
  user: AuthUser;
};

export type PasswordResetRequestInput = {
  email: string;
};

export type PasswordResetConfirmInput = {
  token: string;
  password: string;
};

export type EmailVerificationRequestInput = {
  email: string;
};

export type EmailVerificationConfirmInput = {
  token: string;
};
