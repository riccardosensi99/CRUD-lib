import assert from 'node:assert/strict';
import test from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-auth-extensions-test';

function createMemoryUserRepo() {
  const storedUsers = [];
  let nextId = 1;

  const publicUser = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: user.profile,
  });

  return {
    users: storedUsers,
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
        emailVerifiedAt: null,
        createdAt: now,
        updatedAt: now,
        profile: null,
      };
      storedUsers.push(user);
      return publicUser(user);
    },
    async updatePassword(id, passwordHash) {
      const user = storedUsers.find((item) => String(item.id) === String(id));
      if (!user) throw new Error('USER_NOT_FOUND');
      user.passwordHash = passwordHash;
      user.updatedAt = new Date().toISOString();
      return publicUser(user);
    },
    async markEmailVerified(id, verifiedAt = new Date()) {
      const user = storedUsers.find((item) => String(item.id) === String(id));
      if (!user) throw new Error('USER_NOT_FOUND');
      user.emailVerifiedAt = verifiedAt.toISOString();
      user.updatedAt = new Date().toISOString();
      return publicUser(user);
    },
  };
}

function createMemoryRefreshTokenRepo() {
  const records = new Map();

  return {
    records,
    async create(input) {
      records.set(input.id, { ...input, revokedAt: null, replacedByTokenId: null });
    },
    async findById(id) {
      const record = records.get(id);
      return record ? { ...record } : null;
    },
    async revoke(id, input = {}) {
      const record = records.get(id);
      if (!record) return;
      record.revokedAt = input.revokedAt ?? new Date();
      record.replacedByTokenId = input.replacedByTokenId ?? null;
    },
    async revokeFamily(familyId, input = {}) {
      for (const record of records.values()) {
        if (record.familyId === familyId) {
          record.revokedAt = input.revokedAt ?? new Date();
        }
      }
    },
  };
}

function createMemoryOneTimeTokenRepo() {
  const records = new Map();

  return {
    records,
    async create(input) {
      records.set(input.id, { ...input, usedAt: null, revokedAt: null });
    },
    async findById(id) {
      const record = records.get(id);
      return record ? { ...record } : null;
    },
    async markUsed(id, input = {}) {
      const record = records.get(id);
      if (!record) return;
      record.usedAt = input.usedAt ?? new Date();
    },
    async revoke(id, input = {}) {
      const record = records.get(id);
      if (!record) return;
      record.revokedAt = input.revokedAt ?? new Date();
    },
  };
}

function createMemoryOAuthAccountRepo() {
  const accounts = [];

  return {
    accounts,
    async findByProviderAccount(provider, providerAccountId) {
      return accounts.find((account) => account.provider === provider && account.providerAccountId === providerAccountId) ?? null;
    },
    async findByUserAndProvider(userId, provider) {
      return accounts.find((account) => String(account.userId) === String(userId) && account.provider === provider) ?? null;
    },
    async create(input) {
      accounts.push({ ...input });
      return input;
    },
  };
}

test('persistent refresh tokens rotate and reject replayed families', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const userRepo = createMemoryUserRepo();
  const refreshTokenRepo = createMemoryRefreshTokenRepo();
  const service = makeAuthService({ userRepo, refreshTokenRepo, passwordHashRounds: 4 });

  const registered = await service.registerUser({
    email: 'reader@example.com',
    password: 'password123',
    name: 'Reader',
  });

  const rotated = await service.refreshSession(registered.refreshToken);
  assert.equal(typeof rotated.refreshToken, 'string');
  assert.notEqual(rotated.refreshToken, registered.refreshToken);

  await assert.rejects(() => service.refreshSession(registered.refreshToken), /REFRESH_TOKEN_REPLAYED/);
  await assert.rejects(() => service.refreshSession(rotated.refreshToken), /REFRESH_TOKEN_REPLAYED/);
});

test('refresh token revocation blocks future refreshes', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const service = makeAuthService({
    userRepo: createMemoryUserRepo(),
    refreshTokenRepo: createMemoryRefreshTokenRepo(),
    passwordHashRounds: 4,
  });

  const registered = await service.registerUser({
    email: 'logout@example.com',
    password: 'password123',
  });

  await service.revokeRefreshToken(registered.refreshToken);
  await assert.rejects(() => service.refreshSession(registered.refreshToken), /REFRESH_TOKEN_REPLAYED/);
});

