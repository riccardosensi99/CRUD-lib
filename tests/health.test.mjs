import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-health-test';

async function requestJson(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });
}

async function requestStatus(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
}

test('GET /health always returns 200 and GET /ready reflects userRepo health', async () => {
  const { createLibrary, createServer } = await import('../dist/index.js');
  const { makeMemoryUserRepo } = await import('../dist/adapters/memory.js');

  const app = createServer();
  const lib = createLibrary({}, { userRepo: makeMemoryUserRepo() });
  app.use(lib.router);

  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));

    const health = await requestJson(server, '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    const ready = await requestJson(server, '/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.status, 'ok');
  } finally {
    server.close();
  }
});

test('GET /ready returns 503 when userRepo.count throws', async () => {
  const { createLibrary, createServer } = await import('../dist/index.js');

  const brokenUserRepo = {
    async count() { throw new Error('DB_DOWN'); },
    async findMany() { return []; },
    async findById() { return null; },
    async findByEmail() { return null; },
    async create(input) { return { id: 1, ...input }; },
    async update(_id, input) { return { id: 1, ...input }; },
    async delete() {},
    async updateMe(_id, input) { return { id: 1, ...input }; },
  };

  const app = createServer();
  const lib = createLibrary({}, { userRepo: brokenUserRepo });
  app.use(lib.router);

  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const ready = await requestJson(server, '/ready');
    assert.equal(ready.status, 503);
    assert.equal(ready.body.status, 'error');
  } finally {
    server.close();
  }
});

test('config.health = false disables the health routes', async () => {
  const { createLibrary, createServer } = await import('../dist/index.js');
  const { makeMemoryUserRepo } = await import('../dist/adapters/memory.js');

  const app = createServer();
  const lib = createLibrary({ health: false }, { userRepo: makeMemoryUserRepo() });
  app.use(lib.router);

  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const status = await requestStatus(server, '/health');
    assert.equal(status, 404);
  } finally {
    server.close();
  }
});
