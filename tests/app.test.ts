import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('health endpoint', () => {
  it('returns the API health status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('does not expose the public registration route', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Admin', email: 'admin@example.com', password: 'secret' });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'RECURSO_NAO_ENCONTRADO',
    });
  });

  it('requires authentication to create a user', async () => {
    const response = await request(app).post('/api/v1/users').send({
      name: 'Secretary',
      email: 'secretary@example.com',
      password: 'secret',
      roles: ['secretary'],
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      statusCode: 401,
      error: 'NAO_AUTENTICADO',
    });
  });
});
