import request from 'supertest';
import { buildApp, registerUser } from './helpers.js';

describe('POST /api/auth/register', () => {
  it('creates a USER account and returns tokens', async () => {
    const { app } = buildApp();
    const res = await registerUser(request, app);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('reader@example.com');
    expect(res.body.user.role).toBe('USER');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a duplicate email with 409 EMAIL_ALREADY_EXISTS', async () => {
    const { app } = buildApp();
    await registerUser(request, app);
    const res = await registerUser(request, app);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('rejects invalid input with 400 and field-level details', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const { app } = buildApp();
    await registerUser(request, app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reader@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('reader@example.com');
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('rejects wrong password with 401 INVALID_CREDENTIALS', async () => {
    const { app } = buildApp();
    await registerUser(request, app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reader@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with 401 INVALID_CREDENTIALS (no user enumeration)', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues a new token pair for a valid refresh token', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: registered.refreshToken });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('rejects an invalid refresh token with 401', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('requires a refreshToken in the body', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes a refresh token and responds 204', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);

    const res = await request(app).post('/api/auth/logout').send({ refreshToken: registered.refreshToken });
    expect(res.status).toBe(204);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user with a valid access token', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${registered.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('reader@example.com');
  });

  it('rejects a missing Authorization header with 401', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed access token with 401', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

describe('password reset and email verification when not configured', () => {
  it('POST /api/auth/password-reset/request responds 501 NOT_CONFIGURED', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/api/auth/password-reset/request').send({ email: 'reader@example.com' });
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('NOT_CONFIGURED');
  });

  it('POST /api/auth/email-verification/request responds 501 NOT_CONFIGURED', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/api/auth/email-verification/request').send({ email: 'reader@example.com' });
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('NOT_CONFIGURED');
  });
});
