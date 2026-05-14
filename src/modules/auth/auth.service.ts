import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { signAccessToken, signRefreshToken, verifyToken } from '../../utils/jwt.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { resolveRegisterRole } from './auth.defaults.js';
import type {
  AuthResult,
  AuthServiceDeps,
  AuthTokens,
  AuthUser,
  EmailVerificationConfirmInput,
  EmailVerificationRequestInput,
  OAuthProviderProfile,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from './auth.types.js';
import type { Role } from '../user/user.types.js';

type UserWithMaybePasswordHash = AuthUser & { passwordHash?: string };
type RefreshPayload = { sub: number | string; role: Role; typ?: string; jti?: string; fam?: string };

const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const DEFAULT_EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function resolvePasswordHashRounds(configured?: number): number {
  const rounds = configured ?? Number(process.env.BCRYPT_SALT);
  return Number.isInteger(rounds) && rounds > 0 ? rounds : 10;
}

function toAuthUser(user: UserWithMaybePasswordHash): AuthUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function getNow(deps: AuthServiceDeps): Date {
  return deps.now?.() ?? new Date();
}

function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

function isExpired(value: Date | string, now: Date): boolean {
  return new Date(value).getTime() <= now.getTime();
}

function createId(deps: AuthServiceDeps): string {
  return deps.idFactory?.() ?? randomUUID();
}

function createSecret(): string {
  return randomBytes(32).toString('base64url');
}

function createOpaqueToken(deps: AuthServiceDeps): { id: string; token: string } {
  const id = createId(deps);
  return { id, token: `${id}.${createSecret()}` };
}

function parseOpaqueToken(token: string): { id: string } | null {
  const [id, secret, ...rest] = token.split('.');
  if (!id || !secret || rest.length > 0) return null;
  return { id };
}

function hashToken(token: string, secret?: string): string {
  if (secret) return createHmac('sha256', secret).update(token).digest('hex');
  return createHash('sha256').update(token).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function issueTokens(
  user: Pick<AuthUser, 'id' | 'role'>,
  deps: AuthServiceDeps,
  familyId?: string,
): Promise<AuthTokens & { refreshTokenId?: string; familyId?: string }> {
  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);

  if (!deps.refreshTokenRepo) {
    return {
      accessToken,
      refreshToken: signRefreshToken(payload),
    };
  }

  const refreshTokenId = createId(deps);
  const resolvedFamilyId = familyId ?? createId(deps);
  const refreshToken = signRefreshToken({ ...payload, jti: refreshTokenId, fam: resolvedFamilyId });
  const now = getNow(deps);
  const expiresAt = addMs(now, deps.refreshTokenTtlMs ?? DEFAULT_REFRESH_TOKEN_TTL_MS);

  await deps.refreshTokenRepo.create({
    id: refreshTokenId,
    userId: user.id,
    tokenHash: hashToken(refreshToken, deps.tokenHashSecret),
    familyId: resolvedFamilyId,
    expiresAt,
  });

  return { accessToken, refreshToken, refreshTokenId, familyId: resolvedFamilyId };
}

export function makeAuthService(deps: AuthServiceDeps) {
  const { userRepo } = deps;

  async function requestPasswordReset(params: PasswordResetRequestInput): Promise<{ ok: true }> {
    if (!deps.passwordResetTokenRepo || !deps.sendPasswordReset) {
      throw new Error('PASSWORD_RESET_UNSUPPORTED');
    }

    const user = await userRepo.findByEmail(params.email);
    if (!user) return { ok: true };

    const now = getNow(deps);
    const expiresAt = addMs(now, deps.passwordResetTtlMs ?? DEFAULT_PASSWORD_RESET_TTL_MS);
    const { id, token } = createOpaqueToken(deps);

    await deps.passwordResetTokenRepo.create({
      id,
      userId: user.id,
      tokenHash: hashToken(token, deps.tokenHashSecret),
      expiresAt,
    });
    await deps.sendPasswordReset({ user: toAuthUser(user), token, expiresAt });

    return { ok: true };
  }

  async function confirmPasswordReset(params: PasswordResetConfirmInput): Promise<{ ok: true }> {
    if (!deps.passwordResetTokenRepo || !userRepo.updatePassword) {
      throw new Error('PASSWORD_RESET_UNSUPPORTED');
    }

    const parsed = parseOpaqueToken(params.token);
    if (!parsed) throw new Error('INVALID_PASSWORD_RESET_TOKEN');

    const record = await deps.passwordResetTokenRepo.findById(parsed.id);
    const now = getNow(deps);
    if (
      !record ||
      record.usedAt ||
      record.revokedAt ||
      isExpired(record.expiresAt, now) ||
      !safeEqual(record.tokenHash, hashToken(params.token, deps.tokenHashSecret))
    ) {
      throw new Error('INVALID_PASSWORD_RESET_TOKEN');
    }

    const passwordHash = await bcrypt.hash(params.password, resolvePasswordHashRounds(deps.passwordHashRounds));
    await userRepo.updatePassword(record.userId, passwordHash);
    await deps.passwordResetTokenRepo.markUsed(record.id, { usedAt: now });

    return { ok: true };
  }

  async function requestEmailVerification(params: EmailVerificationRequestInput): Promise<{ ok: true }> {
    if (!deps.emailVerificationTokenRepo || !deps.sendEmailVerification) {
      throw new Error('EMAIL_VERIFICATION_UNSUPPORTED');
    }

    const user = await userRepo.findByEmail(params.email);
    if (!user || user.emailVerifiedAt) return { ok: true };

    const now = getNow(deps);
    const expiresAt = addMs(now, deps.emailVerificationTtlMs ?? DEFAULT_EMAIL_VERIFICATION_TTL_MS);
    const { id, token } = createOpaqueToken(deps);

    await deps.emailVerificationTokenRepo.create({
      id,
      userId: user.id,
      tokenHash: hashToken(token, deps.tokenHashSecret),
      expiresAt,
    });
    await deps.sendEmailVerification({ user: toAuthUser(user), token, expiresAt });

    return { ok: true };
  }

  async function confirmEmailVerification(params: EmailVerificationConfirmInput): Promise<{ ok: true; user: AuthUser }> {
    if (!deps.emailVerificationTokenRepo || !userRepo.markEmailVerified) {
      throw new Error('EMAIL_VERIFICATION_UNSUPPORTED');
    }

    const parsed = parseOpaqueToken(params.token);
    if (!parsed) throw new Error('INVALID_EMAIL_VERIFICATION_TOKEN');

    const record = await deps.emailVerificationTokenRepo.findById(parsed.id);
    const now = getNow(deps);
    if (
      !record ||
      record.usedAt ||
      record.revokedAt ||
      isExpired(record.expiresAt, now) ||
      !safeEqual(record.tokenHash, hashToken(params.token, deps.tokenHashSecret))
    ) {
      throw new Error('INVALID_EMAIL_VERIFICATION_TOKEN');
    }

    const updated = await userRepo.markEmailVerified(record.userId, now);
    const user = updated ?? await userRepo.findById(record.userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    await deps.emailVerificationTokenRepo.markUsed(record.id, { usedAt: now });

    return { ok: true, user: toAuthUser(user as UserWithMaybePasswordHash) };
  }

  async function signInWithOAuthProfile(profile: OAuthProviderProfile): Promise<AuthResult> {
    if (!deps.oauthAccountRepo) throw new Error('OAUTH_UNSUPPORTED');
    if (!profile.provider || !profile.providerAccountId) throw new Error('INVALID_OAUTH_PROFILE');

    const linkedAccount = await deps.oauthAccountRepo.findByProviderAccount(profile.provider, profile.providerAccountId);
    if (linkedAccount) {
      const existingUser = await userRepo.findById(linkedAccount.userId);
      if (!existingUser) throw new Error('USER_NOT_FOUND');
      return { user: existingUser, ...(await issueTokens(existingUser, deps)) };
    }

    let user: UserWithMaybePasswordHash | null = null;
    const canLinkByEmail = deps.linkOAuthByVerifiedEmail !== false && profile.email && profile.emailVerified === true;

    if (canLinkByEmail && profile.email) {
      user = await userRepo.findByEmail(profile.email);
    }

    if (!user) {
      if (!profile.email) throw new Error('OAUTH_EMAIL_REQUIRED');

      const passwordHash = await bcrypt.hash(createSecret(), resolvePasswordHashRounds(deps.passwordHashRounds));
      user = await userRepo.create({
        email: profile.email,
        passwordHash,
        name: profile.name ?? null,
        role: resolveRegisterRole(deps.defaultRegisterRole),
      }) as UserWithMaybePasswordHash;
    }

    await deps.oauthAccountRepo.create({
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      userId: user.id,
      email: profile.email ?? null,
    });

    const authUser = toAuthUser(user);
    return { user: authUser, ...(await issueTokens(authUser, deps)) };
  }

  return {
    async registerUser(params: RegisterInput): Promise<AuthResult> {
      const exists = await userRepo.findByEmail(params.email);
      if (exists) throw new Error('EMAIL_TAKEN');

      const passwordHash = await bcrypt.hash(params.password, resolvePasswordHashRounds(deps.passwordHashRounds));
      const role = resolveRegisterRole(deps.defaultRegisterRole);
      const user = await userRepo.create({
        email: params.email,
        passwordHash,
        name: params.name ?? null,
        role,
      });

      const authUser = toAuthUser(user);
      return { user: authUser, ...(await issueTokens(authUser, deps)) };
    },

    async loginUser(params: LoginInput): Promise<AuthResult> {
      const user = await userRepo.findByEmail(params.email);
      if (!user?.passwordHash) throw new Error('INVALID_CREDENTIALS');

      const ok = await bcrypt.compare(params.password, user.passwordHash);
      if (!ok) throw new Error('INVALID_CREDENTIALS');

      const authUser = toAuthUser(user);
      return { user: authUser, ...(await issueTokens(authUser, deps)) };
    },

    async refreshSession(refreshToken: string): Promise<AuthTokens> {
      const payload = verifyToken<RefreshPayload>(refreshToken);
      if (payload.typ !== 'refresh') throw new Error('INVALID_REFRESH_TOKEN');

      const user = await userRepo.findById(payload.sub);
      if (!user) throw new Error('USER_NOT_FOUND');

      if (!deps.refreshTokenRepo) return issueTokens(user, deps);

      if (!payload.jti || !payload.fam) throw new Error('INVALID_REFRESH_TOKEN');

      const record = await deps.refreshTokenRepo.findById(payload.jti);
      const now = getNow(deps);
      if (!record || record.userId.toString() !== payload.sub.toString() || record.familyId !== payload.fam) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      if (record.revokedAt) {
        await deps.refreshTokenRepo.revokeFamily?.(record.familyId, { revokedAt: now, reason: 'refresh-token-replay' });
        throw new Error('REFRESH_TOKEN_REPLAYED');
      }

      if (isExpired(record.expiresAt, now) || !safeEqual(record.tokenHash, hashToken(refreshToken, deps.tokenHashSecret))) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }

      const nextTokens = await issueTokens(user, deps, record.familyId);
      await deps.refreshTokenRepo.revoke(record.id, {
        revokedAt: now,
        replacedByTokenId: nextTokens.refreshTokenId ?? null,
        reason: 'rotated',
      });

      return { accessToken: nextTokens.accessToken, refreshToken: nextTokens.refreshToken };
    },

    async revokeRefreshToken(refreshToken: string): Promise<{ ok: true }> {
      const payload = verifyToken<RefreshPayload>(refreshToken);
      if (payload.typ !== 'refresh') throw new Error('INVALID_REFRESH_TOKEN');

      if (deps.refreshTokenRepo && payload.jti) {
        await deps.refreshTokenRepo.revoke(payload.jti, { revokedAt: getNow(deps), reason: 'revoked' });
      }

      return { ok: true };
    },

    getMe(userId: number | string): Promise<AuthUser | null> {
      return userRepo.findById(userId);
    },

    requestPasswordReset,
    confirmPasswordReset,
    requestEmailVerification,
    confirmEmailVerification,
    signInWithOAuthProfile,
    loginWithOAuthProfile: signInWithOAuthProfile,
  };
}
