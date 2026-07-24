import assert from 'node:assert/strict';
import test from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-multi-tenancy-test';

test('tenantId flows from registration through tokens and scoped listing', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const { makeMemoryUserRepo } = await import('../dist/adapters/memory.js');
  const { verifyToken } = await import('../dist/utils/jwt.js');

  const userRepo = makeMemoryUserRepo();
  const service = makeAuthService({ userRepo, passwordHashRounds: 4 });

  const tenantA = await service.registerUser({ email: 'a@tenant-a.com', password: 'password123', tenantId: 'tenant-a' });
  await service.registerUser({ email: 'b@tenant-b.com', password: 'password123', tenantId: 'tenant-b' });

  assert.equal(tenantA.user.tenantId, 'tenant-a');

  const payload = verifyToken(tenantA.accessToken);
  assert.equal(payload.tenantId, 'tenant-a');

  const onlyTenantA = await userRepo.findMany({
    page: 1,
    pageSize: 10,
    tenantId: 'tenant-a',
    sortField: 'createdAt',
    sortDir: 'asc',
  });
  assert.equal(onlyTenantA.length, 1);
  assert.equal(onlyTenantA[0].email, 'a@tenant-a.com');

  const countTenantB = await userRepo.count({ tenantId: 'tenant-b' });
  assert.equal(countTenantB, 1);
});

test('isSameTenant middleware rejects cross-tenant access', async () => {
  const { isSameTenant, requireTenant } = await import('../dist/middleware/tenant.js');

  const makeRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
  };

  const mismatch = { user: { id: 1, role: 'ADMIN', tenantId: 'tenant-a' }, params: { tenantId: 'tenant-b' } };
  const res1 = makeRes();
  let nextCalled = false;
  isSameTenant()(mismatch, res1, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res1.statusCode, 403);

  const match = { user: { id: 1, role: 'ADMIN', tenantId: 'tenant-a' }, params: { tenantId: 'tenant-a' } };
  const res2 = makeRes();
  let nextCalled2 = false;
  isSameTenant()(match, res2, () => { nextCalled2 = true; });
  assert.equal(nextCalled2, true);

  const noTenant = { user: { id: 1, role: 'ADMIN' }, params: {} };
  const res3 = makeRes();
  let nextCalled3 = false;
  requireTenant()(noTenant, res3, () => { nextCalled3 = true; });
  assert.equal(nextCalled3, false);
  assert.equal(res3.statusCode, 403);
});
