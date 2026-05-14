import assert from 'node:assert/strict';

const root = await import('my-crud-lib');
const auth = await import('my-crud-lib/auth');
const user = await import('my-crud-lib/user');
const schemas = await import('my-crud-lib/schemas');
const middleware = await import('my-crud-lib/middleware');
const prismaAdapter = await import('my-crud-lib/adapter-prisma');
const prismaAdapterCanonical = await import('my-crud-lib/adapters/prisma');

assert.equal(typeof root.createLibrary, 'function');
assert.equal(typeof root.createServer, 'function');
assert.equal(typeof root.mountDefaultRoutes, 'function');
assert.equal(typeof auth.createAuthRouter, 'function');
assert.equal(typeof auth.makeAuthService, 'function');
assert.equal(typeof user.createUserRouter, 'function');
assert.equal(typeof schemas.registerSchema.parse, 'function');
assert.equal(typeof middleware.isAuth, 'function');
assert.equal(typeof prismaAdapter.makePrismaUserRepo, 'function');
assert.equal(typeof prismaAdapterCanonical.makePrismaUserRepo, 'function');

console.log('Public API smoke test passed');
