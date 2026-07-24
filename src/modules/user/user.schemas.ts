import { z } from 'zod';

export const SortEnum = z.enum([
  'createdAt:desc',
  'createdAt:asc',
  'updatedAt:asc',
  'updatedAt:desc',
  'email:asc',
  'email:desc',
  'name:asc',
  'name:desc',
]);

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z
    .string()
    .trim()
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  tenantId: z.union([z.string(), z.coerce.number()]).optional(),
  sort: SortEnum.default('createdAt:desc'),
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
  tenantId: z.union([z.string(), z.number()]).nullish(),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(1).max(100).nullish(),
  role: z.enum(['USER', 'ADMIN']).nullish(),
  bio: z.string().max(500).nullish(),
  avatarUrl: z.string().url().nullish(),
});

export const userIdsBatchSchema = z.object({
  ids: z.array(z.union([z.string(), z.number()])).min(1).max(100),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UserIdsBatchInput = z.infer<typeof userIdsBatchSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
