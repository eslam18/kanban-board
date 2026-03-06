import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/server/db.js';
import { createApp } from '../src/server/index.js';
import { hashPasswordSync } from '../src/server/auth/password.js';
import { seedDefaultAdmin } from '../src/server/seed.js';

describe('invites api routes', () => {
  let dbApi;
  let app;
  let authHeader;

  function auth(testRequest) {
    return testRequest.set('Authorization', authHeader);
  }

  beforeEach(async () => {
    dbApi = createDatabase(':memory:');
    seedDefaultAdmin(dbApi);
    ({ app } = createApp(dbApi));

    const email = process.env.ADMIN_EMAIL || 'admin@qanat.local';
    const password = process.env.ADMIN_PASSWORD || 'changeme';

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    authHeader = `Bearer ${loginResponse.body.token}`;
  });

  afterEach(() => {
    dbApi.close();
  });

  it('admin can create, list, and delete invites', async () => {
    const created = await auth(request(app).post('/api/invites'))
      .send({ email: 'new.user@qanat.local', role: 'member' })
      .expect(201);

    expect(created.body.id).toBeTypeOf('number');
    expect(created.body.email).toBe('new.user@qanat.local');
    expect(created.body.role).toBe('member');
    expect(created.body.token).toBeTypeOf('string');
    expect(created.body.link).toBe(`/register?token=${created.body.token}`);

    const listed = await auth(request(app).get('/api/invites')).expect(200);

    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].id).toBe(created.body.id);
    expect(listed.body[0].email).toBe(created.body.email);

    await auth(request(app).delete(`/api/invites/${created.body.id}`)).expect(204);

    const afterDelete = await auth(request(app).get('/api/invites')).expect(200);
    expect(afterDelete.body).toEqual([]);
  });

  it('non-admin users are forbidden from invite endpoints', async () => {
    dbApi.db
      .prepare(
        `
          INSERT INTO users (email, password_hash, display_name, role, status)
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run('member.user@qanat.local', hashPasswordSync('memberpass123'), 'Member User', 'member', 'active');

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member.user@qanat.local', password: 'memberpass123' })
      .expect(200);

    const memberAuthHeader = `Bearer ${loginResponse.body.token}`;

    await request(app)
      .post('/api/invites')
      .set('Authorization', memberAuthHeader)
      .send({ email: 'blocked.user@qanat.local' })
      .expect(403);

    await request(app).get('/api/invites').set('Authorization', memberAuthHeader).expect(403);

    await request(app).delete('/api/invites/1').set('Authorization', memberAuthHeader).expect(403);
  });

  it('registers with valid invite token and marks invite accepted', async () => {
    const createdInvite = await auth(request(app).post('/api/invites'))
      .send({ email: 'invitee.user@qanat.local', role: 'member' })
      .expect(201);

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        token: createdInvite.body.token,
        password: 'welcome123',
        display_name: 'New User',
      })
      .expect(201);

    expect(registerResponse.body.user.email).toBe('invitee.user@qanat.local');
    expect(registerResponse.body.user.role).toBe('member');
    expect(registerResponse.body.user.password_hash).toBeUndefined();

    const acceptedInvite = dbApi.db
      .prepare('SELECT accepted_at FROM invites WHERE id = ?')
      .get(createdInvite.body.id);
    expect(acceptedInvite.accepted_at).toBeTruthy();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invitee.user@qanat.local', password: 'welcome123' })
      .expect(200);

    expect(loginResponse.body.token).toBeTypeOf('string');
  });

  it('rejects used and expired invite tokens', async () => {
    const createdInvite = await auth(request(app).post('/api/invites'))
      .send({ email: 'used.user@qanat.local', role: 'member' })
      .expect(201);

    await request(app)
      .post('/api/auth/register')
      .send({
        token: createdInvite.body.token,
        password: 'welcome123',
        display_name: 'Used User',
      })
      .expect(201);

    await request(app)
      .post('/api/auth/register')
      .send({
        token: createdInvite.body.token,
        password: 'newpassword123',
        display_name: 'Used Again',
      })
      .expect(400);

    dbApi.db
      .prepare(
        `
          INSERT INTO invites (email, token, invited_by, role, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run('expired.user@qanat.local', 'expired-token', null, 'member', '2000-01-01 00:00:00');

    await request(app)
      .post('/api/auth/register')
      .send({
        token: 'expired-token',
        password: 'welcome123',
        display_name: 'Expired User',
      })
      .expect(400);
  });
});
