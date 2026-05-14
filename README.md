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
  { routesPrefix: "/api" },
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

import { createAuthRouter, registerSchema, loginSchema } from "my-crud-lib/auth";
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

## Build Checks

```bash
npm run build
npm run smoke:exports
```

`smoke:exports` builds the package and imports the documented public paths from `dist`.

## Current Limitations

- Auth register/login/refresh currently use the bundled Prisma-backed auth implementation. Full auth storage injection is tracked as a separate improvement.
- Lifecycle hooks and schema factories are not part of the current public API.
- The Prisma schema is included as a starter schema; consumer apps should own their migrations.

## Security Notes

- Use a long random `JWT_SECRET` and rotate it if compromised.
- Keep access tokens short-lived.
- Add rate limiting around auth endpoints in production.
- Use HTTPS in production.
- Review role defaults before exposing admin routes.

## License

MIT
