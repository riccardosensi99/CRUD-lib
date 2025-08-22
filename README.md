# my-crud-lib

A modular, TypeScript-first **Auth + User/Profile CRUD** library for Node.js, designed to be **framework-light**, **DB-agnostic** (via adapters), and **highly extensible** (schemas + hooks). Ship a secure `/auth/register`, `/auth/login`, and `/me` in minutes—then customize without forking the core.

> Works great with Express and Prisma out of the box, but you can plug in your own repo adapter.

---

## Features

- ✅ Ready-made routes: `POST /auth/register`, `POST /auth/login`, `GET /me`
- 🔐 JWT-based auth with pluggable lifecycle hooks (before/after create, before issuing JWT, etc.)
- 🧩 Extensible validation via **Zod**: merge your own fields into the base schemas
- 🗄️ Repository interfaces (DB-agnostic) + optional Prisma adapter
- 🧰 Cleanly separated core logic & web router
- 🧪 TypeScript types exported for DX

---

## Installation

```bash
npm i my-crud-lib zod jsonwebtoken bcryptjs
# If using Prisma adapter in your app:
npm i @prisma/client
```

> Node.js `>= 18.17` is required.

---

## Quickstart (Express)

```ts
import express from "express";
import { json } from "body-parser";
import { createLibrary } from "my-crud-lib";
// Optional: Prisma adapter (provided in your app)
import { PrismaClient } from "@prisma/client";
import { makePrismaUserRepo } from "my-crud-lib/adapter-prisma"; // if you expose this path

const prisma = new PrismaClient();

const app = express();
app.use(json());

const lib = createLibrary(
  {
    auth: {
      jwtSecret: process.env.JWT_SECRET!, // e.g. "supersecret"
      jwtExpiresIn: "7d",
      passwordHashRounds: 10,
    },
    routesPrefix: "/api", // optional
  },
  { userRepo: makePrismaUserRepo(prisma) }
);

app.use(lib.router);

app.listen(3000, () => console.log("API running on http://localhost:3000"));
```

### Available Routes

- `POST /auth/register` → create user (email + password + optional name)
- `POST /auth/login` → returns `{ accessToken }`
- `GET /me` → authenticated endpoint, returns the current user

> Protect `/me` with the `isAuth` middleware already wired inside the library router.

---

## Configuration

```ts
type AuthConfig = {
  jwtSecret: string;
  jwtExpiresIn: string; // e.g. "7d"
  passwordHashRounds: number; // e.g. 10
};

type LibraryConfig = {
  auth: AuthConfig;
  routesPrefix?: string; // e.g. "/api"
};
```

Create the library:

```ts
const lib = createLibrary(config, { userRepo });
```

---

## Extending Schemas (Zod)

The library exports base Zod schemas and a factory to merge your custom fields.

```ts
// consumer app
import { z } from "zod";
import { makeCreateUserSchema } from "my-crud-lib/schemas";

const ExtraUserFields = z.object({
  companyVat: z.string().min(5),
  marketingOptIn: z.boolean().default(false),
});

export const CreateUserSchema = makeCreateUserSchema(ExtraUserFields);

// Later in your route (if you override the built-in):
const data = CreateUserSchema.parse(req.body);
```

**Tip:** The default Prisma schema (if you use it) exposes `profile.extra: Json?` so you can store arbitrary fields without altering the core tables.

---

## Hooks (Lifecycle)

Use hooks to change data or enrich tokens without forking.

```ts
import { plugins } from "my-crud-lib";

plugins.use({
  beforeCreateUser: async (data, ctx) => {
    if (data.companyVat) data.companyVat = data.companyVat.toUpperCase();
    return data;
  },
  afterCreateUser: async (user, ctx) => {
    // e.g., send welcome email or audit log
  },
  beforeIssueJwt: (payload, ctx) => {
    return { ...payload, tenantId: "acme-123" };
  },
});
```

**Available hooks**
- `beforeCreateUser(data, ctx)`
- `afterCreateUser(user, ctx)`
- `beforeUpdateUser(data, ctx)`
- `beforeIssueJwt(payload, ctx)`

`ctx` includes the request and useful dependencies (e.g., repos).

---

## Repository Adapters (DB-agnostic)

Core interface:

```ts
export interface UserRepo {
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
}
```

Example Prisma adapter (in your app or provided by the lib):

```ts
export function makePrismaUserRepo(prisma: any): UserRepo {
  return {
    create: (data) => prisma.user.create({ data }),
    update: (id, data) => prisma.user.update({ where: { id }, data }),
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  };
}
```

---

## Types

The package exports the main public types:

- `LibraryConfig`, `AuthConfig`
- `UserRepo`
- schema types (e.g., `CreateUserBase`)

---

## Security Notes

- Keep `JWT_SECRET` secure; rotate if compromised.
- Consider adding rate limiting in your app (e.g., `express-rate-limit`).
- Store password hashes using `bcryptjs` with adequate rounds (default shown: `10`).
- Use HTTPS in production.

---

## Optional

if you want to use the prisma adeapter use:

npm i @prisma/client prisma
npx prisma generate

## Contributing

PRs and issues are welcome! Please follow conventional commits or include a clear description. For releases, we recommend Changesets or semantic-release.

---

## License

MIT © Riccardo
