import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// The data layer is mocked, so this test needs no database. Copy the pattern
// for your own protected routes.
vi.mock('../src/config/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
//{{refresh}}     refreshToken: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: (queries: unknown[]) => Promise.all(queries),
  },
  connectDb: vi.fn(),
  disconnectDb: vi.fn(),
}));

import app from '../src/app';
import { prisma } from '../src/config/prisma';

const user = {
  id: 'u1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: bcrypt.hashSync('password123', 4),
//{{roles}}   role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const login = (password: string) =>
  request(app).post('/api/v1/auth').send({ email: user.email, password });

describe('auth', () => {
  it('logs in with the right password and never returns the hash', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    const res = await login('password123');
    expect(res.status).toBe(200);
    expect(typeof res.body.authToken).toBe('string');
    expect(res.body.auth_user.password).toBeUndefined();
  });

  it('answers 401 for a wrong password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    const res = await login('not-the-password');
    expect(res.status).toBe(401);
  });

  it('protects /user: no token is 401, a token lists users', async () => {
    expect((await request(app).get('/api/v1/user')).status).toBe(401);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    const { authToken } = (await login('password123')).body;

    vi.mocked(prisma.user.findMany).mockResolvedValue([user] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);
    const res = await request(app)
      .get('/api/v1/user')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });
});
