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

test('makeMemoryRateLimiter allows up to `points` requests then blocks within the window', async () => {
  const { makeMemoryRateLimiter } = await import('../dist/adapters/memory.js');

  const limiter = makeMemoryRateLimiter({ points: 3, durationMs: 60_000 });

  const first = await limiter.consume('client-a');
  const second = await limiter.consume('client-a');
  const third = await limiter.consume('client-a');
  const fourth = await limiter.consume('client-a');

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, true);
  assert.equal(fourth.allowed, false);
  assert.ok(fourth.retryAfterMs > 0);
});

test('makeMemoryRateLimiter tracks separate keys independently', async () => {
  const { makeMemoryRateLimiter } = await import('../dist/adapters/memory.js');

  const limiter = makeMemoryRateLimiter({ points: 1, durationMs: 60_000 });

  const a1 = await limiter.consume('client-a');
  const b1 = await limiter.consume('client-b');
  const a2 = await limiter.consume('client-a');

  assert.equal(a1.allowed, true);
  assert.equal(b1.allowed, true);
  assert.equal(a2.allowed, false);
});

test('rateLimit middleware blocks with 429 and Retry-After once the limiter denies', async () => {
  const { makeMemoryRateLimiter } = await import('../dist/adapters/memory.js');
  const { rateLimit } = await import('../dist/middleware/rateLimit.js');

  const limiter = makeMemoryRateLimiter({ points: 1, durationMs: 60_000 });
  const middleware = rateLimit(limiter, { keyFn: () => 'fixed-key' });

  const req = { ip: '127.0.0.1' };

  const res1 = makeRes();
  let nextCalls = 0;
  await middleware(req, res1, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);

  const res2 = makeRes();
  await middleware(req, res2, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1, 'next must not be called once the limit is exceeded');
  assert.equal(res2.statusCode, 429);
  assert.ok(res2.headers['Retry-After']);
});

test('rateLimit middleware responds 500 instead of hanging when the limiter throws', async () => {
  const { rateLimit } = await import('../dist/middleware/rateLimit.js');

  const brokenLimiter = {
    async consume() { throw new Error('LIMITER_DOWN'); },
  };
  const middleware = rateLimit(brokenLimiter);

  const res = makeRes();
  await middleware({ ip: '127.0.0.1' }, res, () => assert.fail('should not call next'));

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
});
