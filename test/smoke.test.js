import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const rootPkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const tmp = mkdtempSync(path.join(os.tmpdir(), 'gen-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const gen = (name, flags = []) => {
  const dir = path.join(tmp, name);
  const r = spawnSync(process.execPath, [bin, dir, ...flags], {
    encoding: 'utf8',
    env: { ...process.env, HOME: tmp, USERPROFILE: tmp }, // never read the developer's ~/.mfgrc.json
  });
  return { dir, r };
};
const read = (dir, f) => readFileSync(path.join(dir, f), 'utf8');
const pkg = (dir) => JSON.parse(read(dir, 'package.json'));
const has = (dir, f) => existsSync(path.join(dir, f));

test('base app', () => {
  const { dir, r } = gen('base', ['--yes', '--no-install']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stderr.includes('DEP0190'), 'no shell+args deprecation warning');
  for (const f of ['src/index.ts', 'src/db/data.ts', '.gitignore', '.env']) {
    assert.ok(has(dir, f), `missing ${f}`);
  }
  const p = pkg(dir);
  assert.equal(p.name, 'base');
  assert.equal(p.dependencies.mongoose, undefined);
  assert.equal(p.dependencies['express-rate-limit'], undefined);
  const routes = read(dir, 'src/routes/index.ts');
  assert.ok(!routes.includes('auth') && !routes.includes('{{auth}}'));
  assert.ok(!read(dir, 'src/routes/user.route.ts').includes('limiter'));
});

test('limiter', () => {
  const { dir, r } = gen('limiter', ['--yes', '--no-install', '--limiter']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(has(dir, 'src/middleware/limiters.ts'));
  assert.ok(read(dir, 'src/routes/user.route.ts').includes('mainLimiter'));
  assert.ok(pkg(dir).dependencies['express-rate-limit']);
});

test('mongo', () => {
  const { dir, r } = gen('mongo', ['--yes', '--no-install', '--mongo']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(has(dir, 'src/models/user.schema.ts'));
  assert.ok(pkg(dir).dependencies.mongoose);
  assert.match(read(dir, '.env'), /^MONGO_DB=/m);
  assert.ok(!read(dir, 'src/controllers/user.controller.ts').includes('rxjs'));
});

test('mongo + auth', () => {
  const { dir, r } = gen('auth', ['--yes', '--no-install', '--mongo', '--auth']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(has(dir, 'src/routes/auth.route.ts'));
  assert.ok(has(dir, 'src/controllers/auth.controller.ts'));
  const routes = read(dir, 'src/routes/index.ts');
  assert.ok(routes.includes("import authRoute from './auth.route';"));
  assert.ok(routes.includes("router.use('/auth', authRoute);"));
  assert.ok(!routes.includes('{{auth}}'));
  assert.ok(pkg(dir).dependencies.jsonwebtoken);
  assert.match(read(dir, '.env'), /^SECRET_KEY=[0-9a-f]{64}$/m);
});

test('mongo + rxjs', () => {
  const { dir, r } = gen('rxjs', ['--yes', '--no-install', '--mongo', '--rxjs']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(pkg(dir).dependencies.rxjs);
  assert.ok(read(dir, 'src/controllers/user.controller.ts').includes('rxjs'));
});

test('--auth without --mongo exits 1', () => {
  const { r } = gen('bad', ['--yes', '--no-install', '--auth']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--mongo/);
});

test('existing directory exits 1', () => {
  gen('twice', ['--yes', '--no-install']);
  const { r } = gen('twice', ['--yes', '--no-install']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already exists/);
});

test('no TTY and no --yes uses defaults and does not hang', () => {
  const { dir, r } = gen('notty', ['--no-install']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(has(dir, 'src/index.ts'));
});

test('--version prints package version', () => {
  const r = spawnSync(process.execPath, [bin, '--version'], {
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes(rootPkg.version));
});

const allTs = (dir) =>
  readdirSync(path.join(dir, 'src'), { recursive: true })
    .filter((f) => f.endsWith('.ts'))
    .map((f) => read(dir, path.join('src', f)))
    .join('\n');

test('generated app uses tsc + tsx, no webpack', () => {
  const { dir, r } = gen('stack', ['--yes', '--no-install']);
  assert.equal(r.status, 0, r.stderr);
  const p = pkg(dir);
  assert.equal(p.scripts.build, 'tsc');
  assert.equal(p.scripts.dev, 'tsx watch src/index.ts');
  for (const f of ['webpack.config.js', 'webpack.dev.config.js', '.eslintrc.json']) {
    assert.ok(!has(dir, f), `${f} should be gone`);
  }
  assert.ok(has(dir, 'eslint.config.mjs'));
  assert.ok(!read(dir, 'tsconfig.json').includes('strictNullChecks'));
  assert.match(read(dir, '.gitignore'), /^\.env$/m);
});

test('templates avoid removed/unsafe patterns', () => {
  const { dir, r } = gen('clean', [
    '--yes',
    '--no-install',
    '--mongo',
    '--auth',
    '--limiter',
  ]);
  assert.equal(r.status, 0, r.stderr);
  const ts = allTs(dir);
  for (const bad of [
    'auto-bind',
    'autoBind',
    'requiered',
    'useNewUrlParser',
    'mongoose-unique-validator',
    '...req.body',
    "'process.env.SECRET_KEY'",
    ': any',
    'new: true',
  ]) {
    assert.ok(!ts.includes(bad), `found ${bad}`);
  }
  assert.ok(ts.includes("typeof email !== 'string'"), 'auth must validate input type');
  assert.ok(ts.includes("err.name === 'CastError'"), 'CastError must map to 400');
  assert.ok(ts.includes('11000'), 'duplicate key must map to 409');
  assert.ok(ts.includes('limit: 100'), 'rate-limit v8 option name');
});

// compiled middleware, real jwt: no MongoDB needed
function checkRequireAuth(dir) {
  const code = `
    const jwt = require('jsonwebtoken');
    const { requireAuth } = require('./dist/middleware/auth.js');
    const run = (h) => { let out; requireAuth({ header: () => h }, {}, (e) => { out = e ? e.status : 'ok'; }); return out; };
    const good = 'Bearer ' + jwt.sign({ a: 1 }, process.env.SECRET_KEY);
    console.log(JSON.stringify([run(undefined), run('Bearer nope'), run(good), run('Basic abc')]));`;
  const r = spawnSync(process.execPath, ['-e', code], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, SECRET_KEY: 'x'.repeat(48) },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '[401,401,"ok",401]');
}

// compiled validate middleware + schemas, no MongoDB needed
function checkValidate(dir, flags) {
  const mongo = flags.includes('--mongo') || flags.includes('--postgres'); // camelCase db schemas
  const good = mongo
    ? { firstName: 'Ada', lastName: 'L', email: 'a@b.co', extra: 1 }
    : { first_name: 'Ada', last_name: 'L', email: 'a@b.co', extra: 1 };
  const code = `
    const { validate } = require('./dist/middleware/validate.js');
    const { createUserSchema } = require('./dist/validation/user.validation.js');
    const mw = validate(createUserSchema);
    const run = (body) => { const req = { body }; let err; mw(req, {}, (e) => { err = e; }); return { err, body: req.body }; };
    const ok = run(${JSON.stringify(good)});
    const bad = run({ email: 'nope' });
    const out = {
      okPasses: !ok.err,
      stripsUnknown: !('extra' in ok.body),
      badStatus: bad.err && bad.err.status,
      badNamesField: !!bad.err && bad.err.message.includes('email'),
    };
    if (${JSON.stringify(flags.includes('--auth'))}) {
      const { loginSchema } = require('./dist/validation/auth.validation.js');
      const r = loginSchema.safeParse({ email: { $ne: null }, password: 'x' });
      out.rejectsObjectEmail = !r.success;
    }
    console.log(JSON.stringify(out));`;
  const r = spawnSync(process.execPath, ['-e', code], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim());
  assert.equal(out.okPasses, true);
  assert.equal(out.stripsUnknown, true);
  assert.equal(out.badStatus, 400);
  assert.equal(out.badNamesField, true);
  if (flags.includes('--auth')) assert.equal(out.rejectsObjectEmail, true);
}

// compiled spec module: structure only, no server or MongoDB needed
function checkOpenapiDoc(dir, flags) {
  const r = spawnSync(
    process.execPath,
    ['-e', "console.log(JSON.stringify(require('./dist/openapi.js').openapiDocument))"],
    { cwd: dir, encoding: 'utf8' }
  );
  assert.equal(r.status, 0, r.stderr);
  const doc = JSON.parse(r.stdout.trim());
  assert.equal(doc.openapi, '3.1.0');
  for (const p of ['/health', '/user', '/user/{id}']) assert.ok(doc.paths[p], p);
  assert.ok(doc.paths['/user/{id}'].put.requestBody, 'update schema documented');
  if (flags.includes('--auth')) {
    assert.ok(doc.paths['/auth'].post.requestBody);
    assert.ok(doc.paths['/auth/register'].post.requestBody);
    assert.ok(doc.components.securitySchemes.bearerAuth);
    assert.deepEqual(doc.paths['/auth'].post.security, []);
  } else {
    assert.equal(doc.paths['/auth'], undefined);
  }
}

// Real PostgreSQL (POSTGRES_URL, e.g. a CI service container): apply the
// committed migration, boot the compiled app, then drive CRUD/auth over HTTP.
async function checkDbCrud(dir, flags, adminUrl) {
  const auth = flags.includes('--auth');
  const zod = flags.includes('--zod');
  const kind = flags.includes('--postgres') ? 'postgres' : 'mongo';
  const dbName = 't_' + Math.random().toString(16).slice(2, 10);
  let env;
  const win = process.platform === 'win32'; // one string: no shell+args warning
  const run = (cmd, extra) =>
    win
      ? spawnSync(cmd, { cwd: dir, encoding: 'utf8', env, shell: true, ...extra })
      : spawnSync(cmd.split(' ')[0], cmd.split(' ').slice(1), { cwd: dir, encoding: 'utf8', env, ...extra });
  if (kind === 'postgres') {
    const mk = spawnSync(
      process.execPath,
      [
        '-e',
        `const { Client } = require('pg');
         (async () => {
           const c = new Client({ connectionString: process.env.ADMIN_URL });
           await c.connect();
           await c.query('CREATE DATABASE "${dbName}"');
           await c.end();
         })().catch((e) => { console.error(e); process.exit(1); });`,
      ],
      { cwd: dir, encoding: 'utf8', env: { ...process.env, ADMIN_URL: adminUrl } }
    );
    assert.equal(mk.status, 0, mk.stderr);
    const url = new URL(adminUrl);
    url.pathname = '/' + dbName;
    env = { ...process.env, DATABASE_URL: url.toString() };
    const dep = run('npm run db:deploy');
    assert.equal(dep.status, 0, `db:deploy\n${dep.stdout}\n${dep.stderr}`);
  } else {
    env = { ...process.env, MONGO_DB: `${adminUrl.replace(/\/$/, '')}/${dbName}` };
  }

  // seed twice: must be idempotent
  for (let i = 0; i < 2; i++) {
    const seed = run('npm run db:seed');
    assert.equal(seed.status, 0, `db:seed run ${i + 1}\n${seed.stdout}\n${seed.stderr}`);
  }

  const port = await freePort();
  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: dir,
    env: { ...env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // keep the app's own output so a boot failure says why, not just "false"
  let appOutput = '';
  child.stdout.on('data', (d) => (appOutput += d));
  child.stderr.on('data', (d) => (appOutput += d));
  let earlyExit = null;
  const exited = new Promise((resolve) =>
    child.on('exit', (code) => {
      earlyExit = code;
      resolve(code);
    })
  );
  const base = `http://127.0.0.1:${port}/api/v1`;
  try {
    let up = false;
    let lastSeen = 'no response';
    // up to ~60 s: the first connection to a service container can be slow on CI
    for (let i = 0; i < 240 && !up && earlyExit === null; i++) {
      try {
        const res = await fetch(`${base}/health`);
        lastSeen = `HTTP ${res.status}`;
        up = res.status === 200;
      } catch (e) {
        lastSeen = String((e && e.cause && e.cause.code) || (e && e.message));
      }
      if (!up) await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(
      up,
      `app did not boot against ${kind} (exit code: ${earlyExit}, port ${port}, last: ${lastSeen}). Output:\n${appOutput.slice(-3000)}`
    );
    assert.equal((await fetch(`${base}/ready`)).status, 200, 'ready with a live db');

    const call = async (method, p, body, token) => {
      const res = await fetch(base + p, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    };

    let token;
    let selfId;
    const missing = kind === 'mongo' ? '0'.repeat(24) : 'does-not-exist';
    const idOf = (o) => o.id ?? o._id;
    if (auth) {
      const seeded = await call('POST', '/auth', { email: 'ada@example.com', password: 'password123' });
      assert.equal(seeded.status, 200, 'a seeded user can log in');
      const reg = await call('POST', '/auth/register', {
        firstName: 'Reg', lastName: 'User', email: 'reg@x.co', password: 'password123',
      });
      assert.equal(reg.status, 201);
      assert.equal(reg.body.password, undefined, 'hash never returned');
      const bad = await call('POST', '/auth', { email: 'reg@x.co', password: 'wrong-password' });
      assert.equal(bad.status, 401);
      const login = await call('POST', '/auth', { email: 'reg@x.co', password: 'password123' });
      assert.equal(login.status, 200);
      assert.ok(login.body.authToken);
      assert.equal(login.body.auth_user.password, undefined);
      token = login.body.authToken;
      selfId = idOf(login.body.auth_user);
      assert.equal((await call('GET', '/user')).status, 401, 'user routes need a token');
      const long = await call('POST', '/auth/register', {
        firstName: 'L', lastName: 'L', email: 'long@x.co', password: 'x'.repeat(73),
      });
      assert.equal(long.status, 400, 'bcrypt would silently cut a password at 72 bytes');
      if (flags.includes('--roles')) {
        // writes below need an admin; the plain-user cases are in the roles scenario
        const adminLogin = await call('POST', '/auth', { email: 'admin@example.com', password: 'password123' });
        assert.equal(adminLogin.status, 200);
        token = adminLogin.body.authToken;
      }
    }

    const seededList = await call('GET', '/user', undefined, token);
    assert.equal(seededList.status, 200);
    for (const e of ['ada@example.com', 'grace@example.com', 'alan@example.com']) {
      assert.equal(seededList.body.data.filter((u) => u.email === e).length, 1, `${e} seeded exactly once`);
    }

    const made = await call('POST', '/user', { firstName: 'Ada', lastName: 'L', email: 'ada@x.co', extra: 1 }, token);
    assert.equal(made.status, 201);
    assert.ok(idOf(made.body));
    assert.equal(made.body.password, undefined);
    assert.equal(made.body.extra, undefined);

    const dup = await call('POST', '/user', { firstName: 'Ada', lastName: 'L', email: 'ada@x.co' }, token);
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.message, 'Resource already exists');

    const list = await call('GET', '/user', undefined, token);
    assert.equal(list.status, 200);
    assert.ok(list.body.data.some((u) => u.email === 'ada@x.co'));
    assert.ok(list.body.data.every((u) => u.password === undefined));
    assert.ok(list.body.meta.total >= 4);

    const p1 = await call('GET', '/user?limit=2&page=1', undefined, token);
    const p2 = await call('GET', '/user?limit=2&page=2', undefined, token);
    assert.equal(p1.body.data.length, 2);
    assert.ok(p2.body.data.length >= 1);
    assert.equal(p1.body.meta.limit, 2);
    assert.ok(p1.body.meta.totalPages >= 2);
    const ids = [...p1.body.data, ...p2.body.data].map(idOf);
    assert.equal(new Set(ids).size, ids.length, 'pages do not overlap');

    const one = await call('GET', `/user/${idOf(made.body)}`, undefined, token);
    assert.equal(one.status, 200);
    assert.equal(one.body.email, 'ada@x.co');
    assert.equal((await call('GET', `/user/${missing}`, undefined, token)).status, 404);

    // with --auth a user may only change themself (an admin may change anyone)
    const asAdmin = flags.includes('--roles');
    const target = auth && !asAdmin ? selfId : idOf(made.body);
    const upd = await call('PUT', `/user/${target}`, { firstName: 'Grace' }, token);
    assert.equal(upd.status, 200);
    assert.equal(upd.body.firstName, 'Grace');
    if (auth && !asAdmin) {
      assert.equal((await call('PUT', `/user/${idOf(made.body)}`, { firstName: 'X' }, token)).status, 403);
    }
    assert.equal(
      (await call('PUT', `/user/${missing}`, { firstName: 'X' }, token)).status,
      auth && !asAdmin ? 403 : 404
    );

    if (kind === 'mongo') {
      const bad = await call('GET', '/user/not-an-object-id', undefined, token);
      assert.equal(bad.status, 400, 'malformed ObjectId is a 400');
    }

    if (zod) {
      const inv = await call('POST', '/user', { firstName: 'Z', lastName: 'Z', email: 'not-an-email' }, token);
      assert.equal(inv.status, 400);
      assert.match(inv.body.error.message, /email/);
    }

    assert.equal((await call('DELETE', `/user/${idOf(made.body)}`, undefined, token)).status, 200);
    assert.equal((await call('DELETE', `/user/${idOf(made.body)}`, undefined, token)).status, 404);

    if (flags.includes('--roles')) {
      const decode = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
      const loginAs = async (email) => {
        const r = await call('POST', '/auth', { email, password: 'password123' });
        assert.equal(r.status, 200, `login ${email}`);
        return r.body;
      };
      const user = await loginAs('reg@x.co');
      assert.equal(decode(user.authToken).role, 'user', 'a registered user is a plain user');
      assert.equal(user.auth_user.role, 'user');
      const admin = await loginAs('admin@example.com');
      assert.equal(decode(admin.authToken).role, 'admin', 'the seeded admin');

      const victim = await call('POST', '/user', { firstName: 'V', lastName: 'V', email: 'victim@x.co' }, admin.authToken);
      assert.equal(victim.status, 201);
      const vid = idOf(victim.body);

      // a plain user can neither create, change, delete nor promote other users
      assert.equal((await call('POST', '/user', { firstName: 'N', lastName: 'N', email: 'n@x.co' }, user.authToken)).status, 403);
      assert.equal((await call('PUT', `/user/${vid}`, { firstName: 'Z' }, user.authToken)).status, 403);
      assert.equal((await call('DELETE', `/user/${vid}`, undefined, user.authToken)).status, 403);
      assert.equal((await call('PATCH', `/user/${vid}/role`, { role: 'admin' }, user.authToken)).status, 403);
      // the role cannot be set through the normal write routes, not even on yourself
      const sneaky = await call('PUT', `/user/${idOf(user.auth_user)}`, { firstName: 'V', role: 'admin' }, user.authToken);
      assert.equal(sneaky.status, 200);
      assert.equal(sneaky.body.role, 'user', 'PUT must ignore role');

      assert.equal((await call('PATCH', `/user/${vid}/role`, { role: 'root' }, admin.authToken)).status, 400);
      assert.equal((await call('PATCH', `/user/${missing}/role`, { role: 'admin' }, admin.authToken)).status, 404);

      // promote the registered user: the next login carries the new role
      const promoted = await call('PATCH', `/user/${idOf(user.auth_user)}/role`, { role: 'admin' }, admin.authToken);
      assert.equal(promoted.status, 200);
      assert.equal(promoted.body.role, 'admin');
      assert.equal(promoted.body.password, undefined, 'no hash in the response');
      const again = await loginAs('reg@x.co');
      assert.equal(decode(again.authToken).role, 'admin');
      assert.equal((await call('DELETE', `/user/${vid}`, undefined, again.authToken)).status, 200);
    }

    if (flags.includes('--refresh-tokens')) {
      const decode = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
      const login = await call('POST', '/auth', { email: 'ada@example.com', password: 'password123' });
      assert.equal(login.status, 200);
      assert.equal(typeof login.body.refreshToken, 'string');
      assert.ok(login.body.refreshToken_exp > Date.now() / 1000, 'exp is epoch seconds in the future');
      const ttl = decode(login.body.authToken).exp - decode(login.body.authToken).iat;
      assert.equal(ttl, 15 * 60, 'access token is short lived');

      const rotated = await call('POST', '/auth/refresh', { refreshToken: login.body.refreshToken });
      assert.equal(rotated.status, 200);
      assert.notEqual(rotated.body.refreshToken, login.body.refreshToken, 'refresh token rotates');
      assert.equal((await call('GET', '/user', undefined, rotated.body.authToken)).status, 200);
      if (flags.includes('--roles')) assert.equal(decode(rotated.body.authToken).role, 'user');

      // replaying the spent token is theft: it fails and kills the whole family
      assert.equal((await call('POST', '/auth/refresh', { refreshToken: login.body.refreshToken })).status, 401);
      assert.equal((await call('POST', '/auth/refresh', { refreshToken: rotated.body.refreshToken })).status, 401);

      assert.equal((await call('POST', '/auth/refresh', { refreshToken: 'garbage' })).status, 401);
      assert.equal((await call('POST', '/auth/refresh', {})).status, 400);

      // logout ends the session and is idempotent
      const again = await call('POST', '/auth', { email: 'ada@example.com', password: 'password123' });
      const out = await fetch(base + '/auth/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: again.body.refreshToken }),
      });
      assert.equal(out.status, 204);
      assert.equal((await call('POST', '/auth/refresh', { refreshToken: again.body.refreshToken })).status, 401);
      const out2 = await fetch(base + '/auth/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: again.body.refreshToken }),
      });
      assert.equal(out2.status, 204, 'logout twice is fine');

      // a refreshed token carries the current role
      if (flags.includes('--roles')) {
        const admin = await call('POST', '/auth', { email: 'admin@example.com', password: 'password123' });
        const r = await call('POST', '/auth/refresh', { refreshToken: admin.body.refreshToken });
        assert.equal(r.status, 200);
        assert.equal(decode(r.body.authToken).role, 'admin');
      }
    }

    if (process.platform !== 'win32') {
      child.kill('SIGTERM');
      assert.equal(await exited, 0, 'graceful exit disconnects prisma');
    }
  } finally {
    child.kill('SIGKILL');
  }
}

// The CI workflow's env block must be enough to run the app's own tests:
// delete .env (not in the repo), then run npm test with only those variables.
function checkCiEnv(dir) {
  const yml = readFileSync(path.join(dir, '.github/workflows/ci.yml'), 'utf8')
    .split('\r\n')
    .join('\n'); // templates are CRLF in Windows checkouts
  const block = yml.split('\n    env:\n')[1].split('\n    steps:')[0];
  const ciEnv = Object.fromEntries(
    block
      .split('\n')
      .map((l) => l.match(/^ {6}(\w+): '?(.+?)'?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]])
  );
  assert.ok(Object.keys(ciEnv).length >= 2, 'env block parsed');
  rmSync(path.join(dir, '.env'));
  const win = process.platform === 'win32';
  const opts = { cwd: dir, encoding: 'utf8', env: { ...process.env, ...ciEnv } };
  const r = win
    ? spawnSync('npm test', { ...opts, shell: true })
    : spawnSync('npm', ['test'], opts);
  assert.equal(r.status, 0, `npm test without .env\n${r.stdout}\n${r.stderr}`);
}

// A port that is already taken must fail loudly (Express 5 passes the bind error
// to the listen callback), not log "connected" and sit idle.
async function checkPortInUse(dir) {
  // same wildcard bind the app uses (a 127.0.0.1-only bind would not conflict on Windows)
  const blocker = createServer((_q, res) => res.end('someone else')).listen(0);
  await once(blocker, 'listening');
  const port = blocker.address().port;
  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: dir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  try {
    const exit = await Promise.race([
      new Promise((resolve) => child.on('exit', (code) => resolve(code))),
      new Promise((resolve) => setTimeout(() => resolve('still running'), 15000)),
    ]);
    assert.equal(exit, 1, `app must exit 1 when its port is taken, got ${exit}. Output:\n${out}`);
    assert.match(out, /EADDRINUSE|address already in use/i);
    assert.ok(!out.includes('connected to port'), 'must not claim success');
  } finally {
    child.kill('SIGKILL');
    blocker.close();
  }
}

// an OS-assigned free port: no random-range collisions between test runs
async function freePort() {
  const srv = createServer().listen(0);
  await once(srv, 'listening');
  const { port } = srv.address();
  await new Promise((resolve) => srv.close(resolve));
  return port;
}

// The committed migration is the one prisma would generate for the schema (so
// "prisma migrate dev" does not immediately want a new migration).
function checkMigrationMatchesSchema(dir) {
  const prismaCli = path.join(dir, 'node_modules', 'prisma', 'build', 'index.js');
  const r = spawnSync(
    process.execPath,
    [prismaCli, 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'],
    { cwd: dir, encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'postgresql://x:y@localhost:5432/z' } }
  );
  assert.equal(r.status, 0, r.stderr);
  const norm = (sql) =>
    sql
      .replace(/\r\n/g, '\n')
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('-- ') && !l.includes('CREATE SCHEMA'))
      .map((l) => l.trim())
      .join('\n');
  const mig = readdirSync(path.join(dir, 'prisma/migrations')).find((m) => m.endsWith('_init'));
  const committed = readFileSync(path.join(dir, 'prisma/migrations', mig, 'migration.sql'), 'utf8');
  assert.equal(norm(committed), norm(r.stdout), 'committed migration matches the schema');
}

// boots the compiled base app, hits /health, then SIGTERM must exit 0
async function checkHealthAndShutdown(dir, openapi = false) {
  const port = await freePort();
  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: dir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));
  let earlyExit = null;
  const exited = new Promise((resolve) =>
    child.on('exit', (code) => {
      earlyExit = code;
      resolve(code);
    })
  );
  try {
    let body;
    let last = 'no response';
    // up to ~60 s; sleep after EVERY failed attempt (a non-200 used to spin)
    for (let i = 0; i < 240 && !body && earlyExit === null; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        last = `HTTP ${res.status}`;
        if (res.status === 200) {
          body = await res.json();
          break;
        }
      } catch (e) {
        last = String((e && e.cause && e.cause.code) || (e && e.message));
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(
      body,
      `app did not answer /health (last: ${last}, exit code: ${earlyExit}, port ${port}).\nstdout:\n${stdout.slice(-2000)}\nstderr:\n${stderr.slice(-2000)}`
    );
    assert.deepEqual(body, { status: 'ok' });
    const ready = await fetch(`http://127.0.0.1:${port}/api/v1/ready`);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: 'ready' });
    const api = `http://127.0.0.1:${port}/api/v1`;
    const paged = await (await fetch(`${api}/user?limit=5&page=2`)).json();
    assert.equal(paged.data.length, 5);
    assert.equal(paged.data[0].id, 6, 'page 2 of 5 starts at user 6');
    assert.deepEqual(paged.meta, { page: 2, limit: 5, total: 20, totalPages: 4 });
    const clamp = await (await fetch(`${api}/user?limit=1000&page=0`)).json();
    assert.equal(clamp.meta.limit, 100, 'limit is capped');
    assert.equal(clamp.meta.page, 1, 'page is at least 1');
    const junk = await (await fetch(`${api}/user?limit=abc&page=xyz`)).json();
    assert.deepEqual([junk.meta.limit, junk.meta.page], [20, 1], 'junk falls back to defaults');
    const past = await (await fetch(`${api}/user?page=99`)).json();
    assert.equal(past.data.length, 0);
    assert.equal(past.meta.total, 20);
    assert.match(stdout, /connected to port/, 'logs go to stdout');
    assert.ok(!existsSync(path.join(dir, 'logs')), 'no log files are written');
    if (openapi) {
      const base = `http://127.0.0.1:${port}/api/v1`;
      const spec = await (await fetch(`${base}/openapi.json`)).json();
      assert.equal(spec.openapi, '3.1.0');
      const create = spec.paths['/user'].post.requestBody.content['application/json'].schema;
      assert.ok(create.properties.first_name, 'request schema comes from zod');
      assert.ok(create.required.includes('email'));
      const docs = await fetch(`${base}/docs/`);
      assert.equal(docs.status, 200);
      assert.match(await docs.text(), /swagger-ui/);
      const init = await fetch(`${base}/docs/swagger-ui-init.js`);
      assert.equal(init.status, 200);
    }
    if (process.platform !== 'win32') {
      child.kill('SIGTERM'); // win32 has no signal delivery to handlers
      assert.equal(await exited, 0, 'graceful exit code');
    }
  } finally {
    child.kill('SIGKILL');
  }
}

const MATRIX = {
  'full-base': [],
  'full-limiter': ['--limiter'],
  'full-mongo': ['--mongo'],
  'full-auth': ['--mongo', '--auth'],
  'full-rxjs': ['--mongo', '--rxjs'],
  'full-test': ['--test'],
  'full-postgres': ['--postgres'],
  'full-postgres-auth-rxjs': ['--postgres', '--auth', '--rxjs', '--zod', '--openapi'],
  'full-ci': ['--ci', '--postgres', '--auth', '--test'],
  'full-ci-mongo': ['--ci', '--mongo', '--auth', '--test'],
  'full-pnpm': ['--pm', 'pnpm'],
  'full-pnpm-postgres': ['--pm', 'pnpm', '--postgres', '--auth', '--zod', '--test'],
  'full-yarn-postgres': ['--pm', 'yarn', '--postgres', '--auth', '--test'],
  'full-mongo-roles': ['--mongo', '--auth', '--roles', '--zod', '--openapi'],
  'full-postgres-roles': ['--postgres', '--auth', '--roles', '--zod', '--openapi', '--test'],
  'full-postgres-roles-rxjs': ['--postgres', '--auth', '--roles', '--rxjs'],
  'full-mongo-roles-rxjs': ['--mongo', '--auth', '--roles', '--rxjs', '--limiter'],
  'full-mongo-refresh': ['--mongo', '--auth', '--refresh-tokens', '--zod', '--openapi', '--test'],
  'full-postgres-refresh': ['--postgres', '--auth', '--refresh-tokens', '--zod', '--openapi'],
  'full-postgres-refresh-roles-rxjs': ['--postgres', '--auth', '--roles', '--refresh-tokens', '--rxjs', '--limiter'],
  'full-pnpm-postgres-roles-refresh': ['--pm', 'pnpm', '--postgres', '--auth', '--roles', '--refresh-tokens', '--zod'],
  'full-mongo-refresh-roles-rxjs': ['--mongo', '--auth', '--roles', '--refresh-tokens', '--rxjs'],
  'full-zod': ['--zod'],
  'full-openapi': ['--zod', '--openapi'],
  'full-openapi-auth': ['--zod', '--openapi', '--mongo', '--auth'],
  'full-zod-mongo-auth': ['--zod', '--mongo', '--auth'],
  'full-all': ['--mongo', '--auth', '--rxjs', '--limiter', '--test', '--docker', '--zod', '--openapi'],
  'full-postgres-all': ['--postgres', '--auth', '--limiter', '--zod', '--openapi', '--test', '--docker'],
};

const pmAvailable = (pm) => {
  const r = process.platform === 'win32'
    ? spawnSync(`${pm} --version`, { shell: true, encoding: 'utf8' })
    : spawnSync(pm, ['--version'], { encoding: 'utf8' });
  return r.status === 0;
};
const pmOf = (flags) => (flags.includes('--pm') ? flags[flags.indexOf('--pm') + 1] : 'npm');

// run "<pm> run build" etc. with the project's own package manager
const pmRun = (pm, args, cwd) => {
  const win = process.platform === 'win32';
  const opts = { cwd, encoding: 'utf8' };
  const r = win
    ? spawnSync([pm, ...args].join(' '), { ...opts, shell: true })
    : spawnSync(pm, args, opts);
  assert.equal(r.status, 0, `${pm} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
};

const npm = (args, cwd) => {
  const win = process.platform === 'win32';
  const r = win
    ? spawnSync(['npm', ...args].join(' '), { cwd, encoding: 'utf8', shell: true })
    : spawnSync('npm', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `npm ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
};

for (const [name, flags] of Object.entries(MATRIX)) {
  test(
    `FULL: ${name} installs, builds, lints`,
    {
      skip: !process.env.FULL
        ? true
        : !pmAvailable(pmOf(flags)) && `${pmOf(flags)} is not installed`,
      timeout: 600_000,
    },
    async () => {
      const pm = pmOf(flags);
      const { dir, r } = gen(name, ['--yes', ...flags]); // runs the real install
      assert.equal(r.status, 0, r.stderr);
      pmRun(pm, ['run', 'build'], dir);
      pmRun(pm, ['run', 'lint'], dir);
      if (flags.includes('--test')) pmRun(pm, ['test'], dir);
      if (flags.includes('--zod')) checkValidate(dir, flags);
      if (flags.includes('--openapi')) checkOpenapiDoc(dir, flags);
      if (flags.includes('--postgres')) checkMigrationMatchesSchema(dir);
      if (process.env.POSTGRES_URL && flags.includes('--postgres')) {
        await checkDbCrud(dir, flags, process.env.POSTGRES_URL);
      }
      if (process.env.MONGO_URL && flags.includes('--mongo')) {
        await checkDbCrud(dir, flags, process.env.MONGO_URL);
      }
      // last: it deletes .env
      if (flags.includes('--ci') && flags.includes('--test')) checkCiEnv(dir);
      if (flags.includes('--auth')) checkRequireAuth(dir);
      if (name === 'full-base' || name === 'full-openapi') {
        await checkHealthAndShutdown(dir, flags.includes('--openapi'));
      }
      if (name === 'full-base') await checkPortInUse(dir);
    }
  );
}

test('error handler hides internals on 5xx and duplicate-key', () => {
  const { dir, r } = gen('errs', ['--yes', '--no-install', '--mongo']);
  assert.equal(r.status, 0, r.stderr);
  const h = read(dir, 'src/middleware/errorHandler.ts');
  assert.ok(h.includes('statusCode >= 500'), 'generic message for 5xx');
  assert.ok(h.includes("'Internal Server Error'"));
  assert.ok(h.includes('statusCode === 409'), 'fixed message for duplicate key');
});

test('cors allow-list matches exact origins and never errors', () => {
  const { dir, r } = gen('cors', ['--yes', '--no-install']);
  assert.equal(r.status, 0, r.stderr);
  const c = read(dir, 'src/config/config.ts');
  assert.ok(c.includes('allowed.includes(origin)'));
  assert.ok(!c.includes('origin.includes(host)'), 'no substring matching');
  assert.ok(!c.includes("header('host')"), 'no Host fallback');
  assert.ok(!c.includes('new Error('), 'rejection must not become a 500');
});

for (const [name, flags] of [
  ['auth-promise', ['--mongo', '--auth']],
  ['auth-rxjs', ['--mongo', '--auth', '--rxjs']],
]) {
  test(`${name}: register route, hashed password, dummy hash compare`, () => {
    const { dir, r } = gen(name, ['--yes', '--no-install', ...flags]);
    assert.equal(r.status, 0, r.stderr);
    const ctl = read(dir, 'src/controllers/auth.controller.ts');
    assert.ok(read(dir, 'src/routes/auth.route.ts').includes("'/register'"));
    assert.ok(ctl.includes('registerUser'));
    assert.ok(ctl.includes('bcrypt.hash('));
    assert.ok(ctl.includes('DUMMY_HASH'));
    assert.ok(!ctl.includes("?? ''"), 'compare must not short-circuit on empty hash');
  });
}

test('in-memory create rejects an empty body with 400, not 500', () => {
  const { dir, r } = gen('emptybody', ['--yes', '--no-install']);
  assert.equal(r.status, 0, r.stderr);
  const c = read(dir, 'src/controllers/user.controller.ts');
  assert.ok(c.includes('req.body ?? {}'));
  assert.ok(c.includes('BadRequest'));
});

test('cd hint is relative to the current directory for nested targets', () => {
  const r = spawnSync(
    process.execPath,
    [bin, path.join('nested', 'app'), '--yes', '--no-install'],
    { encoding: 'utf8', cwd: tmp }
  );
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes(`cd ${path.join('nested', 'app')}`), r.stdout);
});

test('failed install says files were generated and how to recover', () => {
  const dir = path.join(tmp, 'failinstall');
  const r = spawnSync(process.execPath, [bin, dir, '--yes'], {
    encoding: 'utf8',
    env: { ...process.env, PATH: '', Path: '' },
  });
  assert.equal(r.status, 1);
  assert.ok(has(dir, 'package.json'), 'files stay on disk');
  assert.match(r.stderr, /generated/);
  assert.match(r.stderr, /install/);
});

test('routes: /health is public, /user guarded only with --auth', () => {
  const base = gen('hard-base', ['--yes', '--no-install']);
  assert.equal(base.r.status, 0, base.r.stderr);
  const br = read(base.dir, 'src/routes/index.ts');
  assert.ok(br.includes("'/health'"));
  assert.ok(br.includes("router.use('/user', userRoute);"));
  assert.ok(!br.includes('requireAuth'));
  assert.ok(!has(base.dir, 'src/middleware/auth.ts'));

  const auth = gen('hard-auth', ['--yes', '--no-install', '--mongo', '--auth']);
  assert.equal(auth.r.status, 0, auth.r.stderr);
  const ar = read(auth.dir, 'src/routes/index.ts');
  assert.ok(ar.includes("'/health'"));
  assert.ok(ar.includes("router.use('/user', requireAuth, userRoute);"));
  assert.ok(!ar.includes("router.use('/user', userRoute);"));
  assert.ok(!ar.includes('{{'));
  assert.ok(has(auth.dir, 'src/middleware/auth.ts'));
});

test('index handles SIGTERM/SIGINT; mongo app disconnects on shutdown', () => {
  const base = gen('shut-base', ['--yes', '--no-install']);
  const bi = read(base.dir, 'src/index.ts');
  assert.ok(bi.includes('SIGTERM') && bi.includes('SIGINT'));
  const mongo = gen('shut-mongo', ['--yes', '--no-install', '--mongo']);
  const mi = read(mongo.dir, 'src/index.ts');
  assert.ok(mi.includes('SIGTERM') && mi.includes('disconnectMongo'));
  assert.ok(read(mongo.dir, 'src/config/mongodb.config.ts').includes('disconnectMongo'));
});

test('auth middleware fails at boot without SECRET_KEY', () => {
  const { dir } = gen('boot-secret', ['--yes', '--no-install', '--mongo', '--auth']);
  const m = read(dir, 'src/middleware/auth.ts');
  assert.ok(m.includes('SECRET_KEY is not set'));
  assert.ok(m.includes("algorithms: ['HS256']"));
});

test('--docker adds Dockerfile and .dockerignore; absent otherwise', () => {
  const on = gen('dock-on', ['--yes', '--no-install', '--docker']);
  assert.equal(on.r.status, 0, on.r.stderr);
  const df = read(on.dir, 'Dockerfile');
  assert.ok(df.includes('AS build') && df.includes('USER node'));
  assert.ok(df.includes('npm run build'));
  const di = read(on.dir, '.dockerignore');
  for (const p of ['.env', 'node_modules', 'dist', 'logs', '.git']) {
    assert.match(di, new RegExp('^' + p.replace('.', '\.') + '$', 'm'));
  }
  const off = gen('dock-off', ['--yes', '--no-install']);
  assert.ok(!has(off.dir, 'Dockerfile') && !has(off.dir, '.dockerignore'));
});

test('app.ts is split from index.ts so tests never open a port', () => {
  const { dir, r } = gen('split', ['--yes', '--no-install']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(read(dir, 'src/app.ts').includes('export default app'));
  assert.ok(!read(dir, 'src/app.ts').includes('listen('));
  const idx = read(dir, 'src/index.ts');
  assert.ok(idx.includes("from './app'") && idx.includes('.listen('));
});

test('--test adds vitest + supertest, a test script and an example test', () => {
  const on = gen('test-on', ['--yes', '--no-install', '--test']);
  assert.equal(on.r.status, 0, on.r.stderr);
  const p = pkg(on.dir);
  assert.equal(p.scripts.test, 'vitest run');
  assert.ok(p.devDependencies.vitest && p.devDependencies.supertest);
  assert.ok(p.devDependencies['@types/supertest']);
  const t = read(on.dir, 'test/health.test.ts');
  assert.ok(t.includes("from '../src/app'") && t.includes('/api/v1/health'));
  const off = gen('test-off', ['--yes', '--no-install']);
  assert.equal(pkg(off.dir).scripts.test, undefined);
  assert.ok(!has(off.dir, 'test'));
});

const hasGit = spawnSync('git', ['--version']).status === 0;

test('invalid project name is rejected before anything is written', () => {
  const { dir, r } = gen('Bad Name', ['--yes', '--no-install']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /name/i);
  assert.ok(!has(dir, 'package.json'));
});

test('git: initialised by default, skipped by --no-git', { skip: !hasGit }, () => {
  const on = gen('git-on', ['--yes', '--no-install']);
  assert.ok(has(on.dir, '.git'));
  const off = gen('git-off', ['--yes', '--no-install', '--no-git']);
  assert.ok(!has(off.dir, '.git'));
});

test('git: not nested inside an existing repo unless --git', { skip: !hasGit }, () => {
  const parent = path.join(tmp, 'outer');
  mkdirSync(path.join(parent, '.git'), { recursive: true });
  const run1 = spawnSync(process.execPath, [bin, 'inner', '--yes', '--no-install'], { encoding: 'utf8', cwd: parent });
  assert.equal(run1.status, 0, run1.stderr);
  assert.ok(!has(path.join(parent, 'inner'), '.git'), 'no nested repo');
  const run2 = spawnSync(process.execPath, [bin, 'inner2', '--yes', '--no-install', '--git'], { encoding: 'utf8', cwd: parent });
  assert.equal(run2.status, 0, run2.stderr);
  assert.ok(has(path.join(parent, 'inner2'), '.git'), '--git forces');
});

test('--here scaffolds into an empty current directory only', () => {
  const empty = path.join(tmp, 'here-empty');
  mkdirSync(empty);
  const ok = spawnSync(process.execPath, [bin, '--here', '--yes', '--no-install'], { encoding: 'utf8', cwd: empty });
  assert.equal(ok.status, 0, ok.stderr);
  assert.ok(has(empty, 'src/index.ts'));
  assert.equal(pkg(empty).name, 'here-empty');

  const full = path.join(tmp, 'here-full');
  mkdirSync(full);
  writeFileSync(path.join(full, 'keep.txt'), 'x');
  const bad = spawnSync(process.execPath, [bin, '--here', '--yes', '--no-install'], { encoding: 'utf8', cwd: full });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /empty/);
  assert.ok(!has(full, 'package.json'));
});

test('release: changelog top entry matches package.json version', () => {
  const log = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  const top = log.match(/^## \[?(\d+\.\d+\.\d+)\]?/m);
  assert.ok(top, 'CHANGELOG has a version heading');
  assert.equal(top[1], rootPkg.version);
});

test('release workflow: tag must match version, tests gate, provenance on', () => {
  const wf = readFileSync(
    new URL('../.github/workflows/release.yml', import.meta.url),
    'utf8'
  );
  assert.match(wf, /tags:\s*\n\s*- 'v\*'/);
  assert.ok(wf.includes('GITHUB_REF_NAME'), 'tag/version comparison');
  assert.ok(wf.includes('npm test'));
  assert.ok(wf.includes('--provenance'));
  assert.ok(wf.includes('id-token: write'));
  assert.ok(wf.includes('secrets.NPM_TOKEN'));
});

test('pinned versions are exact (no ranges) so FULL results are reproducible', async () => {
  const { pinned } = await import('../lib/generate.js');
  const all = pinned();
  assert.ok(all.express && all.typescript && all.mongoose);
  for (const [name, v] of Object.entries(all)) {
    assert.match(v, /^\d+\.\d+\.\d+$/, `${name} must be pinned exactly`);
  }
});

test('package.json repository.url is already in normalized git+https form', () => {
  assert.match(
    rootPkg.repository.url,
    /^git\+https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/
  );
});

test('--zod (in-memory): validate middleware + snake_case schemas wired into routes', () => {
  const { dir, r } = gen('zod-base', ['--yes', '--no-install', '--zod']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(pkg(dir).dependencies.zod);
  assert.ok(has(dir, 'src/middleware/validate.ts'));
  const schema = read(dir, 'src/validation/user.validation.ts');
  assert.ok(schema.includes('first_name') && !schema.includes('firstName'));
  const route = read(dir, 'src/routes/user.route.ts');
  assert.ok(route.includes('validate(createUserSchema)'));
  assert.ok(route.includes('validate(updateUserSchema)'));
  assert.ok(!has(dir, 'src/validation/auth.validation.ts'));
});

test('--zod (mongo + auth + limiter): camelCase schemas, auth schemas, no marker left', () => {
  const { dir, r } = gen('zod-all', ['--yes', '--no-install', '--zod', '--mongo', '--auth', '--limiter']);
  assert.equal(r.status, 0, r.stderr);
  const schema = read(dir, 'src/validation/user.validation.ts');
  assert.ok(schema.includes('firstName') && !schema.includes('first_name'));
  assert.ok(has(dir, 'src/validation/auth.validation.ts'));
  const auth = read(dir, 'src/routes/auth.route.ts');
  assert.ok(auth.includes('validate(loginSchema)'));
  assert.ok(auth.includes('validate(registerSchema)'));
  assert.ok(read(dir, 'src/routes/user.route.ts').includes('mainLimiter, validate(createUserSchema)'));
  assert.ok(!allTs(dir).includes('{{'), 'no template marker left');
});

test('without --zod: no zod dependency, files or validate calls', () => {
  const { dir, r } = gen('zod-off', ['--yes', '--no-install', '--mongo', '--auth']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(pkg(dir).dependencies.zod, undefined);
  assert.ok(!has(dir, 'src/middleware/validate.ts'));
  assert.ok(!has(dir, 'src/validation'));
  const ts = allTs(dir);
  assert.ok(!ts.includes('validate(') && !ts.includes('{{'));
});

test('--openapi without --zod exits 1', () => {
  const { r } = gen('openapi-nozod', ['--yes', '--no-install', '--openapi']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--zod/);
});

test('--openapi (in-memory): swagger ui + spec built from the zod schemas', () => {
  const { dir, r } = gen('openapi-base', ['--yes', '--no-install', '--zod', '--openapi']);
  assert.equal(r.status, 0, r.stderr);
  const p = pkg(dir);
  assert.ok(p.dependencies['swagger-ui-express']);
  assert.ok(p.devDependencies['@types/swagger-ui-express']);
  const app = read(dir, 'src/app.ts');
  assert.ok(app.includes("from 'swagger-ui-express'"));
  assert.ok(app.includes('/api/v1/openapi.json'));
  assert.ok(app.includes("'/api/v1/docs'"));
  const spec = read(dir, 'src/openapi.ts');
  assert.ok(spec.includes('z.toJSONSchema(schema)'));
  assert.ok(spec.includes("'/user/{id}'"));
  assert.ok(!spec.includes('/auth') && !spec.includes('bearerAuth'));
  assert.ok(!allTs(dir).includes('{{'));
});

test('--openapi with --auth documents login, register and the bearer scheme', () => {
  const { dir, r } = gen('openapi-auth', ['--yes', '--no-install', '--zod', '--openapi', '--mongo', '--auth']);
  assert.equal(r.status, 0, r.stderr);
  const spec = read(dir, 'src/openapi.ts');
  for (const s of ["'/auth'", "'/auth/register'", 'bearerAuth', 'loginSchema', 'registerSchema']) {
    assert.ok(spec.includes(s), s);
  }
  assert.ok(!allTs(dir).includes('{{'));
});

test('without --openapi: app.ts has no swagger and no openapi.ts', () => {
  const { dir, r } = gen('openapi-off', ['--yes', '--no-install', '--zod']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!read(dir, 'src/app.ts').includes('swagger'));
  assert.ok(!has(dir, 'src/openapi.ts'));
  assert.equal(pkg(dir).dependencies['swagger-ui-express'], undefined);
});

test('--mongo and --postgres together exit 1', () => {
  const { r } = gen('both-db', ['--yes', '--no-install', '--mongo', '--postgres']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--postgres/);
});

test('--postgres: prisma schema, config, migration, compose, env, scripts, deps', () => {
  const { dir, r } = gen('pg-base', ['--yes', '--no-install', '--postgres']);
  assert.equal(r.status, 0, r.stderr);
  const schema = read(dir, 'prisma/schema.prisma');
  assert.ok(schema.includes('moduleFormat = "cjs"') && schema.includes('model User'));
  assert.ok(schema.includes('email     String   @unique'));
  assert.ok(has(dir, 'prisma.config.ts'));
  const migs = readdirSync(path.join(dir, 'prisma/migrations'));
  const init = migs.find((m) => m.endsWith('_init'));
  assert.ok(init, 'initial migration present');
  assert.ok(read(dir, `prisma/migrations/${init}/migration.sql`).includes('CREATE TABLE "User"'));
  assert.match(read(dir, 'prisma/migrations/migration_lock.toml'), /provider = "postgresql"/);
  assert.ok(read(dir, 'docker-compose.yml').includes('postgres:17'));
  const env = read(dir, '.env');
  assert.match(env, /^DATABASE_URL=postgresql:\/\//m);
  assert.ok(!env.includes('MONGO_DB'));
  const p = pkg(dir);
  for (const d of ['@prisma/client', '@prisma/adapter-pg', 'pg']) assert.ok(p.dependencies[d], d);
  for (const d of ['prisma', '@types/pg']) assert.ok(p.devDependencies[d], d);
  assert.equal(p.dependencies.mongoose, undefined);
  assert.equal(p.scripts.postinstall, 'prisma generate');
  assert.equal(p.scripts['db:migrate'], 'prisma migrate dev');
  assert.equal(p.scripts['db:deploy'], 'prisma migrate deploy');
  assert.match(read(dir, '.gitignore'), /^src\/generated$/m);
  const ts = allTs(dir);
  assert.ok(ts.includes('prisma.user') && !ts.includes('mongoose'));
  assert.ok(read(dir, 'src/middleware/errorHandler.ts').includes('P2002'));
});

test('--postgres with auth, rxjs, zod, openapi, limiter, test: prisma controllers, no markers', () => {
  const { dir, r } = gen('pg-all', [
    '--yes', '--no-install', '--postgres', '--auth', '--rxjs', '--zod', '--openapi', '--limiter', '--test',
  ]);
  assert.equal(r.status, 0, r.stderr);
  const auth = read(dir, 'src/controllers/auth.controller.ts');
  assert.ok(auth.includes('prisma.user') && auth.includes('rxjs'));
  assert.ok(read(dir, 'src/controllers/user.controller.ts').includes('prisma.user'));
  assert.ok(read(dir, 'src/validation/user.validation.ts').includes('firstName'));
  assert.ok(read(dir, 'src/routes/index.ts').includes('requireAuth, userRoute'));
  const ts = allTs(dir);
  assert.ok(!ts.includes('{{') && !ts.includes('mongoose'));
});

test('--mongo output has no prisma files', () => {
  const { dir, r } = gen('mongo-noprisma', ['--yes', '--no-install', '--mongo']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!has(dir, 'prisma') && !has(dir, 'prisma.config.ts'));
  assert.ok(!read(dir, 'docker-compose.yml').includes('postgres'), 'mongo compose is mongo only');
  assert.equal(pkg(dir).scripts.postinstall, undefined);
});

test('.env.example documents variables without leaking the secret', () => {
  const { dir, r } = gen('envex', ['--yes', '--no-install', '--mongo', '--auth']);
  assert.equal(r.status, 0, r.stderr);
  const ex = read(dir, '.env.example');
  assert.match(ex, /^PORT=3000$/m);
  assert.match(ex, /^MONGO_DB=/m);
  assert.match(ex, /^CORS_ORIGINS=/m);
  assert.match(ex, /^SECRET_KEY=$/m, 'secret is blank in the example');
  assert.ok(!/[0-9a-f]{64}/.test(ex), 'no real secret in the example');
  assert.match(read(dir, '.env'), /^SECRET_KEY=[0-9a-f]{64}$/m);
  assert.ok(!/^\.env\.example$/m.test(read(dir, '.gitignore')), '.env.example is committable');
});

test('production defaults: CORS_ORIGINS, stdout logging, TRUST_PROXY, quiet morgan', () => {
  const { dir, r } = gen('prod', ['--yes', '--no-install', '--docker']);
  assert.equal(r.status, 0, r.stderr);
  const cfg = read(dir, 'src/config/config.ts');
  assert.ok(cfg.includes('process.env.CORS_ORIGINS'));
  assert.ok(cfg.includes('allowed.includes(origin)'));
  assert.ok(cfg.includes('return null;'), 'morgan output is suppressed (logger prints once)');
  const log = read(dir, 'src/config/logger.config.ts');
  assert.ok(log.includes('new transports.Console()'));
  assert.ok(!log.includes('transports.File') && !log.includes('./logs/'));
  assert.ok(log.includes('LOG_LEVEL') && log.includes("NODE_ENV === 'production'"));
  const app = read(dir, 'src/app.ts');
  assert.ok(app.includes('TRUST_PROXY') && app.includes("'trust proxy'"));
  assert.ok(!read(dir, 'Dockerfile').includes('chown'), 'no log-dir workaround needed');
  assert.match(read(dir, '.env'), /^CORS_ORIGINS=/m);
});

test('/ready: always ok without a db, pings the db otherwise', () => {
  const base = gen('ready-base', ['--yes', '--no-install']);
  const br = read(base.dir, 'src/routes/index.ts');
  assert.ok(br.includes("'/ready'") && br.includes('503'));
  assert.ok(!br.includes('mongoose') && !br.includes('prisma'));

  const mongo = gen('ready-mongo', ['--yes', '--no-install', '--mongo']);
  const mr = read(mongo.dir, 'src/routes/index.ts');
  assert.ok(mr.includes("import mongoose from 'mongoose'"));
  assert.ok(mr.includes('mongoose.connection.readyState'));
  assert.ok(!mr.includes('prisma'));

  const pg = gen('ready-pg', ['--yes', '--no-install', '--postgres']);
  const pr = read(pg.dir, 'src/routes/index.ts');
  assert.ok(pr.includes('prisma.$queryRaw'));
  assert.ok(!pr.includes('mongoose'));
  assert.ok(!allTs(pg.dir).includes('{{'));
});

test('/ready is documented when --openapi is on', () => {
  const { dir, r } = gen('ready-oa', ['--yes', '--no-install', '--zod', '--openapi']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(read(dir, 'src/openapi.ts').includes("'/ready'"));
});

test('README reflects the chosen options', () => {
  const base = gen('readme-base', ['--yes', '--no-install']);
  const b = read(base.dir, 'README.md');
  assert.ok(b.includes('/health') && b.includes('/ready') && b.includes('CORS_ORIGINS'));
  for (const absent of ['db:deploy', 'MONGO_DB', 'DATABASE_URL', 'SECRET_KEY', 'docker build', 'npm test', '/docs']) {
    assert.ok(!b.includes(absent), `base README must not mention ${absent}`);
  }
  assert.ok(!b.includes('{{'));

  const pg = gen('readme-pg', ['--yes', '--no-install', '--postgres', '--auth', '--zod', '--openapi', '--test', '--docker']);
  const p = read(pg.dir, 'README.md');
  for (const present of ['db:deploy', 'db:migrate', 'docker compose up', 'DATABASE_URL', 'SECRET_KEY', '/auth/register', '/docs', 'npm test', 'docker build']) {
    assert.ok(p.includes(present), `postgres README should mention ${present}`);
  }
  assert.ok(!p.includes('MONGO_DB') && !p.includes('{{'));

  const mongo = gen('readme-mongo', ['--yes', '--no-install', '--mongo']);
  const m = read(mongo.dir, 'README.md');
  assert.ok(m.includes('MONGO_DB') && !m.includes('DATABASE_URL') && !m.includes('db:deploy'));
});

test('--ci (plain app): lint, build; no services, no test step', () => {
  const { dir, r } = gen('ci-base', ['--yes', '--no-install', '--ci']);
  assert.equal(r.status, 0, r.stderr);
  const y = read(dir, '.github/workflows/ci.yml');
  assert.match(y, /^name: ci$/m);
  assert.ok(y.includes('actions/checkout@') && y.includes('actions/setup-node@'));
  assert.ok(y.includes('npm run lint') && y.includes('npm run build'));
  for (const absent of ['services:', 'DATABASE_URL', 'SECRET_KEY', 'npm test', '{{']) {
    assert.ok(!y.includes(absent), `plain CI must not contain ${absent}`);
  }
  assert.ok(read(dir, 'README.md').includes('.github/workflows/ci.yml'));
});

test('--ci (postgres + auth + test): service container, env, npm test', () => {
  const { dir, r } = gen('ci-pg', ['--yes', '--no-install', '--ci', '--postgres', '--auth', '--test']);
  assert.equal(r.status, 0, r.stderr);
  const y = read(dir, '.github/workflows/ci.yml');
  assert.ok(y.includes('image: postgres:17-alpine') && y.includes('pg_isready'));
  assert.match(y, /^ {6}DATABASE_URL: postgresql:\/\/postgres:postgres@localhost:5432\/postgres$/m);
  assert.match(y, /^ {6}SECRET_KEY: \S{32,}$/m);
  assert.ok(y.includes('npm test') && !y.includes('{{'));
  // indentation sanity: spaces only, even depth
  for (const line of y.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))) {
    assert.match(line, /^( {2})*\S/, `bad indent: ${JSON.stringify(line)}`);
  }
});

test('--ci (mongo): no service container (the tests never connect)', () => {
  const { dir, r } = gen('ci-mongo', ['--yes', '--no-install', '--ci', '--mongo', '--test']);
  assert.equal(r.status, 0, r.stderr);
  const y = read(dir, '.github/workflows/ci.yml');
  assert.ok(!y.includes('services:') && !y.includes('DATABASE_URL') && y.includes('npm test'));
});

test('without --ci: no workflow and no CI section in the README', () => {
  const { dir, r } = gen('ci-off', ['--yes', '--no-install']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!has(dir, '.github'));
  assert.ok(!read(dir, 'README.md').includes('workflows/ci.yml'));
});

test('db:seed: script + seed file per database, password only with --auth', () => {
  const pg = gen('seed-pg', ['--yes', '--no-install', '--postgres']);
  assert.equal(pg.r.status, 0, pg.r.stderr);
  assert.equal(pkg(pg.dir).scripts['db:seed'], 'tsx scripts/seed.ts');
  const ps = read(pg.dir, 'scripts/seed.ts');
  assert.ok(ps.includes('prisma.user.upsert') && ps.includes('ada@example.com'));
  assert.ok(!ps.includes('bcrypt') && !ps.includes('{{'));

  const pga = gen('seed-pg-auth', ['--yes', '--no-install', '--postgres', '--auth']);
  const pas = read(pga.dir, 'scripts/seed.ts');
  assert.ok(pas.includes('bcrypt.hash') && pas.includes('password123') && !pas.includes('{{'));

  const mg = gen('seed-mongo', ['--yes', '--no-install', '--mongo']);
  const ms = read(mg.dir, 'scripts/seed.ts');
  assert.ok(ms.includes('UserModel.updateOne') && ms.includes('upsert: true'));
  assert.ok(!ms.includes('bcrypt') && !ms.includes('{{'));

  const mga = gen('seed-mongo-auth', ['--yes', '--no-install', '--mongo', '--auth']);
  assert.ok(read(mga.dir, 'scripts/seed.ts').includes('bcrypt.hash'));

  const none = gen('seed-none', ['--yes', '--no-install']);
  assert.ok(!has(none.dir, 'scripts'));
  assert.equal(pkg(none.dir).scripts['db:seed'], undefined);
  assert.ok(!read(none.dir, 'README.md').includes('db:seed'));
  assert.ok(read(pga.dir, 'README.md').includes('db:seed'));
  assert.ok(read(pga.dir, 'README.md').includes('password123'));
});

test('pagination: helper + every list handler pages and counts', () => {
  const base = gen('page-base', ['--yes', '--no-install']);
  assert.equal(base.r.status, 0, base.r.stderr);
  const helper = read(base.dir, 'src/utils/pagination.ts');
  assert.ok(helper.includes('parsePaging') && helper.includes('pageOf'));
  assert.ok(helper.includes('100'), 'limit is capped');
  const bc = read(base.dir, 'src/controllers/user.controller.ts');
  assert.ok(bc.includes('parsePaging(req.query)') && bc.includes('pageOf('));

  const mongo = gen('page-mongo', ['--yes', '--no-install', '--mongo']);
  const mc = read(mongo.dir, 'src/controllers/user.controller.ts');
  assert.ok(mc.includes('countDocuments()') && mc.includes('.skip(skip).limit(limit)'));
  assert.ok(mc.includes('sort({ _id: 1 })'), 'stable order');

  const mongoRx = gen('page-mongo-rx', ['--yes', '--no-install', '--mongo', '--rxjs']);
  const mrc = read(mongoRx.dir, 'src/controllers/user.controller.ts');
  assert.ok(mrc.includes('forkJoin') && mrc.includes('countDocuments()'));

  const pg = gen('page-pg', ['--yes', '--no-install', '--postgres']);
  const pc = read(pg.dir, 'src/controllers/user.controller.ts');
  assert.ok(pc.includes('prisma.$transaction') && pc.includes('prisma.user.count()'));
  assert.ok(pc.includes("orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]"), 'stable order');

  const pgRx = gen('page-pg-rx', ['--yes', '--no-install', '--postgres', '--rxjs']);
  const prc = read(pgRx.dir, 'src/controllers/user.controller.ts');
  assert.ok(prc.includes('prisma.$transaction') && prc.includes('pageOf('));
});

test('pagination is documented: OpenAPI parameters and README', () => {
  const { dir, r } = gen('page-docs', ['--yes', '--no-install', '--zod', '--openapi']);
  assert.equal(r.status, 0, r.stderr);
  const spec = read(dir, 'src/openapi.ts');
  assert.ok(spec.includes("name: 'page'") && spec.includes("name: 'limit'"));
  assert.ok(read(dir, 'README.md').includes('?page=') && read(dir, 'README.md').includes('{ data, meta }'));
});

const hasDockerCli = spawnSync('docker', ['compose', 'version']).status === 0;

test('compose (postgres): db only by default; migrate + app with --docker', () => {
  const off = gen('compose-pg-off', ['--yes', '--no-install', '--postgres']);
  assert.equal(off.r.status, 0, off.r.stderr);
  const y0 = read(off.dir, 'docker-compose.yml');
  assert.ok(y0.includes('postgres:17-alpine'));
  for (const absent of ['migrate:', 'app:', 'healthcheck', '{{']) {
    assert.ok(!y0.includes(absent), `db-only compose must not contain ${absent}`);
  }

  const on = gen('compose-pg-on', ['--yes', '--no-install', '--postgres', '--docker']);
  assert.equal(on.r.status, 0, on.r.stderr);
  const y = read(on.dir, 'docker-compose.yml');
  for (const present of [
    'healthcheck', 'pg_isready', 'migrate:', 'target: build',
    'npx prisma migrate deploy', 'service_healthy', 'service_completed_successfully',
    'app:', 'env_file: .env', '@db:5432',
  ]) {
    assert.ok(y.includes(present), `full-stack compose should contain ${present}`);
  }
  assert.ok(!y.includes('{{'));
});

test('compose (mongo): local db by default; app with --docker; working MONGO_DB default', () => {
  const off = gen('compose-mg-off', ['--yes', '--no-install', '--mongo']);
  assert.equal(off.r.status, 0, off.r.stderr);
  const y0 = read(off.dir, 'docker-compose.yml');
  assert.ok(y0.includes('image: mongo:7'));
  for (const absent of ['app:', 'healthcheck', '{{']) {
    assert.ok(!y0.includes(absent), `db-only compose must not contain ${absent}`);
  }
  assert.match(read(off.dir, '.env'), /^MONGO_DB=mongodb:\/\/localhost:27017\/app$/m);
  assert.match(read(off.dir, '.env.example'), /^MONGO_DB=mongodb:\/\/localhost:27017\/app$/m);

  const on = gen('compose-mg-on', ['--yes', '--no-install', '--mongo', '--docker']);
  const y = read(on.dir, 'docker-compose.yml');
  for (const present of ['healthcheck', 'app:', 'MONGO_DB: mongodb://db:27017/app', 'service_healthy', 'env_file: .env']) {
    assert.ok(y.includes(present), `full-stack compose should contain ${present}`);
  }
  assert.ok(!y.includes('migrate:') && !y.includes('{{'));
});

test('no compose file without a database', () => {
  const { dir, r } = gen('compose-none', ['--yes', '--no-install', '--docker']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!has(dir, 'docker-compose.yml'));
});

test('Dockerfile keeps the prisma CLI in the build stage and prunes in the final one', () => {
  const { dir, r } = gen('dockerfile-prune', ['--yes', '--no-install', '--postgres', '--docker']);
  assert.equal(r.status, 0, r.stderr);
  const df = read(dir, 'Dockerfile').split('\r\n').join('\n'); // CRLF on Windows checkouts
  const [buildStage, finalStage] = df.split(/\nFROM node:22-alpine\n/);
  assert.ok(!buildStage.includes('npm prune'), 'build stage keeps dev dependencies (migrate service needs prisma)');
  assert.ok(finalStage.includes('npm prune --omit=dev'));
});

test('generated compose files are valid per docker compose config', { skip: !hasDockerCli }, () => {
  for (const [name, flags] of [
    ['cfg-pg', ['--postgres']],
    ['cfg-pg-docker', ['--postgres', '--docker']],
    ['cfg-mg', ['--mongo']],
    ['cfg-mg-docker', ['--mongo', '--docker']],
  ]) {
    const { dir, r } = gen(name, ['--yes', '--no-install', ...flags]);
    assert.equal(r.status, 0, r.stderr);
    const c = spawnSync('docker', ['compose', 'config', '-q'], { cwd: dir, encoding: 'utf8' });
    assert.equal(c.status, 0, `${name}: ${c.stderr}`);
  }
});

test('README documents the compose stack with --docker', () => {
  const { dir, r } = gen('compose-readme', ['--yes', '--no-install', '--postgres', '--docker']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(read(dir, 'README.md').includes('docker compose up --build'));
});

test('README documents every CLI flag and the main generated-app features', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const options = readFileSync(new URL('../lib/options.js', import.meta.url), 'utf8');
  const flags = [...options.matchAll(/^\s+'?([a-z-]+)'?: \{ type: '(?:boolean|string)'/gm)].map((m) => m[1]);
  assert.ok(flags.length >= 15, `parsed the flag list (${flags.join(', ')})`);
  for (const flag of flags) {
    assert.ok(readme.includes(`--${flag}`), `README must document --${flag}`);
  }
  for (const topic of [
    'db:seed', '?page=', '{ data, meta }', 'CORS_ORIGINS', 'TRUST_PROXY', 'LOG_LEVEL',
    'GET /api/v1/ready', 'docker compose up --build', '.env.example', 'MONGO_DB', 'DATABASE_URL',
  ]) {
    assert.ok(readme.includes(topic), `README must mention ${topic}`);
  }
  assert.ok(!/needs `--mongo`/.test(readme), 'auth/rxjs work with either database');
});

test('generated README: Authentication and Swagger sections follow the flags', () => {
  const both = gen('docs-both', ['--yes', '--no-install', '--postgres', '--auth', '--zod', '--openapi']);
  assert.equal(both.r.status, 0, both.r.stderr);
  const b = read(both.dir, 'README.md');
  for (const present of [
    '## API docs (Swagger UI)',
    'http://localhost:3000/api/v1/docs',
    'http://localhost:3000/api/v1/openapi.json',
    '## Authentication',
    'ada@example.com',
    'grace@example.com',
    'alan@example.com',
    'password123',
    'authToken',
    'Authorization: Bearer',
    '**Authorize**',
    'POST /api/v1/auth/register',
  ]) {
    assert.ok(b.includes(present), `README (auth + openapi) should mention ${present}`);
  }
  assert.ok(!b.includes('{{'));

  const docsOnly = gen('docs-openapi', ['--yes', '--no-install', '--zod', '--openapi']);
  const d = read(docsOnly.dir, 'README.md');
  assert.ok(d.includes('http://localhost:3000/api/v1/docs'));
  assert.ok(!d.includes('## Authentication') && !d.includes('**Authorize**') && !d.includes('password123'));

  const authOnly = gen('docs-auth', ['--yes', '--no-install', '--postgres', '--auth']);
  const a = read(authOnly.dir, 'README.md');
  assert.ok(a.includes('## Authentication') && a.includes('ada@example.com') && a.includes('authToken'));
  assert.ok(!a.includes('Swagger UI') && !a.includes('**Authorize**') && !a.includes('/api/v1/docs'));

  const plain = gen('docs-plain', ['--yes', '--no-install']);
  const p = read(plain.dir, 'README.md');
  for (const absent of ['Swagger', '## Authentication', 'password123', 'Authorize']) {
    assert.ok(!p.includes(absent), `plain README must not mention ${absent}`);
  }
});

test('npm README documents the Swagger route, the seeded users and how to authorize', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  for (const topic of [
    'http://localhost:3000/api/v1/docs',
    'http://localhost:3000/api/v1/openapi.json',
    'ada@example.com',
    'grace@example.com',
    'alan@example.com',
    'password123',
    '**Authorize**',
    'authToken',
  ]) {
    assert.ok(readme.includes(topic), `README must mention ${topic}`);
  }
});

test('AGENTS.md: generated by default, skipped with --no-agents', () => {
  const on = gen('agents-on', ['--yes', '--no-install']);
  assert.equal(on.r.status, 0, on.r.stderr);
  const a = read(on.dir, 'AGENTS.md');
  assert.ok(a.includes('npm run dev') && a.includes('npm run lint') && a.includes('npm run build'));
  assert.ok(!a.includes('{{'));
  const off = gen('agents-off', ['--yes', '--no-install', '--no-agents']);
  assert.equal(off.r.status, 0, off.r.stderr);
  assert.ok(!has(off.dir, 'AGENTS.md'));
});

test('AGENTS.md follows the chosen options', () => {
  const plain = read(gen('agents-plain', ['--yes', '--no-install']).dir, 'AGENTS.md');
  for (const absent of ['prisma', 'mongoose', 'src/validation', 'src/openapi.ts', 'requireAuth', 'npm test', 'db:seed', 'docker compose']) {
    assert.ok(!plain.includes(absent), `plain AGENTS.md must not mention ${absent}`);
  }
  assert.ok(plain.includes('src/db/data.ts'), 'in-memory sample data is described');

  const pg = read(
    gen('agents-pg', ['--yes', '--no-install', '--postgres', '--auth', '--rxjs', '--zod', '--openapi', '--test', '--limiter']).dir,
    'AGENTS.md'
  );
  for (const present of [
    'prisma/schema.prisma', 'npm run db:migrate', 'src/generated', 'src/validation', 'src/openapi.ts',
    'requireAuth', 'npm test', 'rxjs', 'src/middleware/limiters.ts', 'db:seed',
  ]) {
    assert.ok(pg.includes(present), `postgres AGENTS.md should mention ${present}`);
  }
  assert.ok(!pg.includes('mongoose') && !pg.includes('src/db/data.ts'));

  const mg = read(gen('agents-mongo', ['--yes', '--no-install', '--mongo']).dir, 'AGENTS.md');
  assert.ok(mg.includes('src/models/user.schema.ts') && mg.includes('MONGO_DB'));
  assert.ok(!mg.includes('prisma'));
});

test('every path AGENTS.md mentions exists in the generated project', () => {
  const combos = [
    ['agents-paths-plain', []],
    ['agents-paths-mongo', ['--mongo', '--auth', '--zod', '--openapi', '--test', '--ci', '--docker', '--limiter']],
    ['agents-paths-pg', ['--postgres', '--auth', '--rxjs', '--zod', '--openapi', '--test', '--ci', '--docker']],
  ];
  for (const [name, flags] of combos) {
    const { dir, r } = gen(name, ['--yes', '--no-install', ...flags]);
    assert.equal(r.status, 0, r.stderr);
    const text = read(dir, 'AGENTS.md');
    const paths = [...text.matchAll(/`((?:src|prisma|scripts|test|\.github)\/[\w./{}-]*[\w}])`/g)].map((m) => m[1]);
    assert.ok(paths.length > 5, `${name}: parsed some paths`);
    for (const p of paths) {
      if (p.startsWith('src/generated')) continue; // created by postinstall (prisma generate)
      assert.ok(has(dir, p), `${name}: AGENTS.md mentions ${p}, which does not exist`);
    }
  }
});

test('--pm pnpm writes the build-script allow-list pnpm 10+ requires', () => {
  const plain = gen('pnpm-plain', ['--yes', '--no-install', '--pm', 'pnpm']);
  assert.equal(plain.r.status, 0, plain.r.stderr);
  const y = read(plain.dir, 'pnpm-workspace.yaml');
  assert.match(y, /^onlyBuiltDependencies:\n {2}- esbuild$/m);
  assert.match(y, /^allowBuilds:\n {2}esbuild: true$/m);
  assert.ok(!y.includes('prisma'), 'plain app has no prisma');

  const pg = gen('pnpm-pg', ['--yes', '--no-install', '--pm', 'pnpm', '--postgres']);
  const p = read(pg.dir, 'pnpm-workspace.yaml');
  for (const present of ['- prisma', "- '@prisma/engines'", 'prisma: true', "'@prisma/engines': true"]) {
    assert.ok(p.includes(present), `postgres allow-list should contain ${present}`);
  }
  assert.ok(p.includes("'@scarf/scarf': false"), 'telemetry package stays blocked');

  for (const pm of ['npm', 'yarn']) {
    const other = gen(`pm-${pm}`, ['--yes', '--no-install', '--pm', pm]);
    assert.ok(!has(other.dir, 'pnpm-workspace.yaml'), `${pm} projects get no pnpm file`);
  }
});

test('trust files: security policy, contributing guide, issue and PR templates', () => {
  const root = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const security = root('SECURITY.md');
  assert.ok(security.includes('Supported versions') && security.includes('security/advisories/new'));
  assert.ok(!/@\w+\.\w+/.test(security), 'no personal email address in the policy');

  const contributing = root('CONTRIBUTING.md');
  for (const topic of ['npm test', 'FULL=1', 'POSTGRES_URL', 'MONGO_URL', '//{{', 'CHANGELOG.md', 'lib/generate.js']) {
    assert.ok(contributing.includes(topic), `CONTRIBUTING.md should mention ${topic}`);
  }

  for (const t of [
    '.github/ISSUE_TEMPLATE/bug_report.md',
    '.github/ISSUE_TEMPLATE/feature_request.md',
    '.github/PULL_REQUEST_TEMPLATE.md',
  ]) {
    assert.ok(existsSync(new URL(`../${t}`, import.meta.url)), `${t} exists`);
  }
  const bug = root('.github/ISSUE_TEMPLATE/bug_report.md');
  assert.ok(bug.includes('Generator version') && bug.includes('Command you ran'));
});

test('README hero: CI badge, one-line pitch and an honest "which one" section', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(readme.includes('actions/workflows/test.yml/badge.svg'), 'CI badge');
  assert.match(readme, /^## \S+ Which generator should you use\?\r?$/m);
  assert.ok(readme.includes('express-generator-typescript'), 'names the lean alternative');
  assert.ok(readme.includes('### What you get, for real'), 'shows a real generated tree');
  assert.ok(readme.includes('src/validation/user.validation.ts'), 'tree comes from a real run');
});

test('package.json is discoverable: description and keywords', () => {
  const { description, keywords } = rootPkg;
  for (const word of ['Express', 'TypeScript', 'Prisma', 'MongoDB', 'OpenAPI', 'Docker']) {
    assert.ok(description.includes(word), `description mentions ${word}`);
  }
  assert.ok(description.length <= 220, 'description stays scannable');
  for (const k of ['express', 'typescript', 'generator', 'scaffold', 'openapi', 'swagger', 'prisma',
    'postgresql', 'mongodb', 'zod', 'jwt', 'docker', 'starter', 'boilerplate', 'rest-api']) {
    assert.ok(keywords.includes(k), `keyword ${k}`);
  }
});

test('README file list matches a real run of the flagship combination', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const block = readme.split('### What you get, for real')[1].split('```text\n')[1].split('\n```')[0];
  const listed = block.split('\n').filter(Boolean).sort();
  const { dir, r } = gen('readme-tree', [
    '--yes', '--no-install', '--git', '--postgres', '--auth', '--zod', '--openapi', '--test', '--ci', '--docker',
  ].filter((f) => f !== '--git'));
  assert.equal(r.status, 0, r.stderr);
  const actual = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.relative(dir, path.join(d.parentPath, d.name)).split(path.sep).join('/'))
    .filter((p) => !p.startsWith('.git/') && p !== '.env' && p !== '.gitignore')
    .sort();
  assert.deepEqual(listed, actual, 'README tree must equal the generated files (minus .env, .gitignore, .git)');
});

test('release workflow: the test step defines NODE_AUTH_TOKEN so yarn can read the .npmrc setup-node writes', () => {
  const wf = readFileSync(
    new URL('../.github/workflows/release.yml', import.meta.url),
    'utf8'
  ).replace(/\r\n/g, '\n');
  assert.ok(wf.includes('registry-url:'), 'setup-node writes an .npmrc referencing ${NODE_AUTH_TOKEN}');
  const testStep = wf.match(/run: npm test\n([\s\S]*?)(?=\n      - |$)/)[1];
  assert.match(testStep, /NODE_AUTH_TOKEN: /, 'yarn 1 fails when the variable is undefined');
  assert.ok(!testStep.includes('secrets.'), 'tests never receive the real publish token');
});

test('release workflow: re-tagging an already published version does not fail or re-publish', () => {
  const wf = readFileSync(
    new URL('../.github/workflows/release.yml', import.meta.url),
    'utf8'
  ).replace(/\r\n/g, '\n');
  assert.ok(wf.includes('npm view'), 'asks the registry whether this version exists');
  assert.match(wf, /id: published/, 'the check is a named step');
  const guard = "if: steps.published.outputs.exists != 'true'";
  const guarded = wf.split(guard).length - 1;
  assert.ok(guarded >= 3, `install, test and publish are all skipped when published (found ${guarded})`);
  assert.ok(
    wf.indexOf('id: published') < wf.indexOf('npm publish'),
    'the existence check runs before publishing'
  );
});

test('--preset api / full / minimal generate the promised projects', () => {
  const api = gen('preset-api', ['--preset', 'api', '--no-install']);
  assert.equal(api.r.status, 0, api.r.stderr);
  for (const f of ['prisma/schema.prisma', 'src/middleware/auth.ts', 'src/validation/user.validation.ts', 'src/openapi.ts', 'test/health.test.ts']) {
    assert.ok(has(api.dir, f), `api preset has ${f}`);
  }
  assert.ok(!has(api.dir, 'Dockerfile') && !has(api.dir, '.github'));

  const full = gen('preset-full', ['--preset', 'full', '--no-install']);
  for (const f of ['Dockerfile', '.github/workflows/ci.yml', 'src/middleware/limiters.ts']) {
    assert.ok(has(full.dir, f), `full preset has ${f}`);
  }

  const min = gen('preset-min', ['--preset', 'minimal', '--no-install']);
  assert.equal(min.r.status, 0, min.r.stderr);
  assert.ok(has(min.dir, 'src/db/data.ts') && !has(min.dir, 'prisma'));

  const mongo = gen('preset-mongo', ['--preset', 'api', '--mongo', '--no-install']);
  assert.ok(has(mongo.dir, 'src/models/user.schema.ts') && !has(mongo.dir, 'prisma'));

  const bad = gen('preset-bad', ['--preset', 'huge', '--no-install']);
  assert.equal(bad.r.status, 1);
  assert.match(bad.r.stderr, /minimal, api, full/);
});

test('.mfgrc.json in the current directory sets defaults; --no-config ignores it', () => {
  const work = path.join(tmp, 'cfg-work');
  mkdirSync(work);
  writeFileSync(path.join(work, '.mfgrc.json'), JSON.stringify({ mongo: true, zod: true, pm: 'npm' }));
  const env = { ...process.env, HOME: tmp, USERPROFILE: tmp };
  const withCfg = spawnSync(process.execPath, [bin, 'app1', '--yes', '--no-install'], { cwd: work, env, encoding: 'utf8' });
  assert.equal(withCfg.status, 0, withCfg.stderr);
  assert.ok(has(path.join(work, 'app1'), 'src/models/user.schema.ts'), 'config enabled mongo');
  assert.ok(has(path.join(work, 'app1'), 'src/validation/user.validation.ts'), 'config enabled zod');

  const ignored = spawnSync(process.execPath, [bin, 'app2', '--yes', '--no-install', '--no-config'], { cwd: work, env, encoding: 'utf8' });
  assert.equal(ignored.status, 0, ignored.stderr);
  assert.ok(!has(path.join(work, 'app2'), 'src/models'), '--no-config ignores the file');

  writeFileSync(path.join(work, '.mfgrc.json'), JSON.stringify({ banana: true }));
  const broken = spawnSync(process.execPath, [bin, 'app3', '--yes', '--no-install'], { cwd: work, env, encoding: 'utf8' });
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /\.mfgrc\.json.*unknown option "banana"/);
  assert.ok(!has(path.join(work, 'app3'), 'package.json'));
});

const listFiles = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.relative(dir, path.join(d.parentPath, d.name)).split(path.sep).join('/'))
    .filter((p) => !p.startsWith('.git/'))
    .sort();

