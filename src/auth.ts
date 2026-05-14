export { createAuthRouter } from './modules/auth/auth.controller.js';
export { DEFAULT_REGISTER_ROLE, resolveRegisterRole } from './modules/auth/auth.defaults.js';
export { makeAuthService } from './modules/auth/auth.service.js';
export {
  emailVerificationConfirmSchema,
  emailVerificationRequestSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerSchema,
} from './modules/auth/auth.schemas.js';
export type {
  AuthResult,
  AuthServiceDeps,
  AuthTokens,
  AuthUser,
  AuthUserRepo,
  EmailVerificationConfirmInput,
  EmailVerificationRequestInput,
  EmailVerificationTokenRecord,
  EmailVerificationTokenRepo,
  OAuthAccount,
  OAuthAccountRepo,
  OAuthProviderProfile,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  PasswordResetTokenRecord,
  PasswordResetTokenRepo,
  RefreshTokenRecord,
  RefreshTokenRepo,
} from './modules/auth/auth.types.js';
export type {
  EmailVerificationConfirmInput as EmailVerificationConfirmSchemaInput,
  EmailVerificationRequestInput as EmailVerificationRequestSchemaInput,
  LoginInput,
  PasswordResetConfirmInput as PasswordResetConfirmSchemaInput,
  PasswordResetRequestInput as PasswordResetRequestSchemaInput,
  RegisterInput,
} from './modules/auth/auth.schemas.js';
