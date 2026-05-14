import assert from 'node:assert/strict';
import test from 'node:test';

test('auth defaults are safe', async () => {
  const { DEFAULT_REGISTER_ROLE, resolveRegisterRole } = await import('../dist/modules/auth/auth.defaults.js');

  assert.equal(DEFAULT_REGISTER_ROLE, 'USER');
  assert.equal(resolveRegisterRole(), 'USER');
  assert.equal(resolveRegisterRole('ADMIN'), 'ADMIN');
});

test('JWT secret is required and trimmed', async () => {
  const { getJwtSecret } = await import('../dist/config/env.js');
  const originalSecret = process.env.JWT_SECRET;

  try {
    delete process.env.JWT_SECRET;
    assert.throws(() => getJwtSecret(), /JWT_SECRET is required/);

    process.env.JWT_SECRET = '  test-secret  ';
    assert.equal(getJwtSecret(), 'test-secret');
  } finally {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  }
});
