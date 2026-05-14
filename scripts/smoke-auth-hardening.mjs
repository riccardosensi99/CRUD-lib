import assert from 'node:assert/strict';

const { DEFAULT_REGISTER_ROLE, resolveRegisterRole } = await import('../dist/modules/auth/auth.defaults.js');
const { getJwtSecret } = await import('../dist/config/env.js');

assert.equal(DEFAULT_REGISTER_ROLE, 'USER');
assert.equal(resolveRegisterRole(), 'USER');
assert.equal(resolveRegisterRole('ADMIN'), 'ADMIN');

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

console.log('Auth hardening smoke test passed');
