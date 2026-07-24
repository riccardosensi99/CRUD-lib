# my-crud-lib

[![CI](https://github.com/riccardosensi99/CRUD-lib/actions/workflows/ci.yml/badge.svg)](https://github.com/riccardosensi99/CRUD-lib/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/my-crud-lib.svg)](https://www.npmjs.com/package/my-crud-lib)

TypeScript-first auth and user/profile CRUD helpers for Node.js and Express.

The package currently provides:

- Express routers for auth and user CRUD.
- JWT access and refresh token helpers.
- Optional persistent refresh token rotation and revocation.
- Optional password reset and email verification hooks.
- Provider-agnostic OAuth account linking extension points.
- Zod schemas for request validation.
- A `UserRepo` port plus a Prisma adapter.
- Convenience setup helpers for small Express APIs.

For advanced auth flows, see [docs/auth-extensions.md](docs/auth-extensions.md). For v1 to v2 upgrades, see [docs/migration-v2.md](docs/migration-v2.md). Release history and breaking changes are tracked in [CHANGELOG.md](CHANGELOG.md).

## Installation

```bash
npm i my-crud-lib express cors body-parser
```

If you use the bundled Prisma adapter:

```bash
npm i @prisma/client prisma
npx prisma generate
```

Node.js `>=18.17` is required.

## Environment

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/app"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
BCRYPT_SALT="10"
```

`JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN` have defaults. `JWT_SECRET` and `DATABASE_URL` must be set before using the default auth and Prisma paths.

## CLI Scaffolding

Generate a starter Prisma schema, `.env`, and Express server in the current directory:

```bash
npx my-crud-lib init
```

This creates `prisma/schema.prisma`, `src/server.ts`, and `.env` (skipping any that already exist). Edit `.env` with your `DATABASE_URL` and `JWT_SECRET`, then follow the printed next steps to install dependencies and run the server.

## Quickstart With Express And Prisma

```ts
import { PrismaClient } from "@prisma/client";
import { createLibrary, createServer } from "my-crud-lib";
import { makePrismaUserRepo } from "my-crud-lib/adapter-prisma";

const prisma = new PrismaClient();
const app = createServer();

const lib = createLibrary(
  {
    routesPrefix: "/api",
    auth: {
      passwordHashRounds: 10,
    },
  },
  { userRepo: makePrismaUserRepo(prisma) }
);

app.use(lib.router);

app.listen(3000, () => {
  console.log("API running on http://localhost:3000");
});
```

With the `/api` prefix, the mounted routes include:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `POST /api/auth/email-verification/request`
- `POST /api/auth/email-verification/confirm`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/users/me`
- `PUT /api/users/me`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

Admin user routes require a bearer token with role `ADMIN`.

## Examples

- `examples/express-prisma` is a runnable Express + Prisma app.
- `examples/custom-repo` shows the `UserRepo` shape with an in-memory adapter.

Run the Prisma example:

```bash
cd examples/express-prisma
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Response Examples

Register:

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "reader@example.com",
  "password": "password123",
  "name": "Reader"
}
```

Response:

```json
{
  "user": {
    "id": 1,
    "email": "reader@example.com",
    "name": "Reader",
    "role": "USER"
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

Login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "reader@example.com",
  "password": "password123"
}
```

Protected request:

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

## Public Imports

```ts
import {
  createLibrary,
  createServer,
  mountDefaultRoutes,
  createAuthRouter,
  createUserRouter,
  isAuth,
  hasRole,
} from "my-crud-lib";

import { createAuthRouter, makeAuthService, registerSchema, loginSchema } from "my-crud-lib/auth";
import { createUserRouter, type UserRepo } from "my-crud-lib/user";
import { registerSchema, listUsersQuerySchema } from "my-crud-lib/schemas";
import { isAuth, hasRole } from "my-crud-lib/middleware";
import { makePrismaUserRepo } from "my-crud-lib/adapter-prisma";
import { makePrismaUserRepo as makePrismaUserRepoCanonical } from "my-crud-lib/adapters/prisma";
```

## Repository Adapter

User CRUD is driven by the `UserRepo` interface:

```ts
export interface UserRepo {
  count(where: { role?: string; search?: string }): Promise<number>;
  findMany(params: {
    page: number;
    pageSize: number;
    role?: string;
    search?: string;
    sortField: "createdAt" | "updatedAt" | "email" | "name";
    sortDir: "asc" | "desc";
  }): Promise<UserListItem[]>;
  findById(id: number | string): Promise<UserListItem | null>;
  findByEmail(email: string): Promise<(UserListItem & { passwordHash?: string }) | null>;
  create(input: {
    email: string;
    passwordHash: string;
    name?: string | null;
    role?: string;
    bio?: string | null;
    avatarUrl?: string | null;
  }): Promise<UserListItem>;
  update(id: number | string, input: AdminUpdateUserInput): Promise<UserListItem>;
  delete(id: number | string): Promise<void>;
  updateMe(
    userId: number | string,
    input: { name?: string | null; bio?: string | null; avatarUrl?: string | null }
  ): Promise<UserListItem>;
}
```

## In-Memory Adapter

For demos, prototyping, or tests without a database:

```ts
import { createLibrary, createServer } from "my-crud-lib";
import { makeMemoryUserRepo } from "my-crud-lib/adapters/memory";

const app = createServer();
const lib = createLibrary({ routesPrefix: "/api" }, { userRepo: makeMemoryUserRepo() });

app.use(lib.router);
app.listen(3000);
```

State lives in process memory only (lost on restart, not shared across instances). It supports the full `UserRepo` contract, including `updatePassword` and `markEmailVerified`, so password reset and email verification work when paired with in-memory token repos of your own.

The Prisma adapter is available from both import paths:

```ts
import {
  makePrismaEmailVerificationTokenRepo,
  makePrismaOAuthAccountRepo,
  makePrismaPasswordResetTokenRepo,
  makePrismaRefreshTokenRepo,
  makePrismaUserRepo,
} from "my-crud-lib/adapter-prisma";
// or
import { makePrismaUserRepo } from "my-crud-lib/adapters/prisma";
```

Auth also receives the same repository dependency:

```ts
import { createAuthRouter } from "my-crud-lib/auth";

app.use("/auth", createAuthRouter({ userRepo }));
```

Optional auth extensions use additional ports:

```ts
app.use(
  "/auth",
  createAuthRouter({
    userRepo,
    refreshTokenRepo,
    passwordResetTokenRepo,
    emailVerificationTokenRepo,
    oauthAccountRepo,
    async sendPasswordReset({ user, token }) {
      await emailProvider.sendPasswordReset(user.email, token);
    },
    async sendEmailVerification({ user, token }) {
      await emailProvider.sendVerification(user.email, token);
    },
  })
);
```

These dependencies are optional. Without them, the existing stateless refresh-token flow remains available and password reset, email verification, and OAuth methods report that they are not configured.

## Lifecycle Hooks

Optional callbacks on `AuthServiceDeps` for reacting to auth events, e.g. sending a welcome email or writing an audit log:

```ts
app.use(
  "/auth",
  createAuthRouter({
    userRepo,
    async onUserCreated(user) {
      await emailProvider.sendWelcome(user.email);
    },
    async beforeLogin({ email }) {
      await lockoutGuard.assertNotLocked(email); // throwing aborts the login attempt
    },
    async onLoginSuccess(user) {
      await auditLog.record("login", user.id);
    },
    async onPasswordReset(user) {
      await auditLog.record("password-reset", user.id);
    },
  })
);
```

`onUserCreated` and `beforeLogin` run before the request completes — a thrown error aborts registration/login. `onLoginSuccess` and `onPasswordReset` run after the outcome is already decided; errors thrown from them are not surfaced to the caller.

## Error Responses

Routes created by this library respond to errors with a consistent shape:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid credentials"
  }
}
```

Validation errors additionally include a `details` array of `{ field, message }`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email" },
      { "field": "password", "message": "String must contain at least 8 character(s)" }
    ]
  }
}
```

