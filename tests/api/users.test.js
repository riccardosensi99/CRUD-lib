import request from 'supertest';
import { buildApp, registerUser, loginAsAdmin } from './helpers.js';

describe('GET/PUT /api/users/me', () => {
  it('returns and updates the authenticated user profile', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);
    const auth = `Bearer ${registered.accessToken}`;

    const getRes = await request(app).get('/api/users/me').set('Authorization', auth);
    expect(getRes.status).toBe(200);
    expect(getRes.body.email).toBe('reader@example.com');

    const putRes = await request(app).put('/api/users/me').set('Authorization', auth).send({ name: 'New Name' });
    expect(putRes.status).toBe(200);
    expect(putRes.body.name).toBe('New Name');
  });

  it('rejects unauthenticated requests with 401', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users (admin list)', () => {
  it('rejects a non-admin user with 403', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${registered.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('lists users for an admin', async () => {
    const { app, userRepo } = buildApp();
    await registerUser(request, app);
    const { body: admin } = await loginAsAdmin(request, app, userRepo);

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('POST /api/users (admin create)', () => {
  it('creates a user as an admin', async () => {
    const { app, userRepo } = buildApp();
    const { body: admin } = await loginAsAdmin(request, app, userRepo);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'created@example.com', password: 'password123', role: 'USER' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('created@example.com');
  });

  it('rejects a non-admin with 403', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .send({ email: 'nope@example.com', password: 'password123' });

    expect(res.status).toBe(403);
  });

  it('rejects a duplicate email with 409', async () => {
    const { app, userRepo } = buildApp();
    const { body: admin } = await loginAsAdmin(request, app, userRepo);

    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'dup@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'dup@example.com', password: 'password123' });

    expect(res.status).toBe(409);
  });
});

describe('GET/PUT/DELETE /api/users/:id', () => {
  it('allows a user to read their own record via /:id', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);

    const res = await request(app)
      .get(`/api/users/${registered.user.id}`)
      .set('Authorization', `Bearer ${registered.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('reader@example.com');
  });

  it('rejects a user reading another user record with 403', async () => {
    const { app, userRepo } = buildApp();
    const { body: reader } = await registerUser(request, app);
    const { body: other } = await registerUser(request, app, { email: 'other@example.com' });
    void userRepo;

    const res = await request(app)
      .get(`/api/users/${other.user.id}`)
      .set('Authorization', `Bearer ${reader.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('allows an admin to update another user, including role', async () => {
    const { app, userRepo } = buildApp();
    const { body: registered } = await registerUser(request, app);
    const { body: admin } = await loginAsAdmin(request, app, userRepo);

    const res = await request(app)
      .put(`/api/users/${registered.user.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ADMIN');
  });

  it('rejects a non-admin trying to change their own role with 403', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);

    const res = await request(app)
      .put(`/api/users/${registered.user.id}`)
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for a missing user id', async () => {
    const { app, userRepo } = buildApp();
    const { body: admin } = await loginAsAdmin(request, app, userRepo);

    const res = await request(app).get('/api/users/999999').set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(404);
  });

  it('allows an admin to delete a user', async () => {
    const { app, userRepo } = buildApp();
    const { body: registered } = await registerUser(request, app);
    const { body: admin } = await loginAsAdmin(request, app, userRepo);

    const res = await request(app)
      .delete(`/api/users/${registered.user.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(204);

    const followUp = await request(app)
      .get(`/api/users/${registered.user.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(followUp.status).toBe(404);
  });
});

describe('POST /api/users/batch', () => {
  it('resolves multiple users in one call for an admin', async () => {
    const { app, userRepo } = buildApp();
    const { body: a } = await registerUser(request, app, { email: 'a@example.com' });
    const { body: b } = await registerUser(request, app, { email: 'b@example.com' });
    const { body: admin } = await loginAsAdmin(request, app, userRepo);

    const res = await request(app)
      .post('/api/users/batch')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ ids: [a.user.id, b.user.id, 999999] });

    expect(res.status).toBe(200);
    const emails = res.body.items.map((u) => u.email).sort();
    expect(emails).toEqual(['a@example.com', 'b@example.com']);
  });

  it('rejects a non-admin with 403', async () => {
    const { app } = buildApp();
    const { body: registered } = await registerUser(request, app);

    const res = await request(app)
      .post('/api/users/batch')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .send({ ids: [registered.user.id] });

    expect(res.status).toBe(403);
  });
});