const dryTmpLeftovers = () => readdirSync(os.tmpdir()).filter((n) => n.startsWith('mfg-dry-')).length;

test('--dry-run writes nothing, cleans up, and lists exactly what a real run creates', () => {
  for (const [name, flags] of [
    ['dry-plain', []],
    ['dry-pg', ['--preset', 'full']],
    ['dry-mongo', ['--mongo', '--auth', '--zod', '--openapi', '--rxjs', '--limiter', '--test', '--ci', '--docker']],
  ]) {
    const before = dryTmpLeftovers();
    const dry = gen(name + '-preview', ['--no-install', '--yes', '--dry-run', ...flags]);
    assert.equal(dry.r.status, 0, dry.r.stderr);
    assert.ok(!has(tmp, name + '-preview'), 'a dry run creates no directory');
    assert.equal(dryTmpLeftovers(), before, 'the temporary preview directory is removed');
    assert.match(dry.r.stdout, /Dry run: nothing was written/);

    const real = gen(name + '-real', ['--no-install', '--yes', '--no-git', ...flags]);
    assert.equal(real.r.status, 0, real.r.stderr);
    const expected = listFiles(real.dir);
    const listed = dry.r.stdout
      .split('\n')
      .filter((l) => /^ {2}\S/.test(l) && !l.includes(':'))
      .map((l) => l.trim())
      .sort();
    assert.deepEqual(listed, expected, `${name}: dry-run file list equals a real run`);
    assert.match(dry.r.stdout, new RegExp(`${expected.length} files`));
  }
});