The typed error classes and helpers are available for your own routes:

```ts
import {
  AppError,
  EmailAlreadyExistsError,
  errorHandler,
  formatZodIssues,
  mapKnownError,
  sendAppError,
} from "my-crud-lib/errors";
```

- `errorHandler` is an Express error-handling middleware (`app.use(errorHandler)`) for routes outside this library that call the same services/repos and `next(err)` their failures.
- `sendAppError(res, err)` writes the same JSON shape directly from a catch block.
- `mapKnownError(err)` normalizes any thrown value (a plain `Error`, a `ZodError`, or an `AppError`) into an `AppError` with a stable `code` and `statusCode`; Zod issues are formatted into `details` via `formatZodIssues`.
- `formatZodIssues(issues)` flattens `ZodIssue[]` into `{ field, message }[]` directly, for use with your own Zod schemas outside this library's routes.

## Multi-Tenancy (SaaS)

An optional `tenantId` scopes users to a tenant/organization, for SaaS deployments that share one database across customers:

```ts
import { requireTenant, isSameTenant } from "my-crud-lib/middleware";

// register/create accept an optional tenantId
await service.registerUser({ email, password, tenantId: "tenant-a" });

// tenantId is embedded in access/refresh tokens and available as req.user.tenantId
app.get("/internal/reports", isAuth, requireTenant(), handler);
```

