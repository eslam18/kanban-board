import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/server/db.js';
import { createApp } from '../src/server/index.js';
import { seedDefaultAdmin } from '../src/server/seed.js';

describe('change password api routes', () => {
  let dbApi;
  let app;
  let authHeader;

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

  it('changes password and keeps existing JWT valid', async () => {
    const email = process.env.ADMIN_EMAIL || 'admin@qanat.local';
    const currentPassword = process.env.ADMIN_PASSWORD || 'changeme';
    const newPassword = 'new-password-123';

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', authHeader)
      .send({
        oldPassword: currentPassword,
        newPassword,
      })
      .expect(200);

    expect(response.body).toEqual({ ok: true });

    await request(app).get('/api/auth/me').set('Authorization', authHeader).expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email, password: currentPassword })
      .expect(401);

    await request(app)
      .post('/api/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
  });

  it('rejects wrong old password with 400', async () => {
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', authHeader)
      .send({
        oldPassword: 'wrong-password',
        newPassword: 'new-password-123',
      })
      .expect(400);
  });
});
