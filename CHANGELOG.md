# Changelog

All notable changes to `my-crud-lib` are documented here.

This project follows semantic versioning. Breaking changes are called out explicitly and should be reviewed before upgrading.

## 3.1.0 - 2026-07-26

### Added

- Added optional multi-tenancy: `tenantId` on `UserRepo`, `UserListItem`, and JWT payloads; `req.user.tenantId` via `isAuth`; admin `GET /users` and `GET/PUT/DELETE /users/:id` are automatically tenant-scoped; new `requireTenant()`/`isSameTenant()` middleware.
- Added machine-to-machine API key authentication: `ApiKeyRepo` port, `issueApiKey`/`verifyApiKey` helpers, `isApiKey` middleware, and `makeMemoryApiKeyRepo`/`makePrismaApiKeyRepo` adapters.
- Added optional RS256/JWKS support (`JWT_ALG=RS256`, `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`/`JWT_KEY_ID`) with an auto-mounted `GET /.well-known/jwks.json`, so other services can verify tokens without a shared secret.
- Added idempotency key support (`IdempotencyStore` port, `idempotent` middleware) on `POST /auth/register` and admin `POST /users`, with memory and Prisma adapters.
- Added bulk user lookup: optional `UserRepo.findManyByIds`, and `POST /users/batch`.
- Added a pluggable rate limiter (`RateLimiter` port, `rateLimit` middleware, `makeMemoryRateLimiter`) applied to `POST /auth/login` and `POST /auth/register` when configured.
- Added a correlation id / request tracing middleware (`requestId`), mounted by default in `createServer()`.
- Added health check endpoints (`GET /health`, `GET /ready`), mounted by default in `createLibrary`/`mountDefaultRoutes`.
- Added a Jest + Supertest end-to-end API test suite (`tests/api/`), run in CI on every pull request alongside the existing `node:test` suite.

### Security

- `POST /auth/register` now ignores any client-supplied `tenantId` by default, since self-registration is unauthenticated and accepting one would let anyone join any tenant by guessing or copying its id. Opt in with `allowTenantIdOnRegister: true` only if your app has its own way to authorize tenant membership. Server-side calls to `makeAuthService(...).registerUser()` are unaffected and can still set `tenantId` directly.
- `idempotent`, `rateLimit`, and `isApiKey` middleware now catch errors from their underlying store/repo and respond with a normal error instead of leaving the request hanging if the backing store (e.g. a Prisma- or Redis-backed adapter) throws.
- `makePrismaIdempotencyStore` now evicts an expired record the next time it's read with the same key (previously it never deleted expired rows).

## 3.0.0 - 2026-07-24

### Breaking Changes

- Error responses from the auth and user routers now use `{ "error": { "code", "message", "details"? } }` instead of `{ "error": "<string>" }`. HTTP status codes are unchanged. Validation error `details` are now a formatted `{ field, message }[]` array instead of raw Zod issues.

### Added

- Added a CLI scaffolding command (`npx my-crud-lib init`) that generates a starter Prisma schema, `.env`, and Express server.
- Added typed error classes (`AppError`, `EmailAlreadyExistsError`, `InvalidCredentialsError`, `UserNotFoundError`, `TokenExpiredError`, `ForbiddenError`, `NotConfiguredError`, `ValidationError`) and `mapKnownError`/`sendAppError`/`errorHandler` helpers, exported from `my-crud-lib` and a new `my-crud-lib/errors` entry point.
- Added `formatZodIssues` to flatten Zod issues into `{ field, message }[]`, used for `ValidationError` details.
- Added an official dependency-free in-memory `UserRepo` adapter (`makeMemoryUserRepo`), exported from `my-crud-lib`, `my-crud-lib/adapters/memory`, and `my-crud-lib/adapter-memory`.
- Added optional auth lifecycle hooks (`onUserCreated`, `beforeLogin`, `onLoginSuccess`, `onPasswordReset`) on `AuthServiceDeps`.
- Added JSDoc to the public API surface for IDE hover/autocomplete hints.

## 2.1.0 - 2026-05-14

### Added

- Added a repeatable changelog and release-note workflow.
- Added a v2 migration guide for applications upgrading from the pre-v2 API shape.
- Added `prisma.config.ts` so Prisma CLI configuration no longer relies on the deprecated `package.json#prisma` field.
- Added self-hosted GitHub Actions runner documentation and configured CI to target the `local-ci` runner label.
- Added optional persistent refresh token rotation/revocation ports and Prisma adapter.
- Added optional password reset request/confirm service methods, routes, hooks, token repository port, and Prisma adapter.
- Added optional email verification request/confirm service methods, routes, hooks, token repository port, and Prisma adapter.
- Added provider-agnostic OAuth account linking service methods, port, and Prisma adapter.

### Changed

- Bumped the package version to `2.1.0`.
- Expanded the starter Prisma schema with optional auth extension storage models.

## 2.0.0 - 2026-05-14

### Breaking Changes

- Auth routes are now dependency-injected. `createAuthRouter()` requires a `userRepo` dependency instead of constructing Prisma access internally.
- `createLibrary()` now receives application dependencies separately from route configuration.
- Self-registration creates `USER` accounts by default. Applications must create `ADMIN` users intentionally through their own seed or admin workflow.
- Public imports were consolidated around documented package entry points: `my-crud-lib`, `my-crud-lib/auth`, `my-crud-lib/user`, `my-crud-lib/schemas`, `my-crud-lib/middleware`, `my-crud-lib/adapter-prisma`, and `my-crud-lib/adapters/prisma`.

### Added

- Added public Express router factories for auth and user/profile CRUD.
- Added `UserRepo` as the core persistence port.
- Added Prisma adapter exports.
- Added smoke tests for public package exports, auth safety defaults, and adapter-driven auth service behavior.

### Changed

- Prisma is optional for consumers that provide a custom repository adapter.
- Auth behavior now strips `passwordHash` from service responses.
- JWT configuration validates `JWT_SECRET` before signing or verifying tokens.
