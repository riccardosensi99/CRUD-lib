import assert from 'node:assert/strict';
import test from 'node:test';

function makeRes() {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('issueApiKey + isApiKey: valid key authenticates and attaches req.apiKey', async () => {
  const { makeMemoryApiKeyRepo } = await import('../dist/adapters/memory.js');
  const { issueApiKey } = await import('../dist/utils/apiKey.js');
  const { isApiKey } = await import('../dist/middleware/isApiKey.js');

  const apiKeyRepo = makeMemoryApiKeyRepo();
  const { key } = await issueApiKey(apiKeyRepo, { name: 'billing-service', scopes: ['users:read'] });

  const req = { headers: { 'x-api-key': key } };
  const res = makeRes();
  let nextCalled = false;

  await isApiKey(apiKeyRepo)(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.apiKey.name, 'billing-service');
  assert.deepEqual(req.apiKey.scopes, ['users:read']);
});

test('isApiKey rejects missing, malformed, and revoked keys', async () => {
  const { makeMemoryApiKeyRepo } = await import('../dist/adapters/memory.js');
  const { issueApiKey } = await import('../dist/utils/apiKey.js');
  const { isApiKey } = await import('../dist/middleware/isApiKey.js');

  const apiKeyRepo = makeMemoryApiKeyRepo();

  const missing = makeRes();
  await isApiKey(apiKeyRepo)({ headers: {} }, missing, () => assert.fail('should not call next'));
  assert.equal(missing.statusCode, 401);

  const malformed = makeRes();
  await isApiKey(apiKeyRepo)({ headers: { 'x-api-key': 'not-a-valid-key' } }, malformed, () => assert.fail('should not call next'));
  assert.equal(malformed.statusCode, 401);

  const { id, key } = await issueApiKey(apiKeyRepo, {});
  await apiKeyRepo.revoke(id);
  const revoked = makeRes();
  await isApiKey(apiKeyRepo)({ headers: { 'x-api-key': key } }, revoked, () => assert.fail('should not call next'));
  assert.equal(revoked.statusCode, 401);
});

test('isApiKey enforces requiredScopes', async () => {
  const { makeMemoryApiKeyRepo } = await import('../dist/adapters/memory.js');
  const { issueApiKey } = await import('../dist/utils/apiKey.js');
  const { isApiKey } = await import('../dist/middleware/isApiKey.js');

  const apiKeyRepo = makeMemoryApiKeyRepo();
  const { key } = await issueApiKey(apiKeyRepo, { scopes: ['users:read'] });

  const res = makeRes();
  await isApiKey(apiKeyRepo, { requiredScopes: ['users:write'] })(
    { headers: { 'x-api-key': key } },
    res,
    () => assert.fail('should not call next'),
  );
  assert.equal(res.statusCode, 403);
});

test('isApiKey responds 500 instead of hanging when the repo throws', async () => {
  const { isApiKey } = await import('../dist/middleware/isApiKey.js');

  const brokenRepo = {
    async findById() { throw new Error('REPO_DOWN'); },
    async create() {},
    async revoke() {},
  };
  const middleware = isApiKey(brokenRepo);

  const res = makeRes();
  await middleware({ headers: { 'x-api-key': 'id.secret' } }, res, () => assert.fail('should not call next'));

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
});
