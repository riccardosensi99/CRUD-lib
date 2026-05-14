import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).nullish(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});

export const emailVerificationRequestSchema = z.object({
  email: z.string().email(),
});

export const emailVerificationConfirmSchema = z.object({
  token: z.string().min(16),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerificationRequestInput = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationConfirmInput = z.infer<typeof emailVerificationConfirmSchema>;
