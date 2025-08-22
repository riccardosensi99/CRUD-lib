import { prisma } from '../../utils/prisma.js';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type {
    AdminCreateUserInput,
    AdminUpdateUserInput,
    ListUsersQuery,
    UpdateMeInput,
} from './user.schemas.js';

export async function listUsers(q: ListUsersQuery) {
    const { page, pageSize, role, search } = q;

    const [rawField, rawDir] = (q.sort ?? 'createdAt:desc').split(':');
    const allowedFields = ['createdAt', 'updatedAt', 'email', 'name'] as const;
    const sortField = (allowedFields as readonly string[]).includes(rawField || '')
        ? (rawField as (typeof allowedFields)[number])
        : 'createdAt';
    const sortDir: 'asc' | 'desc' = rawDir === 'asc' || rawDir === 'desc' ? rawDir : 'desc';

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (search && search.trim() !== '') {
        const s = search.trim();
        where.OR = [
            { email: { contains: s, mode: 'insensitive' as const } },
            { name: { contains: s, mode: 'insensitive' as const } },
        ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = { [sortField]: sortDir };

    const [total, items] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
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
        }),
    ]);

    return {
        page,
        pageSize,
        total,
        items,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getUserById(id: number) {
    return prisma.user.findUnique({
        where: { id },
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
}

export async function updateMe(userId: number, data: UpdateMeInput) {
    return prisma.user.update({
        where: { id: userId },
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
            id: true,
            email: true,
            name: true,
            role: true,
            profile: { select: { bio: true, avatarUrl: true } },
        },
    });
}

export async function adminCreateUser(input: AdminCreateUserInput) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new Error('EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(input.password, Number(process.env.BCRYPT_SALT) || 10);

    return prisma.user.create({
        data: {
            email: input.email,
            passwordHash,
            name: input.name ?? null,
            role: input.role ?? 'USER',
            profile: {
                create: {
                    bio: input.bio ?? null,
                    avatarUrl: input.avatarUrl ?? null,
                },
            },
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            profile: { select: { bio: true, avatarUrl: true } },
            createdAt: true,
            updatedAt: true,
        },
    });
}

export async function adminUpdateUser(id: number, input: AdminUpdateUserInput) {
    return prisma.user.update({
        where: { id },
        data: {
            name: input.name ?? undefined,
            role: input.role ?? undefined,
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
    });
}

export async function adminDeleteUser(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    await prisma.user.delete({ where: { id } });
    return { ok: true };
}
