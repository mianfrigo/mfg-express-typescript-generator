import { createHash, randomBytes, randomUUID } from 'crypto';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

// Short-lived access token + long-lived, rotating refresh token.
export const ACCESS_TTL = (process.env.ACCESS_TOKEN_TTL ??
  '15m') as jwt.SignOptions['expiresIn'];
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
const DAY_MS = 86_400_000;

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const invalid = () => new createHttpError.Unauthorized('Invalid refresh token');

async function issue(userId: string, familyId: string) {
  const refreshToken = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * DAY_MS);
  // expired rows are only dead weight: clear them as new ones are written
  await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.refreshToken.create({
    data: { tokenHash: sha256(refreshToken), userId, familyId, expiresAt },
  });
  return {
    refreshToken,
    refreshToken_exp: Math.floor(expiresAt.getTime() / 1000),
  };
}

// First token of a new session (login).
export const issueRefreshToken = (userId: string) =>
  issue(userId, randomUUID());

// Ends a whole session: the token and everything rotated from it.
async function revokeFamily(familyId: string) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Exchange a refresh token for a new access token and a new refresh token.
// A token works once. Presenting a spent one means a copy leaked, so the whole
// session is revoked.
export async function refreshSession(token: string) {
  const secret = process.env.SECRET_KEY;
  if (!secret) throw new Error('SECRET_KEY is not set');

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!record || record.expiresAt <= new Date()) throw invalid();

  // atomic: of two concurrent refreshes with the same token only one wins
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    await revokeFamily(record.familyId);
    throw invalid();
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw invalid();

  // same claims as login; the role is read again, so a promotion applies here
//{{!roles}}   const authToken = jwt.sign(
//{{!roles}}     { auth_id: user.id, email: user.email },
//{{!roles}}     secret,
//{{!roles}}     { expiresIn: ACCESS_TTL }
//{{!roles}}   );
//{{roles}}   const authToken = jwt.sign(
//{{roles}}     { auth_id: user.id, email: user.email, role: user.role },
//{{roles}}     secret,
//{{roles}}     { expiresIn: ACCESS_TTL }
//{{roles}}   );
  const { exp } = jwt.decode(authToken) as { exp: number };
  return {
    authToken,
    authToken_exp: exp,
    ...(await issue(String(user.id), record.familyId)),
  };
}

// Logout. Unknown or already-revoked tokens are fine: the result is the same.
export async function revokeSession(token: string) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (record) await revokeFamily(record.familyId);
}