test('--dry-run summarises options, dependencies and scripts, and still refuses an existing directory', () => {
  const dry = gen('dry-summary', ['--no-install', '--yes', '--dry-run', '--postgres', '--auth', '--test']);
  assert.equal(dry.r.status, 0, dry.r.stderr);
  const out = dry.r.stdout;
  assert.match(out, /Options: .*postgres.*auth.*test/);
  assert.match(out, /dependencies, \d+ devDependencies/);
  const scriptsLine = out.split(/\r?\n/).find((l) => l.startsWith('scripts: '));
  for (const sc of ['dev', 'build', 'test', 'db:migrate', 'db:seed']) {
    assert.ok(scriptsLine.includes(sc), `scripts line lists ${sc}`);
  }
  assert.match(out, /without --dry-run/);

  gen('dry-exists', ['--no-install', '--yes']); // creates it
  const again = gen('dry-exists', ['--no-install', '--yes', '--dry-run']);
  assert.equal(again.r.status, 1);
  assert.match(again.r.stderr, /already exists/);
});

test('workflows that run the tests install the dependencies first, and a lockfile is committed', () => {
  const dir = new URL('../.github/workflows/', import.meta.url);
  const flagged = [];
  for (const name of readdirSync(dir)) {
    const text = readFileSync(new URL(name, dir), 'utf8');
    if (/run: npm test/.test(text) && !/run: npm (ci|install)\b/.test(text)) flagged.push(name);
  }
  assert.deepEqual(flagged, [], 'these workflows run npm test without installing');
  assert.ok(existsSync(new URL('../package-lock.json', import.meta.url)), 'package-lock.json is committed');
  assert.deepEqual(Object.keys(rootPkg.dependencies), ['@clack/prompts']);
  assert.match(rootPkg.dependencies['@clack/prompts'], /^\d+\.\d+\.\d+$/, 'pinned exactly');
});