Behavior:
- `POST /auth/register` and `POST /users` accept an optional `tenantId`.
- Access/refresh tokens carry `tenantId` when the user has one; `isAuth` exposes it as `req.user.tenantId`.
- Admin `GET /users` is automatically scoped to `req.user.tenantId` when the admin's token carries one — an admin token scoped to a tenant can never list another tenant's users.
- `GET/PUT/DELETE /users/:id` respond `404` (not `403`, to avoid leaking existence) when the target user belongs to a different tenant.
- `requireTenant()` middleware rejects requests from tokens without a `tenantId`.
- `isSameTenant(getResourceTenantId?)` middleware compares `req.user.tenantId` against a resolved resource tenant id (defaults to `req.params.tenantId`), for your own routes.

Single-tenant apps are unaffected: omit `tenantId` everywhere and behavior is identical to before.

## API Keys (Machine-to-Machine Auth)

For requests between internal services (workers, schedulers, other microservices) that don't have a user behind them:

```ts
import { issueApiKey, isApiKey } from "my-crud-lib";
import { makeMemoryApiKeyRepo } from "my-crud-lib/adapters/memory"; // or makePrismaApiKeyRepo

const apiKeyRepo = makeMemoryApiKeyRepo();

// generate once, e.g. from an admin script; store the returned key securely — it is never retrievable again
const { key } = await issueApiKey(apiKeyRepo, { name: "billing-service", scopes: ["users:read"] });

app.get("/internal/users/:id", isApiKey(apiKeyRepo, { requiredScopes: ["users:read"] }), handler);
```

The caller sends the key back via `X-API-Key: <key>` or `Authorization: ApiKey <key>`. Only a salted hash of the key is ever persisted (via `ApiKeyRepo`); the plaintext is returned once from `issueApiKey` and cannot be recovered afterward. `isApiKey` attaches `req.apiKey = { id, name, scopes, tenantId? }` on success.

To require either a user token or a service API key on the same route, chain your own small middleware that tries `isAuth` and falls back to `isApiKey`.

## Build Checks

```bash
npm run build
npm test
npm run smoke:exports
npm run smoke:auth-hardening
npm run smoke:auth-service
```

`smoke:exports` builds the package and imports the documented public paths from `dist`.
`smoke:auth-hardening` checks auth safety defaults and JWT secret validation.
`smoke:auth-service` verifies register/login/refresh/me with an in-memory repo.

## Current Limitations

- Lifecycle hooks and schema factories are not part of the current public API.
- The Prisma schema is included as a starter schema; consumer apps should own their migrations.

## Troubleshooting

`Cannot find module '@prisma/client'`

Install Prisma dependencies in your app and run `npx prisma generate`.

`JWT_SECRET is required before signing or verifying tokens`

Set `JWT_SECRET` before mounting or calling auth routes. Use a long random value.

`Invalid or expired token`

Send the access token in the `Authorization` header as `Bearer <accessToken>`. Use `/auth/refresh` with a refresh token to get a new pair.

ESM import errors

Use Node.js `>=18.17` and import from the documented package paths, for example `my-crud-lib`, `my-crud-lib/auth`, or `my-crud-lib/adapter-prisma`.

## Security Notes

- Use a long random `JWT_SECRET` and rotate it if compromised.
- Keep access tokens short-lived.
- Add rate limiting around auth endpoints in production.
- Use HTTPS in production.
- Self-registration creates `USER` accounts by default.
- Create `ADMIN` accounts intentionally through your own seed/admin workflow.

## License

MIT
