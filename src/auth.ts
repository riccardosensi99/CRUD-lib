export { createAuthRouter } from './modules/auth/auth.controller.js';
export { DEFAULT_REGISTER_ROLE, resolveRegisterRole } from './modules/auth/auth.defaults.js';
export { makeAuthService } from './modules/auth/auth.service.js';
export { loginSchema, registerSchema } from './modules/auth/auth.schemas.js';
export type { AuthResult, AuthServiceDeps, AuthTokens, AuthUser, AuthUserRepo } from './modules/auth/auth.types.js';
export type { LoginInput, RegisterInput } from './modules/auth/auth.schemas.js';
