import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken, verifyToken } from '../../utils/jwt.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { resolveRegisterRole } from './auth.defaults.js';
import type { AuthResult, AuthServiceDeps, AuthTokens, AuthUser } from './auth.types.js';
import type { Role } from '../user/user.types.js';

type UserWithMaybePasswordHash = AuthUser & { passwordHash?: string };

function resolvePasswordHashRounds(configured?: number): number {
  const rounds = configured ?? Number(process.env.BCRYPT_SALT);
  return Number.isInteger(rounds) && rounds > 0 ? rounds : 10;
}

function toAuthUser(user: UserWithMaybePasswordHash): AuthUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function issueTokens(user: Pick<AuthUser, 'id' | 'role'>): AuthTokens {
  const payload = { sub: user.id, role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function makeAuthService(deps: AuthServiceDeps) {
  const { userRepo } = deps;

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
      return { user: authUser, ...issueTokens(authUser) };
    },

    async loginUser(params: LoginInput): Promise<AuthResult> {
      const user = await userRepo.findByEmail(params.email);
      if (!user?.passwordHash) throw new Error('INVALID_CREDENTIALS');

      const ok = await bcrypt.compare(params.password, user.passwordHash);
      if (!ok) throw new Error('INVALID_CREDENTIALS');

      const authUser = toAuthUser(user);
      return { user: authUser, ...issueTokens(authUser) };
    },

    async refreshSession(refreshToken: string): Promise<AuthTokens> {
      const payload = verifyToken<{ sub: number | string; role: Role; typ?: string }>(refreshToken);
      if (payload.typ !== 'refresh') throw new Error('INVALID_REFRESH_TOKEN');

      const user = await userRepo.findById(payload.sub);
      if (!user) throw new Error('USER_NOT_FOUND');

      return issueTokens(user);
    },

    getMe(userId: number | string): Promise<AuthUser | null> {
      return userRepo.findById(userId);
    },
  };
}
