# Changelog

All notable changes to `my-crud-lib` are documented here.

This project follows semantic versioning. Breaking changes are called out explicitly and should be reviewed before upgrading.

## 2.1.0 - Unreleased

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
