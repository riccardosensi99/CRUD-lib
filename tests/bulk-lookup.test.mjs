import assert from 'node:assert/strict';
import test from 'node:test';

test('userRepo.findManyByIds resolves multiple users in one call, skipping unmatched ids', async () => {
  const { makeMemoryUserRepo } = await import('../dist/adapters/memory.js');

  const repo = makeMemoryUserRepo();
  const a = await repo.create({ email: 'a@example.com', passwordHash: 'x' });
  const b = await repo.create({ email: 'b@example.com', passwordHash: 'x' });
  await repo.create({ email: 'c@example.com', passwordHash: 'x' });

  const found = await repo.findManyByIds([a.id, b.id, 9999]);
  const emails = found.map((u) => u.email).sort();
  assert.deepEqual(emails, ['a@example.com', 'b@example.com']);
});

test('userService.getUsersByIds falls back to N findById calls when findManyByIds is absent', async () => {
  const { makeUserService } = await import('../dist/modules/user/user.service.js');

  const store = new Map();
  let findManyByIdsCalls = 0;
  const userRepo = {
    async findById(id) {
      return store.get(String(id)) ?? null;
    },
    // findManyByIds intentionally omitted
  };

  store.set('1', { id: 1, email: 'a@example.com', name: null, role: 'USER', createdAt: '', updatedAt: '' });
  store.set('2', { id: 2, email: 'b@example.com', name: null, role: 'USER', createdAt: '', updatedAt: '' });

  const service = makeUserService({ userRepo });
  const result = await service.getUsersByIds([1, 2, 3]);

  assert.equal(findManyByIdsCalls, 0);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((u) => u.email).sort(), ['a@example.com', 'b@example.com']);
});

test('userService.getUsersByIds scopes results to tenantId when provided', async () => {
  const { makeMemoryUserRepo } = await import('../dist/adapters/memory.js');
  const { makeUserService } = await import('../dist/modules/user/user.service.js');

  const userRepo = makeMemoryUserRepo();
  const a = await userRepo.create({ email: 'a@tenant-a.com', passwordHash: 'x', tenantId: 'tenant-a' });
  const b = await userRepo.create({ email: 'b@tenant-b.com', passwordHash: 'x', tenantId: 'tenant-b' });

  const service = makeUserService({ userRepo });
  const result = await service.getUsersByIds([a.id, b.id], 'tenant-a');

  assert.equal(result.length, 1);
  assert.equal(result[0].email, 'a@tenant-a.com');
});
