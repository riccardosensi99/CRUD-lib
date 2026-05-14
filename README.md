# my-crud-lib

TypeScript-first auth and user/profile CRUD helpers for Node.js and Express.

The package currently provides:

- Express routers for auth and user CRUD.
- JWT access and refresh token helpers.
- Zod schemas for request validation.
- A `UserRepo` port plus a Prisma adapter.
- Convenience setup helpers for small Express APIs.

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

The Prisma adapter is available from both import paths:

```ts
import { makePrismaUserRepo } from "my-crud-lib/adapter-prisma";
// or
import { makePrismaUserRepo } from "my-crud-lib/adapters/prisma";
```

Auth also receives the same repository dependency:

```ts
import { createAuthRouter } from "my-crud-lib/auth";

app.use("/auth", createAuthRouter({ userRepo }));
```

## Build Checks

```bash
npm run build
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
