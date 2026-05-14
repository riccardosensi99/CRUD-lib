# Repository Memory

Last updated: 2026-05-14

## Product Context

This repository contains `my-crud-lib`, an npm package for Node.js auth and user/profile CRUD.

The direction is to turn it from a personal CRUD/auth utility into a package that is easier to adopt, understand, trust, and extend. The library should feel useful to a developer who lands from npm or GitHub with no prior context.

## Current Package Shape

- Package name: `my-crud-lib`
- Current local version: `1.0.4`
- Runtime target: Node.js `>=18.17`
- Main entrypoint: `dist/index.js`
- Type declarations: `dist/index.d.ts`
- Main modules: auth, user, profile, Prisma adapter, Express middleware.
- Current default stack: TypeScript, Express, Prisma, Zod, JWT, bcryptjs.

## Product Goals

- Make the public API match the README and npm package exports.
- Keep the core auth/user logic adapter-driven instead of tied to a global Prisma client.
- Improve first-run developer experience with examples, typed setup, and clear docs.
- Add tests and CI so users can trust releases.
- Improve npm discoverability with metadata, examples, keywords, and a polished README.
- Harden auth defaults so the package is safer for real projects.

## Important Findings From Initial Repo Review

- `README.md` documents `createLibrary`, hooks, schema factories, and `my-crud-lib/adapter-prisma`, but the current `src/index.ts` exports do not provide that API.
- `package.json` exports `./adapters/prisma`, while README uses `my-crud-lib/adapter-prisma`; there is also a stray top-level `./adapter-prisma` object outside `exports`.
- `auth.service.ts`, `auth.controller.ts`, `isAuth.ts`, and `/auth/me` currently depend on shared env/global Prisma utilities, so auth is not fully DB-agnostic yet.
- `registerUser` currently assigns new registered users the `ADMIN` role by default, which is risky for a public auth package.
- The local `npm run build` cannot complete until runtime dependencies are installed in `node_modules`; the checkout currently has only part of the dependency tree installed.
- `package-lock.json` is ignored by `.gitignore`, even though it exists locally. Decide whether this is intended for a library package.

## Working Principles For Future Changes

- Prefer small, releasable issues over one large rewrite.
- Keep breaking API changes explicit and versioned.
- Treat README examples as executable contracts: if an import or function is shown, it should compile.
- Add tests around public imports before changing exports.
- Keep Prisma as the convenient default adapter, not as the core dependency of every workflow.
- Improve adoption through boring reliability first: build, exports, docs, tests, examples, metadata.

## Useful Local Commands

```bash
npm run build
npm run dev
npm run prisma:generate
npm run generate:secret
```

## GitHub Backlog

Initial improvement issues were opened on 2026-05-14. Use those issues as the source of truth for incremental work.

- #5 Align public API, package exports, and README examples: https://github.com/riccardosensi99/CRUD-lib/issues/5
- #6 Make auth core adapter-driven instead of tied to global Prisma: https://github.com/riccardosensi99/CRUD-lib/issues/6
- #7 Harden auth defaults before promoting the package: https://github.com/riccardosensi99/CRUD-lib/issues/7
- #8 Add test suite and CI for build, public imports, and auth flows: https://github.com/riccardosensi99/CRUD-lib/issues/8
- #9 Improve README and examples for first-time npm users: https://github.com/riccardosensi99/CRUD-lib/issues/9
- #10 Improve npm package discoverability and release metadata: https://github.com/riccardosensi99/CRUD-lib/issues/10