test('password reset uses one-time hashed tokens and updates credentials', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const userRepo = createMemoryUserRepo();
  const passwordResetTokenRepo = createMemoryOneTimeTokenRepo();
  let deliveredToken = '';

  const service = makeAuthService({
    userRepo,
    passwordResetTokenRepo,
    passwordHashRounds: 4,
    sendPasswordReset({ token }) {
      deliveredToken = token;
    },
  });

  await service.registerUser({
    email: 'reset@example.com',
    password: 'password123',
  });

  await service.requestPasswordReset({ email: 'reset@example.com' });
  assert.match(deliveredToken, /^[^.]+\.[^.]+$/);

  await service.confirmPasswordReset({ token: deliveredToken, password: 'newpassword123' });
  const loggedIn = await service.loginUser({ email: 'reset@example.com', password: 'newpassword123' });
  assert.equal(loggedIn.user.email, 'reset@example.com');

  await assert.rejects(
    () => service.confirmPasswordReset({ token: deliveredToken, password: 'anotherpass123' }),
    /INVALID_PASSWORD_RESET_TOKEN/,
  );
});

test('password reset rejects expired tokens', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const userRepo = createMemoryUserRepo();
  const passwordResetTokenRepo = createMemoryOneTimeTokenRepo();
  let deliveredToken = '';
  let now = new Date('2026-05-14T12:00:00.000Z');

  const service = makeAuthService({
    userRepo,
    passwordResetTokenRepo,
    passwordResetTtlMs: 1000,
    passwordHashRounds: 4,
    now: () => now,
    sendPasswordReset({ token }) {
      deliveredToken = token;
    },
  });

  await service.registerUser({
    email: 'expired-reset@example.com',
    password: 'password123',
  });

  await service.requestPasswordReset({ email: 'expired-reset@example.com' });
  now = new Date('2026-05-14T12:00:02.000Z');

  await assert.rejects(
    () => service.confirmPasswordReset({ token: deliveredToken, password: 'newpassword123' }),
    /INVALID_PASSWORD_RESET_TOKEN/,
  );
});

test('email verification confirms one-time tokens', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const userRepo = createMemoryUserRepo();
  const emailVerificationTokenRepo = createMemoryOneTimeTokenRepo();
  let deliveredToken = '';

  const service = makeAuthService({
    userRepo,
    emailVerificationTokenRepo,
    passwordHashRounds: 4,
    sendEmailVerification({ token }) {
      deliveredToken = token;
    },
  });

  await service.registerUser({
    email: 'verify@example.com',
    password: 'password123',
  });

  await service.requestEmailVerification({ email: 'verify@example.com' });
  const result = await service.confirmEmailVerification({ token: deliveredToken });

  assert.equal(result.user.email, 'verify@example.com');
  assert.ok(result.user.emailVerifiedAt);

  await assert.rejects(
    () => service.confirmEmailVerification({ token: deliveredToken }),
    /INVALID_EMAIL_VERIFICATION_TOKEN/,
  );
});

test('OAuth profiles link verified emails and reuse linked accounts', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const userRepo = createMemoryUserRepo();
  const oauthAccountRepo = createMemoryOAuthAccountRepo();
  const service = makeAuthService({ userRepo, oauthAccountRepo, passwordHashRounds: 4 });

  const existing = await service.registerUser({
    email: 'oauth@example.com',
    password: 'password123',
    name: 'OAuth User',
  });

  const linked = await service.signInWithOAuthProfile({
    provider: 'github',
    providerAccountId: '123',
    email: 'oauth@example.com',
    emailVerified: true,
    name: 'OAuth User',
  });

  assert.equal(linked.user.id, existing.user.id);
  assert.equal(oauthAccountRepo.accounts.length, 1);

  const reused = await service.signInWithOAuthProfile({
    provider: 'github',
    providerAccountId: '123',
  });
  assert.equal(reused.user.id, existing.user.id);
});

test('OAuth profiles can create new users without provider dependencies', async () => {
  const { makeAuthService } = await import('../dist/modules/auth/auth.service.js');
  const oauthAccountRepo = createMemoryOAuthAccountRepo();
  const service = makeAuthService({
    userRepo: createMemoryUserRepo(),
    oauthAccountRepo,
    passwordHashRounds: 4,
  });

  const result = await service.loginWithOAuthProfile({
    provider: 'google',
    providerAccountId: 'abc',
    email: 'new-oauth@example.com',
    emailVerified: true,
    name: 'New OAuth User',
  });

  assert.equal(result.user.email, 'new-oauth@example.com');
  assert.equal(result.user.role, 'USER');
  assert.equal(oauthAccountRepo.accounts[0].provider, 'google');
});
