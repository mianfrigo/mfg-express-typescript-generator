import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// The data layer is mocked, so this test needs no database. Copy the pattern
// for your own protected routes.
const user = {
  _id: 'u1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: bcrypt.hashSync('password123', 4),
//{{roles}}   role: 'user',
  toObject() {
    return { ...this };
  },
};

// A Mongoose query: chainable, awaitable, and it has exec().
const query = (result: unknown) => {
  const q: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  for (const method of ['select', 'sort', 'skip', 'limit']) q[method] = () => q;
  q.exec = () => Promise.resolve(result);
  return q;
};

vi.mock('../src/models/user.schema', () => ({
  default: {
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));
//{{refresh}} vi.mock('../src/models/refreshToken.schema', () => ({
//{{refresh}}   default: { create: vi.fn() },
//{{refresh}} }));

import app from '../src/app';
import UserModel from '../src/models/user.schema';

const login = (password: string) =>
  request(app).post('/api/v1/auth').send({ email: user.email, password });

describe('auth', () => {
  it('logs in with the right password and never returns the hash', async () => {
    vi.mocked(UserModel.findOne).mockReturnValue(query(user) as never);
    const res = await login('password123');
    expect(res.status).toBe(200);
    expect(typeof res.body.authToken).toBe('string');
    expect(res.body.auth_user.password).toBeUndefined();
  });

  it('answers 401 for a wrong password', async () => {
    vi.mocked(UserModel.findOne).mockReturnValue(query(user) as never);
    const res = await login('not-the-password');
    expect(res.status).toBe(401);
  });

  it('protects /user: no token is 401, a token lists users', async () => {
    expect((await request(app).get('/api/v1/user')).status).toBe(401);

    vi.mocked(UserModel.findOne).mockReturnValue(query(user) as never);
    const { authToken } = (await login('password123')).body;

    vi.mocked(UserModel.find).mockReturnValue(query([user]) as never);
    vi.mocked(UserModel.countDocuments).mockReturnValue(query(1) as never);
    const res = await request(app)
      .get('/api/v1/user')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });
});
