import assert from 'node:assert/strict';
import test from 'node:test';

function makeRes() {
  const res = {};
  res.statusCode = 200;
  res.headers = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('idempotent middleware replays the stored response for a repeated key without re-running the handler', async () => {
  const { makeMemoryIdempotencyStore } = await import('../dist/adapters/memory.js');
  const { idempotent } = await import('../dist/middleware/idempotent.js');

  const store = makeMemoryIdempotencyStore();
  const middleware = idempotent(store);

  let handlerCalls = 0;
  const handler = (req, res) => {
    handlerCalls += 1;
    res.status(201).json({ id: handlerCalls });
  };

  const req = { headers: { 'idempotency-key': 'key-1' } };

  const res1 = makeRes();
  await middleware(req, res1, () => handler(req, res1));
  assert.equal(handlerCalls, 1);
  assert.deepEqual(res1.body, { id: 1 });

  // Give the fire-and-forget store.set a tick to complete before replaying.
  await new Promise((resolve) => setImmediate(resolve));

  const res2 = makeRes();
  await middleware(req, res2, () => handler(req, res2));
  assert.equal(handlerCalls, 1, 'handler must not run again for a repeated idempotency key');
  assert.deepEqual(res2.body, { id: 1 });
  assert.equal(res2.statusCode, 201);
  assert.equal(res2.headers['Idempotent-Replay'], 'true');
});

test('idempotent middleware passes through requests without the header', async () => {
  const { makeMemoryIdempotencyStore } = await import('../dist/adapters/memory.js');
  const { idempotent } = await import('../dist/middleware/idempotent.js');

  const store = makeMemoryIdempotencyStore();
  const middleware = idempotent(store);

  let handlerCalls = 0;
  const req = { headers: {} };
  const res = makeRes();

  await middleware(req, res, () => { handlerCalls += 1; res.status(200).json({ ok: true }); });
  await middleware(req, res, () => { handlerCalls += 1; res.status(200).json({ ok: true }); });

  assert.equal(handlerCalls, 2, 'handler runs every time when no idempotency key is sent');
});

test('memory idempotency store expires records after ttlMs', async () => {
  const { makeMemoryIdempotencyStore } = await import('../dist/adapters/memory.js');

  const store = makeMemoryIdempotencyStore();
  await store.set('short-lived', { status: 200, body: { ok: true } }, 10);

  const immediate = await store.get('short-lived');
  assert.ok(immediate);

  await new Promise((resolve) => setTimeout(resolve, 20));
  const afterExpiry = await store.get('short-lived');
  assert.equal(afterExpiry, null);
});
