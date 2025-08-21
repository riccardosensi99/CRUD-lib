import { prisma } from '../../utils/prisma.js';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.js';
import type { RegisterInput } from './auth.schemas.js';

export async function registerUser(params: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: params.email } });
  if (exists) throw new Error('EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(params.password, Number(process.env.BCRYPT_SALT) || 10);

  const user = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      name: params.name ?? null,
      role: 'ADMIN',
      profile: { create: {} },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role as 'USER' | 'ADMIN' });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role as 'USER' | 'ADMIN' });
  return { user, accessToken, refreshToken };
}
export async function loginUser(params: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: params.email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');
  const ok = await bcrypt.compare(params.password, user.passwordHash);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  const payload = { sub: user.id, role: user.role as 'USER' | 'ADMIN' };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  };
}
