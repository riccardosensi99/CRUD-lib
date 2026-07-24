import express, { Router, type Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
export type { UserRepo } from './core/ports/user.repo.js';
export type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  ListUsersQuery,
  Paginated,
  Role,
  UpdateMeInput,
  UserListItem,
} from './modules/user/user.types.js';
export { createUserRouter } from './modules/user/user.controller.js';
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
export {
  SortEnum,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  listUsersQuerySchema,
  updateMeSchema,
} from './modules/user/user.schemas.js';
export { isAuth, type AuthRequest } from './middleware/isAuth.js';
export { hasRole, isSelfOrAdmin } from './middleware/hasRole.js';
export { requireTenant, isSameTenant } from './middleware/tenant.js';
export {
  AppError,
  EmailAlreadyExistsError,
  ForbiddenError,
  InvalidCredentialsError,
  NotConfiguredError,
  TokenExpiredError,
  UserNotFoundError,
  ValidationError,
  errorHandler,
  formatZodIssues,
  mapKnownError,
  sendAppError,
  type FieldValidationIssue,
} from './utils/errorHandler.js';
export {
  makePrismaEmailVerificationTokenRepo,
  makePrismaOAuthAccountRepo,
  makePrismaPasswordResetTokenRepo,
  makePrismaRefreshTokenRepo,
  makePrismaUserRepo,
} from './adapters/prisma.js';
export { makeMemoryUserRepo } from './adapters/memory.js';

import type { UserRepo } from './core/ports/user.repo.js';
import type { AuthServiceDeps } from './modules/auth/auth.types.js';
import { createAuthRouter } from './modules/auth/auth.controller.js';
import { createUserRouter } from './modules/user/user.controller.js';

/** Options for `createLibrary`/`mountDefaultRoutes`. */
export type LibraryConfig = {
  /** Prefix applied to all mounted routes, e.g. `/api`. */
  routesPrefix?: string;
  /** Passed through to `createAuthRouter` alongside `deps.userRepo`. */
  auth?: Omit<AuthServiceDeps, 'userRepo'>;
};

/** Dependencies for `createLibrary`/`mountDefaultRoutes`. */
export type LibraryDeps = {
  userRepo: UserRepo;
};

function normalizePrefix(prefix?: string): string {
  if (!prefix) return '';
  const trimmed = prefix.trim();
  if (!trimmed || trimmed === '/') return '';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

/** Creates an Express app with `cors` and JSON body parsing already wired in. */
export function createServer(): Express {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  return app;
}

/**
 * Builds the combined auth + user router for this library.
 *
 * @param config.routesPrefix - Path prefix for all mounted routes, e.g. `/api`. Defaults to no prefix.
 * @param config.auth - Extra `AuthServiceDeps` (excluding `userRepo`), e.g. `passwordHashRounds` or optional token repos.
 * @param deps.userRepo - The `UserRepo` adapter backing both auth and user CRUD.
 * @returns `{ router }` — mount it with `app.use(router)`.
 */
export function createLibrary(config: LibraryConfig, deps: LibraryDeps) {
  const router = Router();
  const prefix = normalizePrefix(config.routesPrefix);

  router.use(`${prefix}/auth`, createAuthRouter({ userRepo: deps.userRepo, ...config.auth }));
  router.use(`${prefix}/users`, createUserRouter({ userRepo: deps.userRepo }));

  return { router };
}

/** Convenience wrapper that builds the router via `createLibrary` and mounts it on `app` directly. */
export function mountDefaultRoutes(app: Express, deps: LibraryDeps, config: LibraryConfig = {}) {
  const { router } = createLibrary(config, deps);
  app.use(router);
}
