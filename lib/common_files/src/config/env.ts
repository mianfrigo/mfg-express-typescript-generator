import 'dotenv/config';

// The only module that reads process.env. Every variable is checked once, when
// the app starts, and a bad value stops it with one message that lists them all.
// Add new variables here (and to .env.example and the README).
const problems: string[] = [];

const text = (name: string, fallback?: string) => {
  const value = process.env[name]?.trim() || fallback;
  if (value === undefined) {
    problems.push(`${name} is not set. Add it to your .env file.`);
  }
  return value ?? '';
};

const whole = (name: string, fallback: number, min: number) => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    problems.push(`${name} must be a whole number >= ${min} (got "${raw}")`);
    return fallback;
  }
  return value;
};

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];
const logLevel = text('LOG_LEVEL', 'info');
if (!LOG_LEVELS.includes(logLevel)) {
  problems.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')} (got "${logLevel}")`);
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  nodeEnv,
  production: nodeEnv === 'production',
  port: whole('PORT', 3000, 1),
  logLevel,
  // comma-separated, exact match
  corsOrigins: text('CORS_ORIGINS', 'http://localhost:3000,http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // reverse-proxy hops to trust; 0 trusts none
  trustProxy: whole('TRUST_PROXY', 0, 0),
//{{mongo}}   mongoUrl: text('MONGO_DB'),
//{{postgres}}   databaseUrl: text('DATABASE_URL'),
//{{auth}}   secretKey: text('SECRET_KEY'),
//{{refresh}}   accessTokenTtl: text('ACCESS_TOKEN_TTL', '15m'),
//{{refresh}}   refreshTokenDays: whole('REFRESH_TOKEN_TTL_DAYS', 30, 1),
};

//{{auth}} if (env.production && env.secretKey.length < 32) {
//{{auth}}   problems.push('SECRET_KEY must be at least 32 characters in production.');
//{{auth}} }

if (problems.length > 0) {
  throw new Error(`Invalid environment:\n- ${problems.join('\n- ')}`);
}
