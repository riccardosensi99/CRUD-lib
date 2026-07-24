import assert from 'node:assert/strict';
import test from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-auth-service-test';

function createMemoryUserRepo() {
  const storedUsers = [];
  let nextId = 1;

  const publicUser = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: user.profile,
  });

  return {
    async findByEmail(email) {
      return storedUsers.find((user) => user.email === email) ?? null;
    },
    async findById(id) {
      const user = storedUsers.find((item) => String(item.id) === String(id));
      return user ? publicUser(user) : null;
    },
    async create(input) {
      const now = new Date().toISOString();
      const user = {
        id: nextId++,
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name ?? null,
        role: input.role ?? 'USER',
        createdAt: now,
        updatedAt: now,
        profile: null,
      };
      storedUsers.push(user);
      return publicUser(user);
    },
  };
}

test('auth service registers, logs in, refreshes, and reads me without Prisma', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const service = makeAuthService({ userRepo: createMemoryUserRepo(), passwordHashRounds: 4 });

  const registered = await service.registerUser({
    email: 'reader@example.com',
    password: 'password123',
    name: 'Reader',
  });

  assert.equal(registered.user.role, 'USER');
  assert.equal(typeof registered.accessToken, 'string');
  assert.equal(typeof registered.refreshToken, 'string');

  await assert.rejects(
    () => service.registerUser({ email: 'reader@example.com', password: 'password123' }),
    /EMAIL_TAKEN/,
  );

  const loggedIn = await service.loginUser({ email: 'reader@example.com', password: 'password123' });
  assert.equal(loggedIn.user.email, 'reader@example.com');
  assert.equal('passwordHash' in loggedIn.user, false);

  await assert.rejects(
    () => service.loginUser({ email: 'reader@example.com', password: 'wrong-password' }),
    /INVALID_CREDENTIALS/,
  );

  const refreshed = await service.refreshSession(registered.refreshToken);
  assert.equal(typeof refreshed.accessToken, 'string');
  assert.equal(typeof refreshed.refreshToken, 'string');

  const me = await service.getMe(registered.user.id);
  assert.equal(me?.email, 'reader@example.com');
});

test('auth service lifecycle hooks fire on register and login', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');

  const created = [];
  const loginAttempts = [];
  const loginSuccesses = [];

  const service = makeAuthService({
    userRepo: createMemoryUserRepo(),
    passwordHashRounds: 4,
    onUserCreated: (user) => created.push(user.email),
    beforeLogin: ({ email }) => loginAttempts.push(email),
    onLoginSuccess: (user) => loginSuccesses.push(user.email),
  });

  await service.registerUser({ email: 'hooked@example.com', password: 'password123' });
  assert.deepEqual(created, ['hooked@example.com']);

  await service.loginUser({ email: 'hooked@example.com', password: 'password123' });
  assert.deepEqual(loginAttempts, ['hooked@example.com']);
  assert.deepEqual(loginSuccesses, ['hooked@example.com']);

  await assert.rejects(
    () => service.loginUser({ email: 'hooked@example.com', password: 'wrong' }),
    /INVALID_CREDENTIALS/,
  );
  assert.deepEqual(loginAttempts, ['hooked@example.com', 'hooked@example.com']);
  assert.deepEqual(loginSuccesses, ['hooked@example.com']);
});

test('beforeLogin can abort a login attempt', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const userRepo = createMemoryUserRepo();
  const service = makeAuthService({
    userRepo,
    passwordHashRounds: 4,
    beforeLogin: () => {
      throw new Error('ACCOUNT_LOCKED');
    },
  });

  await service.registerUser({ email: 'locked@example.com', password: 'password123' });

  await assert.rejects(
    () => service.loginUser({ email: 'locked@example.com', password: 'password123' }),
    /ACCOUNT_LOCKED/,
  );
});

test('onLoginSuccess errors do not fail the login', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const service = makeAuthService({
    userRepo: createMemoryUserRepo(),
    passwordHashRounds: 4,
    onLoginSuccess: () => {
      throw new Error('NOTIFY_FAILED');
    },
  });

  await service.registerUser({ email: 'resilient@example.com', password: 'password123' });
  const loggedIn = await service.loginUser({ email: 'resilient@example.com', password: 'password123' });
  assert.equal(loggedIn.user.email, 'resilient@example.com');
});
