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
export { registerSchema, loginSchema } from './modules/auth/auth.schemas.js';
export type { AuthResult, AuthServiceDeps, AuthTokens, AuthUser, AuthUserRepo } from './modules/auth/auth.types.js';
export {
  SortEnum,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  listUsersQuerySchema,
  updateMeSchema,
} from './modules/user/user.schemas.js';
export { isAuth, type AuthRequest } from './middleware/isAuth.js';
export { hasRole, isSelfOrAdmin } from './middleware/hasRole.js';
export { makePrismaUserRepo } from './adapters/prisma.js';

import type { UserRepo } from './core/ports/user.repo.js';
import type { AuthServiceDeps } from './modules/auth/auth.types.js';
import { createAuthRouter } from './modules/auth/auth.controller.js';
import { createUserRouter } from './modules/user/user.controller.js';

export type LibraryConfig = {
  routesPrefix?: string;
  auth?: Omit<AuthServiceDeps, 'userRepo'>;
};

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

export function createServer(): Express {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  return app;
}

export function createLibrary(config: LibraryConfig, deps: LibraryDeps) {
  const router = Router();
  const prefix = normalizePrefix(config.routesPrefix);

  router.use(`${prefix}/auth`, createAuthRouter({ userRepo: deps.userRepo, ...config.auth }));
  router.use(`${prefix}/users`, createUserRouter({ userRepo: deps.userRepo }));

  return { router };
}

export function mountDefaultRoutes(app: Express, deps: LibraryDeps, config: LibraryConfig = {}) {
  const { router } = createLibrary(config, deps);
  app.use(router);
}
