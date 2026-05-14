# Migrating to v2

Version 2 changed the package from a Prisma-coupled helper into an adapter-driven library. Existing apps should update route setup and imports before upgrading.

## What changed

- Auth no longer creates its own Prisma dependency. Pass a `userRepo` into auth or library factories.
- `createLibrary()` now separates route config from dependencies.
- Self-registration now creates `USER` accounts by default.
- Public imports should use documented package entry points only.

## Auth router

Before v2, apps could mount auth without passing persistence explicitly:

```ts
import { createAuthRouter } from "my-crud-lib";

app.use("/auth", createAuthRouter());
```

In v2, create or import a repository adapter and pass it to the router:

```ts
import { PrismaClient } from "@prisma/client";
import { createAuthRouter } from "my-crud-lib/auth";
import { makePrismaUserRepo } from "my-crud-lib/adapter-prisma";

const prisma = new PrismaClient();
const userRepo = makePrismaUserRepo(prisma);

app.use("/auth", createAuthRouter({ userRepo }));
```

## Full library mount

Before:

```ts
import { createLibrary } from "my-crud-lib";

const lib = createLibrary({ routesPrefix: "/api" });
app.use(lib.router);
```

After:

```ts
import { PrismaClient } from "@prisma/client";
import { createLibrary } from "my-crud-lib";
import { makePrismaUserRepo } from "my-crud-lib/adapter-prisma";

const prisma = new PrismaClient();
const userRepo = makePrismaUserRepo(prisma);

const lib = createLibrary(
  {
    routesPrefix: "/api",
    auth: {
      passwordHashRounds: 10,
    },
  },
  { userRepo }
);

app.use(lib.router);
```

## Custom adapters

Apps that do not use Prisma can implement `UserRepo` directly:

```ts
import type { UserRepo } from "my-crud-lib/user";

const userRepo: UserRepo = {
  async count() {
    return 0;
  },
  async findMany() {
    return [];
  },
  async findById(id) {
    return null;
  },
  async findByEmail(email) {
    return null;
  },
  async create(input) {
    throw new Error("Implement user creation");
  },
  async update(id, input) {
    throw new Error("Implement user update");
  },
  async delete(id) {},
  async updateMe(userId, input) {
    throw new Error("Implement profile update");
  },
};
```

## Import paths

Use these public paths:

```ts
import { createLibrary, createServer, mountDefaultRoutes } from "my-crud-lib";
import { createAuthRouter, makeAuthService } from "my-crud-lib/auth";
import { createUserRouter, type UserRepo } from "my-crud-lib/user";
import { registerSchema, listUsersQuerySchema } from "my-crud-lib/schemas";
import { isAuth, hasRole } from "my-crud-lib/middleware";
import { makePrismaUserRepo } from "my-crud-lib/adapter-prisma";
```

Avoid importing from `dist` or internal `modules/*` paths. Those files are implementation details.

## Role defaults

Self-registration now resolves to `USER` unless you explicitly configure a different role:

```ts
app.use(
  "/auth",
  createAuthRouter({
    userRepo,
    defaultRegisterRole: "USER",
  })
);
```

Create admin users through your own seed script, internal admin workflow, or controlled provisioning path.
