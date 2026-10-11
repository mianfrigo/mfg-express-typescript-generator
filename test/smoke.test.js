import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
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

// boots the compiled base app, hits /health, then SIGTERM must exit 0
async function checkHealthAndShutdown(dir) {
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
  'full-all': ['--mongo', '--auth', '--rxjs', '--limiter', '--test', '--docker'],
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
      if (flags.includes('--auth')) checkRequireAuth(dir);
      if (name === 'full-base') await checkHealthAndShutdown(dir);
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
