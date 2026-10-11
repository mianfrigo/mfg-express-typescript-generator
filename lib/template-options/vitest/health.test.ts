import 'dotenv/config';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';

describe('app', () => {
  it('GET /api/v1/health is ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('unknown route is a JSON 404', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.statusCode).toBe(404);
  });
});
