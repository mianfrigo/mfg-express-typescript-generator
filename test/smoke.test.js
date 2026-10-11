import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