test('non-interactive runs never load the prompt library', () => {
  const src = readFileSync(new URL('../bin/cli.js', import.meta.url), 'utf8');
  assert.ok(!/^import .*@clack\/prompts/m.test(src), 'no static import in the CLI entry');
  assert.ok(src.includes("await import('@clack/prompts')"), 'loaded lazily, only for the wizard');
  const wiz = readFileSync(new URL('../lib/wizard.js', import.meta.url), 'utf8');
  assert.ok(!wiz.includes("from '@clack/prompts'"), 'the wizard module takes the library by injection');
});

// ---- create-express-blueprint: the npm create entry point ----------------------------
const wrapperDir = fileURLToPath(new URL('../packages/create-express-blueprint/', import.meta.url));
const wrapperPkg = () => JSON.parse(readFileSync(path.join(wrapperDir, 'package.json'), 'utf8'));

test('create-express-blueprint: package metadata makes "npm create express-blueprint" work', () => {
  const p = wrapperPkg();
  assert.equal(p.name, 'create-express-blueprint');
  assert.match(p.version, /^\d+\.\d+\.\d+$/);
  // npm create express-blueprint -> runs the bin called create-express-blueprint
  assert.equal(p.bin['create-express-blueprint'], 'bin/cli.js');
  assert.equal(p.type, 'module');
  assert.equal(p.license, 'MIT');
  assert.ok(p.engines.node.includes('20.19'));
  assert.deepEqual(p.files.sort(), ['LICENSE', 'README.md', 'bin'].sort());
  assert.deepEqual(Object.keys(p.dependencies), ['@mianfrigo/express-typescript-generator']);
  assert.ok(p.repository.url.startsWith('git+https://github.com/mianfrigo/'));
  for (const k of ['create', 'express', 'typescript', 'generator', 'scaffold']) {
    assert.ok(p.keywords.includes(k), `keyword ${k}`);
  }
  for (const file of ['bin/cli.js', 'README.md', 'LICENSE']) {
    assert.ok(existsSync(path.join(wrapperDir, file)), `${file} exists`);
  }
  assert.match(readFileSync(path.join(wrapperDir, 'bin/cli.js'), 'utf8'), /^#!\/usr\/bin\/env node/);
});

test('create-express-blueprint: its dependency range is satisfied by this repo\'s generator version', () => {
  const range = wrapperPkg().dependencies['@mianfrigo/express-typescript-generator'];
  const m = range.match(/^\^(\d+)\.(\d+)\.(\d+)$/);
  assert.ok(m, `a caret range, got ${range}`);
  const [min, cur] = [m.slice(1).map(Number), rootPkg.version.split('.').map(Number)];
  assert.equal(cur[0], min[0], 'same major');
  const geq = cur[1] > min[1] || (cur[1] === min[1] && cur[2] >= min[2]);
  assert.ok(geq, `generator ${rootPkg.version} must be >= ${range}`);
});

test('create-express-blueprint: runs the generator CLI when installed next to it', () => {
  // lay the two packages out the way npm installs them: node_modules/<name>
  const root = mkdtempSync(path.join(tmp, 'wrapper-'));
  const nm = path.join(root, 'node_modules');
  const repo = fileURLToPath(new URL('..', import.meta.url));
  const generatorDir = path.join(nm, '@mianfrigo', 'express-typescript-generator');
  mkdirSync(generatorDir, { recursive: true });
  for (const entry of ['bin', 'lib', 'package.json']) {
    cpSync(path.join(repo, entry), path.join(generatorDir, entry), { recursive: true });
  }
  cpSync(wrapperDir, path.join(nm, 'create-express-blueprint'), { recursive: true });

  const bin = path.join(nm, 'create-express-blueprint', 'bin', 'cli.js');
  const r = spawnSync(process.execPath, [bin, 'via-wrapper', '--preset', 'minimal', '--no-install', '--no-config'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HOME: tmp, USERPROFILE: tmp },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(path.join(root, 'via-wrapper', 'src', 'index.ts')), 'project created in the cwd');
  assert.match(r.stdout, /Done\. Next/);

  const v = spawnSync(process.execPath, [bin, '--version'], { encoding: 'utf8' });
  assert.equal(v.status, 0);
  assert.ok(v.stdout.includes(rootPkg.version), 'passes arguments through to the generator');
});

test('README leads with npm create express-blueprint, and the wrapper README does too', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(readme.includes('npm create express-blueprint@latest my-api'));
  const wr = readFileSync(path.join(wrapperDir, 'README.md'), 'utf8');
  assert.ok(wr.includes('npm create express-blueprint@latest') && wr.includes('@mianfrigo/express-typescript-generator'));
});

