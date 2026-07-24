import assert from 'node:assert/strict';
import test from 'node:test';

function makeRes() {
  const res = {};
  res.headers = {};
  res.setHeader = (name, value) => { res.headers[name] = value; };
  return res;
}

test('requestId generates an id and reflects it in the response header when none is sent', async () => {
  const { requestId } = await import('../dist/middleware/requestId.js');

  const req = { headers: {} };
  const res = makeRes();
  let nextCalled = false;

  requestId()(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(typeof req.id, 'string');
  assert.ok(req.id.length > 0);
  assert.equal(res.headers['X-Request-Id'], req.id);
});

test('requestId reuses an incoming X-Request-Id header instead of generating a new one', async () => {
  const { requestId } = await import('../dist/middleware/requestId.js');

  const req = { headers: { 'x-request-id': 'incoming-id-123' } };
  const res = makeRes();

  requestId()(req, res, () => {});

  assert.equal(req.id, 'incoming-id-123');
  assert.equal(res.headers['X-Request-Id'], 'incoming-id-123');
});

test('requestId supports a custom header name', async () => {
  const { requestId } = await import('../dist/middleware/requestId.js');

  const req = { headers: { 'x-correlation-id': 'corr-1' } };
  const res = makeRes();

  requestId({ headerName: 'X-Correlation-Id' })(req, res, () => {});

  assert.equal(req.id, 'corr-1');
});
