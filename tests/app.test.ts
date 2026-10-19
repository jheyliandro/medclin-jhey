import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('health endpoint', () => {
  it('returns the API health status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