test('release workflow also publishes create-express-blueprint, once per version, with provenance', () => {
  const wf = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(wf.includes('packages/create-express-blueprint'), 'works in the wrapper directory');
  assert.match(wf, /id: wrapper/, 'its own existence check');
  const after = wf.slice(wf.indexOf('id: wrapper'));
  assert.ok(after.includes("steps.wrapper.outputs.exists != 'true'"));
  assert.ok(after.includes('npm publish --provenance --access public'));
  assert.ok(wf.indexOf('id: wrapper') > wf.indexOf('npm publish --provenance'), 'wrapper is published after the generator');
});

test('wrapper: every documented command is derived from the package name (no stale names)', () => {
  const name = wrapperPkg().name;
  const short = name.replace(/^create-/, '');
  assert.match(name, /^create-[a-z0-9-]+$/);
  for (const [file, text] of [
    ['README.md', readFileSync(new URL('../README.md', import.meta.url), 'utf8')],
    ['wrapper README', readFileSync(path.join(wrapperDir, 'README.md'), 'utf8')],
  ]) {
    assert.ok(text.includes(`npm create ${short}@latest`), `${file} documents npm create ${short}`);
    assert.ok(!/expresskit/i.test(text), `${file} has no stale name`);
  }
  assert.ok(wrapperDir.endsWith(name + path.sep) || wrapperDir.endsWith(name + '/'), 'folder matches the package name');
  const wf = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
  assert.ok(!/expresskit/i.test(wf), 'release workflow has no stale name');
});

