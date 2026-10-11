import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
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
async function checkPostgresCrud(dir, flags, adminUrl) {
  const auth = flags.includes('--auth');
  const zod = flags.includes('--zod');
  const dbName = 't_' + Math.random().toString(16).slice(2, 10);
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
  const env = { ...process.env, DATABASE_URL: url.toString() };

  const win = process.platform === 'win32'; // one string: no shell+args warning
  const depOpts = { cwd: dir, encoding: 'utf8', env };
  const dep = win
    ? spawnSync('npm run db:deploy', { ...depOpts, shell: true })
    : spawnSync('npm', ['run', 'db:deploy'], depOpts);
  assert.equal(dep.status, 0, `db:deploy\n${dep.stdout}\n${dep.stderr}`);

  const port = 39500 + Math.floor(Math.random() * 400);
  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: dir,
    env: { ...env, PORT: String(port) },
    stdio: 'ignore',
  });
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  const base = `http://127.0.0.1:${port}/api/v1`;
  try {
    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      try {
        up = (await fetch(`${base}/health`)).status === 200;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    assert.ok(up, 'app booted against postgres');

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
    if (auth) {
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
      assert.equal((await call('GET', '/user')).status, 401, 'user routes need a token');
    }

    const made = await call('POST', '/user', { firstName: 'Ada', lastName: 'L', email: 'ada@x.co', extra: 1 }, token);
    assert.equal(made.status, 201);
    assert.ok(made.body.id);
    assert.equal(made.body.password, undefined);
    assert.equal(made.body.extra, undefined);

    const dup = await call('POST', '/user', { firstName: 'Ada', lastName: 'L', email: 'ada@x.co' }, token);
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.message, 'Resource already exists');

    const list = await call('GET', '/user', undefined, token);
    assert.equal(list.status, 200);
    assert.ok(list.body.some((u) => u.email === 'ada@x.co'));
    assert.ok(list.body.every((u) => u.password === undefined));

    const one = await call('GET', `/user/${made.body.id}`, undefined, token);
    assert.equal(one.status, 200);
    assert.equal(one.body.email, 'ada@x.co');
    assert.equal((await call('GET', '/user/does-not-exist', undefined, token)).status, 404);

    const upd = await call('PUT', `/user/${made.body.id}`, { firstName: 'Grace' }, token);
    assert.equal(upd.status, 200);
    assert.equal(upd.body.firstName, 'Grace');
    assert.equal((await call('PUT', '/user/does-not-exist', { firstName: 'X' }, token)).status, 404);

    if (zod) {
      const inv = await call('POST', '/user', { firstName: 'Z', lastName: 'Z', email: 'not-an-email' }, token);
      assert.equal(inv.status, 400);
      assert.match(inv.body.error.message, /email/);
    }

    assert.equal((await call('DELETE', `/user/${made.body.id}`, undefined, token)).status, 200);
    assert.equal((await call('DELETE', `/user/${made.body.id}`, undefined, token)).status, 404);

    if (process.platform !== 'win32') {
      child.kill('SIGTERM');
      assert.equal(await exited, 0, 'graceful exit disconnects prisma');
    }
  } finally {
    child.kill('SIGKILL');
  }
}

// boots the compiled base app, hits /health, then SIGTERM must exit 0
async function checkHealthAndShutdown(dir, openapi = false) {
  const port = 39000 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: dir,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  try {
    let body;
    for (let i = 0; i < 50 && !body; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        if (res.status === 200) body = await res.json();
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    assert.deepEqual(body, { status: 'ok' });
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
  'full-zod': ['--zod'],
  'full-openapi': ['--zod', '--openapi'],
  'full-openapi-auth': ['--zod', '--openapi', '--mongo', '--auth'],
  'full-zod-mongo-auth': ['--zod', '--mongo', '--auth'],
  'full-all': ['--mongo', '--auth', '--rxjs', '--limiter', '--test', '--docker', '--zod', '--openapi'],
  'full-postgres-all': ['--postgres', '--auth', '--limiter', '--zod', '--openapi', '--test', '--docker'],
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
    { skip: !process.env.FULL, timeout: 600_000 },
    async () => {
      const { dir, r } = gen(name, ['--yes', ...flags]); // runs the real install
      assert.equal(r.status, 0, r.stderr);
      npm(['run', 'build'], dir);
      npm(['run', 'lint'], dir);
      if (flags.includes('--test')) npm(['test'], dir);
      if (flags.includes('--zod')) checkValidate(dir, flags);
      if (flags.includes('--openapi')) checkOpenapiDoc(dir, flags);
      if (process.env.POSTGRES_URL && flags.includes('--postgres')) {
        await checkPostgresCrud(dir, flags, process.env.POSTGRES_URL);
      }
      if (flags.includes('--auth')) checkRequireAuth(dir);
      if (name === 'full-base' || name === 'full-openapi') {
        await checkHealthAndShutdown(dir, flags.includes('--openapi'));
      }
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
  assert.ok(!has(dir, 'prisma') && !has(dir, 'prisma.config.ts') && !has(dir, 'docker-compose.yml'));
  assert.equal(pkg(dir).scripts.postinstall, undefined);
});
