import assert from 'node:assert/strict';
import test from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-middleware-test';

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('isAuth attaches verified JWT user to request', async () => {
  const { signAccessToken } = await import('../dist/utils/jwt.js');
  const { isAuth } = await import('../dist/middleware/isAuth.js');
  const token = signAccessToken({ sub: 'user-1', role: 'USER' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let nextCalled = false;

  isAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { id: 'user-1', role: 'USER' });
});

test('isAuth rejects missing bearer token', async () => {
  const { isAuth } = await import('../dist/middleware/isAuth.js');
  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  isAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Missing or invalid Authorization header');
});

test('hasRole and isSelfOrAdmin enforce access checks', async () => {
  const { hasRole, isSelfOrAdmin } = await import('../dist/middleware/hasRole.js');

  {
    const req = { user: { id: 'user-1', role: 'ADMIN' }, params: { id: 'user-2' } };
    const res = createResponse();
    let nextCalled = false;
    hasRole('ADMIN')(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  }

  {
    const req = { user: { id: 'user-1', role: 'USER' }, params: { id: 'user-1' } };
    const res = createResponse();
    let nextCalled = false;
    isSelfOrAdmin()(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  }

  {
    const req = { user: { id: 'user-1', role: 'USER' }, params: { id: 'user-2' } };
    const res = createResponse();
    let nextCalled = false;
    isSelfOrAdmin()(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  }
});