test('index.ts handles a failed bind instead of logging "connected" and idling (all variants)', () => {
  for (const [name, flags] of [
    ['listen-base', []],
    ['listen-mongo', ['--mongo']],
    ['listen-pg', ['--postgres']],
  ]) {
    const { dir, r } = gen(name, ['--yes', '--no-install', ...flags]);
    assert.equal(r.status, 0, r.stderr);
    const idx = read(dir, 'src/index.ts');
    assert.match(idx, /app\.listen\(port, \(err\?: Error\) =>/, `${name}: listen callback takes the error`);
    assert.ok(idx.includes('if (err)') && idx.includes('process.exit(1)'), `${name}: exits on a failed bind`);
    assert.ok(idx.indexOf('if (err)') < idx.indexOf('connected to port'), `${name}: error is handled before success is logged`);
  }
});

test('--roles needs --auth (exit 1 otherwise)', () => {
  const { r } = gen('roles-noauth', ['--yes', '--no-install', '--mongo', '--roles']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--roles requires --auth/);
});

test('--roles (mongo): role field, requireRole, admin-only delete, role route, seed admin, docs', () => {
  const { dir, r } = gen('roles-mongo', [
    '--yes', '--no-install', '--mongo', '--auth', '--roles', '--zod', '--openapi', '--limiter',
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(read(dir, 'src/models/user.schema.ts').includes("enum: ['user', 'admin']"));
  const mw = read(dir, 'src/middleware/auth.ts');
  assert.ok(mw.includes('requireRole') && mw.includes('req.auth'));
  const users = read(dir, 'src/routes/user.route.ts');
  assert.ok(users.includes("router.delete('/:id', mainLimiter, requireRole('admin')"));
  assert.ok(!users.includes("router.delete('/:id', mainLimiter, userController.removeUser)"));
  const roleRoute = read(dir, 'src/routes/role.route.ts');
  assert.ok(roleRoute.includes("'/:id/role'") && roleRoute.includes("requireRole('admin')"));
  assert.ok(roleRoute.includes('validate(roleSchema)'));
  assert.ok(read(dir, 'src/validation/role.validation.ts').includes("z.enum(['user', 'admin'])"));
  assert.ok(read(dir, 'src/routes/index.ts').includes("router.use('/user', requireAuth, roleRoute)"));
  assert.ok(read(dir, 'src/controllers/role.controller.ts').includes('setRole'));
  assert.ok(read(dir, 'src/controllers/auth.controller.ts').includes('role: user.role'));
  assert.ok(read(dir, 'scripts/seed.ts').includes('admin@example.com'));
  assert.ok(read(dir, 'src/openapi.ts').includes("'/user/{id}/role'"));
  assert.match(read(dir, 'README.md'), /## Roles/);
  assert.ok(read(dir, 'AGENTS.md').includes('requireRole'));
  assert.ok(!allTs(dir).includes('{{'));
});

test('--roles (postgres): column in the schema and the committed migration, role controller', () => {
  const { dir, r } = gen('roles-pg', ['--yes', '--no-install', '--postgres', '--auth', '--roles', '--rxjs']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(read(dir, 'prisma/schema.prisma'), /role\s+String\s+@default\("user"\)/);
  const mig = readdirSync(path.join(dir, 'prisma/migrations')).find((m) => m.endsWith('_init'));
  assert.ok(read(dir, `prisma/migrations/${mig}/migration.sql`).includes('"role" TEXT NOT NULL DEFAULT \'user\''));
  const ctl = read(dir, 'src/controllers/role.controller.ts');
  assert.ok(ctl.includes('prisma.user.update') && ctl.includes('rxjs'));
  assert.ok(read(dir, 'src/controllers/auth.controller.ts').includes('role: user.role'));
  assert.ok(!allTs(dir).includes('{{'));
  assert.ok(!read(dir, 'prisma/schema.prisma').includes('{{'));
});

test('plain --auth output has no roles artifacts', () => {
  for (const [name, flags] of [['norole-mongo', ['--mongo']], ['norole-pg', ['--postgres']]]) {
    const { dir, r } = gen(name, ['--yes', '--no-install', '--auth', ...flags]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!has(dir, 'src/routes/role.route.ts') && !has(dir, 'src/controllers/role.controller.ts'));
    const text = allTs(dir) + read(dir, 'README.md') + read(dir, 'AGENTS.md');
    assert.ok(!/requireRole|setRole|admin@example/.test(text), `${name}: no roles text`);
    if (has(dir, 'prisma/schema.prisma')) {
      assert.ok(!read(dir, 'prisma/schema.prisma').includes('role'), 'no role column');
    }
    assert.ok(!/role/.test(read(dir, 'src/middleware/auth.ts')), 'no role claim without --roles');
  }
});

test('README documents --roles and AGENTS.md follows the flag', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(readme.includes('--roles') && readme.includes('requireRole'));
});

test('--refresh-tokens needs --auth (exit 1 otherwise)', () => {
  const { r } = gen('refresh-noauth', ['--yes', '--no-install', '--mongo', '--refresh-tokens']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--refresh-tokens requires --auth/);
});

test('--refresh-tokens (mongo): token model, service, routes, short access token, docs', () => {
  const { dir, r } = gen('refresh-mongo', [
    '--yes', '--no-install', '--mongo', '--auth', '--refresh-tokens', '--zod', '--openapi', '--limiter',
  ]);
  assert.equal(r.status, 0, r.stderr);
  const model = read(dir, 'src/models/refreshToken.schema.ts');
  assert.ok(model.includes('tokenHash') && model.includes('familyId') && model.includes('expires'));
  const svc = read(dir, 'src/services/tokens.ts');
  assert.ok(svc.includes('sha256') && svc.includes('ACCESS_TOKEN_TTL') && svc.includes('REFRESH_TOKEN_TTL_DAYS'));
  const route = read(dir, 'src/routes/auth.route.ts');
  assert.ok(route.includes("'/refresh'") && route.includes("'/logout'"));
  assert.ok(read(dir, 'src/validation/auth.validation.ts').includes('refreshSchema'));
  assert.ok(read(dir, 'src/controllers/token.controller.ts').includes('refreshSession'));
  const auth = read(dir, 'src/controllers/auth.controller.ts');
  assert.ok(auth.includes('issueRefreshToken') && auth.includes('ACCESS_TTL') && !auth.includes("'24h'"));
  assert.ok(read(dir, 'src/openapi.ts').includes("'/auth/refresh'"));
  assert.match(read(dir, 'README.md'), /## Refresh tokens/);
  assert.ok(read(dir, 'AGENTS.md').includes('src/services/tokens.ts'));
  assert.ok(!allTs(dir).includes('{{'));
});

test('--refresh-tokens (postgres): RefreshToken model and committed migration', () => {
  const { dir, r } = gen('refresh-pg', [
    '--yes', '--no-install', '--postgres', '--auth', '--roles', '--refresh-tokens', '--rxjs',
  ]);
  assert.equal(r.status, 0, r.stderr);
  const schema = read(dir, 'prisma/schema.prisma');
  assert.ok(schema.includes('model RefreshToken') && schema.includes('refreshTokens RefreshToken[]'));
  const mig = readdirSync(path.join(dir, 'prisma/migrations')).find((m) => m.endsWith('_init'));
  const sql = read(dir, `prisma/migrations/${mig}/migration.sql`);
  assert.ok(sql.includes('CREATE TABLE "RefreshToken"') && sql.includes('ON DELETE CASCADE'));
  assert.ok(read(dir, 'src/services/tokens.ts').includes('prisma.refreshToken'));
  assert.ok(read(dir, 'src/controllers/token.controller.ts').includes('rxjs'));
  assert.ok(!allTs(dir).includes('{{'));
  assert.ok(!schema.includes('{{') && !sql.includes('{{'));
});

test('plain --auth output has no refresh-token artifacts', () => {
  for (const [name, flags] of [['norefresh-mongo', ['--mongo']], ['norefresh-pg', ['--postgres']]]) {
    const { dir, r } = gen(name, ['--yes', '--no-install', '--auth', ...flags]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!has(dir, 'src/services/tokens.ts') && !has(dir, 'src/controllers/token.controller.ts'));
    const text = allTs(dir) + read(dir, 'README.md') + read(dir, 'AGENTS.md');
    assert.ok(!/refresh/i.test(text), `${name}: no refresh text`);
    if (has(dir, 'prisma/schema.prisma')) {
      assert.ok(!/RefreshToken/.test(read(dir, 'prisma/schema.prisma')));
    }
    assert.ok(read(dir, 'src/controllers/auth.controller.ts').includes("'24h'"));
  }
});

test('README documents --refresh-tokens', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(readme.includes('--refresh-tokens') && readme.includes('/auth/refresh'));
});

test('hardening (mongo + auth + roles + zod + limiter): ownership, admin-only create, auth limiter, 72-byte cap', () => {
  const { dir, r } = gen('hard-mongo', [
    '--yes', '--no-install', '--mongo', '--auth', '--roles', '--zod', '--limiter',
  ]);
  assert.equal(r.status, 0, r.stderr);
  const users = read(dir, 'src/routes/user.route.ts');
  assert.ok(users.includes("router.put('/:id', mainLimiter, requireSelf, validate(updateUserSchema)"));
  assert.ok(users.includes("router.post('/', mainLimiter, requireRole('admin'), validate(createUserSchema)"));
  assert.ok(users.includes("router.delete('/:id', mainLimiter, requireRole('admin')"));
  const mw = read(dir, 'src/middleware/auth.ts');
  assert.ok(mw.includes('export const requireSelf') && mw.includes("req.auth?.role === 'admin'"));
  const auth = read(dir, 'src/routes/auth.route.ts');
  assert.ok(auth.includes("router.post('/', authLimiter, validate(loginSchema)"));
  assert.ok(auth.includes("router.post('/register', authLimiter,"));
  const lim = read(dir, 'src/middleware/limiters.ts');
  assert.ok(lim.includes('export const authLimiter') && lim.includes('skipSuccessfulRequests'));
  assert.ok(read(dir, 'src/validation/auth.validation.ts').includes('.max(72)'));
  assert.ok(read(dir, 'src/controllers/auth.controller.ts').includes('byteLength'));
  assert.ok(!allTs(dir).includes('{{'));
});

test('hardening (postgres + auth only): self-only PUT, no role gating, no auth limiter', () => {
  const { dir, r } = gen('hard-pg', ['--yes', '--no-install', '--postgres', '--auth']);
  assert.equal(r.status, 0, r.stderr);
  const users = read(dir, 'src/routes/user.route.ts');
  assert.ok(users.includes("router.put('/:id', requireSelf, userController.updateUser)"));
  assert.ok(users.includes("router.post('/', userController.createUsers)"));
  assert.ok(!users.includes('requireRole'));
  const mw = read(dir, 'src/middleware/auth.ts');
  assert.ok(mw.includes('requireSelf') && !mw.includes('admin'));
  assert.ok(!/authLimiter|mainLimiter/.test(allTs(dir)));
});

test('hardening: without --auth the user routes have no ownership check', () => {
  const { dir, r } = gen('hard-none', ['--yes', '--no-install']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!read(dir, 'src/routes/user.route.ts').includes('requireSelf'));
});

test('error handler: 4xx at warn without a stack, 5xx at error, headersSent respected; no urlencoded; one fatal log line', () => {
  for (const [name, flags] of [['eh-base', []], ['eh-mongo', ['--mongo']], ['eh-pg', ['--postgres']]]) {
    const { dir, r } = gen(name, ['--yes', '--no-install', ...flags]);
    assert.equal(r.status, 0, r.stderr);
    const eh = read(dir, 'src/middleware/errorHandler.ts');
    assert.ok(eh.includes('res.headersSent') && eh.includes('logger.warn') && eh.includes('logger.error'), name);
    assert.ok(!eh.includes('stack: ${err.stack}; ') || eh.includes('>= 500'), name);
    assert.ok(!read(dir, 'src/app.ts').includes('urlencoded'), name);
    assert.ok(!read(dir, 'src/index.ts').includes('console.error(`could not listen'), name);
  }
});
