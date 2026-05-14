import type { Prisma, PrismaClient } from '@prisma/client';
import type { UserRepo } from '../core/ports/user.repo.js';
import type {
  EmailVerificationTokenRepo,
  OAuthAccountRepo,
  PasswordResetTokenRepo,
  RefreshTokenRepo,
} from '../modules/auth/auth.types.js';
import type { AdminUpdateUserInput, UserListItem } from '../modules/user/user.types.js';

const dateOrNow = (value?: Date) => value ?? new Date();

export function makePrismaUserRepo(prisma: PrismaClient): UserRepo {
  return {
    async count({ role, search }) {
      const where: Prisma.UserWhereInput = {};
      if (role) where.role = role as any;
      if (search?.trim()) {
        const s = search.trim();
        where.OR = [
          { email: { contains: s, mode: 'insensitive' } },
          { name: { contains: s, mode: 'insensitive' } },
        ];
      }
      return prisma.user.count({ where });
    },

    async findMany({ page, pageSize, role, search, sortField, sortDir }) {
      const where: Prisma.UserWhereInput = {};
      if (role) where.role = role as any;
      if (search?.trim()) {
        const s = search.trim();
        where.OR = [
          { email: { contains: s, mode: 'insensitive' } },
          { name: { contains: s, mode: 'insensitive' } },
        ];
      }
      const orderBy: Prisma.UserOrderByWithRelationInput = { [sortField]: sortDir };
      const users = await prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: { select: { bio: true, avatarUrl: true } },
        },
      });
      return users as unknown as UserListItem[];
    },

    async findById(id) {
      return prisma.user.findUnique({
        where: { id: id as any },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: { select: { bio: true, avatarUrl: true } },
        },
      }) as any;
    },

    async findByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true,
          profile: { select: { bio: true, avatarUrl: true } },
        },
      }) as any;
    },

    async create(input) {
      return prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          name: input.name ?? null,
          role: (input.role as any) ?? 'USER',
          profile: { create: { bio: input.bio ?? null, avatarUrl: input.avatarUrl ?? null } },
        },
        select: {
          id: true, email: true, name: true, role: true,
          createdAt: true, updatedAt: true,
          profile: { select: { bio: true, avatarUrl: true } },
        },
      }) as any;
    },

    async update(id, input: AdminUpdateUserInput) {
      return prisma.user.update({
        where: { id: id as any },
        data: {
          name: input.name ?? undefined,
          role: (input.role as any) ?? undefined,
          profile: {
            upsert: {
              create: { bio: input.bio ?? null, avatarUrl: input.avatarUrl ?? null },
              update: { bio: input.bio ?? null, avatarUrl: input.avatarUrl ?? null },
            },
          },
        },
        select: {
          id: true, email: true, name: true, role: true,
          profile: { select: { bio: true, avatarUrl: true } },
          createdAt: true, updatedAt: true,
        },
      }) as any;
    },

    async delete(id) {
      await prisma.user.delete({ where: { id: id as any } });
    },

    async updateMe(userId, data) {
      return prisma.user.update({
        where: { id: userId as any },
        data: {
          name: data.name ?? undefined,
          profile: {
            upsert: {
              create: { bio: data.bio ?? null, avatarUrl: data.avatarUrl ?? null },
              update: { bio: data.bio ?? null, avatarUrl: data.avatarUrl ?? null },
            },
          },
        },
        select: {
          id: true, email: true, name: true, role: true,
          profile: { select: { bio: true, avatarUrl: true } },
        },
      }) as any;
    },

    async updatePassword(id, passwordHash) {
      return prisma.user.update({
        where: { id: id as any },
        data: { passwordHash },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: { select: { bio: true, avatarUrl: true } },
        },
      }) as any;
    },

    async markEmailVerified(id, verifiedAt = new Date()) {
      return prisma.user.update({
        where: { id: id as any },
        data: { emailVerifiedAt: verifiedAt },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          profile: { select: { bio: true, avatarUrl: true } },
        },
      }) as any;
    },
  };
}

export function makePrismaRefreshTokenRepo(prisma: PrismaClient): RefreshTokenRepo {
  return {
    create(input) {
      return (prisma as any).refreshToken.create({ data: input });
    },

    findById(id) {
      return (prisma as any).refreshToken.findUnique({ where: { id } });
    },

    async revoke(id, input = {}) {
      await (prisma as any).refreshToken.update({
        where: { id },
        data: {
          revokedAt: dateOrNow(input.revokedAt),
          replacedByTokenId: input.replacedByTokenId ?? undefined,
        },
      });
    },

    async revokeFamily(familyId, input = {}) {
      await (prisma as any).refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: dateOrNow(input.revokedAt) },
      });
    },
  };
}

export function makePrismaPasswordResetTokenRepo(prisma: PrismaClient): PasswordResetTokenRepo {
  return {
    create(input) {
      return (prisma as any).passwordResetToken.create({ data: input });
    },

    findById(id) {
      return (prisma as any).passwordResetToken.findUnique({ where: { id } });
    },

    async markUsed(id, input = {}) {
      await (prisma as any).passwordResetToken.update({
        where: { id },
        data: { usedAt: dateOrNow(input.usedAt) },
      });
    },

    async revoke(id, input = {}) {
      await (prisma as any).passwordResetToken.update({
        where: { id },
        data: { revokedAt: dateOrNow(input.revokedAt) },
      });
    },
  };
}

export function makePrismaEmailVerificationTokenRepo(prisma: PrismaClient): EmailVerificationTokenRepo {
  return {
    create(input) {
      return (prisma as any).emailVerificationToken.create({ data: input });
    },

    findById(id) {
      return (prisma as any).emailVerificationToken.findUnique({ where: { id } });
    },

    async markUsed(id, input = {}) {
      await (prisma as any).emailVerificationToken.update({
        where: { id },
        data: { usedAt: dateOrNow(input.usedAt) },
      });
    },

    async revoke(id, input = {}) {
      await (prisma as any).emailVerificationToken.update({
        where: { id },
        data: { revokedAt: dateOrNow(input.revokedAt) },
      });
    },
  };
}

export function makePrismaOAuthAccountRepo(prisma: PrismaClient): OAuthAccountRepo {
  return {
    findByProviderAccount(provider, providerAccountId) {
      return (prisma as any).oauthAccount.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
    },

    findByUserAndProvider(userId, provider) {
      return (prisma as any).oauthAccount.findFirst({
        where: { userId: userId as any, provider },
      });
    },

    create(input) {
      return (prisma as any).oauthAccount.create({
        data: {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          userId: input.userId as any,
          email: input.email ?? null,
        },
      });
    },
  };
}
