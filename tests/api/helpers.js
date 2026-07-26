import { createLibrary, createServer } from '../../dist/index.js';
import { makeMemoryUserRepo } from '../../dist/adapters/memory.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-jest-api-suite';

/** Builds a fresh Express app + in-memory UserRepo for a single test, so state never leaks across tests. */
export function buildApp(config = {}) {
  const userRepo = makeMemoryUserRepo();
  const app = createServer();
  const lib = createLibrary({ routesPrefix: '/api', ...config }, { userRepo });
  app.use(lib.router);
  return { app, userRepo };
}

/** Registers a user and returns the register response body, including tokens. */
export async function registerUser(request, app, overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'reader@example.com', password: 'password123', name: 'Reader', ...overrides });
  return res;
}

/** Registers an admin directly via the repo (self-registration always creates USER accounts) and returns a login response with tokens. */
export async function loginAsAdmin(request, app, userRepo) {
  const bcrypt = (await import('bcryptjs')).default;
  const passwordHash = await bcrypt.hash('adminpass123', 4);
  await userRepo.create({ email: 'admin@example.com', passwordHash, name: 'Admin', role: 'ADMIN' });
  return request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'adminpass123' });
}
