import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  sort: z
    .string()
    .regex(/^(createdAt|updatedAt|email|name):(asc|desc)$/i)
    .default('createdAt:desc'),
});

export const updateMeSchema = z.object({
  name: z.string().min(1).max(100).nullish(),
  bio: z.string().max(500).nullish(),
  avatarUrl: z.string().url().nullish(),
});

export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).nullish(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  bio: z.string().max(500).nullish(),
  avatarUrl: z.string().url().nullish(),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(1).max(100).nullish(),
  role: z.enum(['USER', 'ADMIN']).nullish(),
  bio: z.string().max(500).nullish(),
  avatarUrl: z.string().url().nullish(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
