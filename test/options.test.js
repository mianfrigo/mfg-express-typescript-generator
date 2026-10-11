import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPm, parseCli, resolveOptions, validateName } from '../lib/options.js';

const run = (argv, ask, env = {}) =>
  resolveOptions(parseCli(argv).values, ask, env);
const never = () => assert.fail('must not prompt');

test('flags set every option without prompting', async () => {
  const o = await run(
    ['--mongo', '--auth', '--rxjs', '--limiter', '--pm', 'pnpm', '--no-install'],
    never
  );
  assert.deepEqual(o, {
    limiter: true,
    mongo: true,
    auth: true,
    rxjs: true,
    pm: 'pnpm',
    install: false,
    git: 'auto',
    here: false,
    zod: false,
    openapi: false,
    docker: false,
    test: false,
    zod: false,
    openapi: false,
    git: 'auto',
    here: false,
  });
});

test('--yes never prompts and defaults every option to false', async () => {
  const o = await run(['--yes'], never);
  assert.deepEqual(o, {
    limiter: false,
    mongo: false,
    auth: false,
    rxjs: false,
    pm: 'npm',
    install: true,
    docker: false,
    test: false,
    zod: false,
    openapi: false,
    git: 'auto',
    here: false,
  });
});

test('no ask function and no flags falls back to defaults', async () => {
  const o = await run([], undefined);
  assert.equal(o.mongo, false);
});

test('prompts fill unflagged options; mongo-only questions skipped when mongo is no', async () => {
  const asked = [];
  const ask = async (q) => {
    asked.push(q);
    return /rate-limit/.test(q);
  };
  const o = await run([], ask);
  assert.equal(o.limiter, true);
  assert.equal(o.mongo, false);
  assert.equal(asked.length, 2); // limiter + mongo only
});

test('auth/rxjs questions asked when mongo answered yes', async () => {
  const asked = [];
  const ask = async (q) => {
    asked.push(q);
    return true;
  };
  const o = await run([], ask);
  assert.equal(asked.length, 4);
  assert.equal(o.auth && o.rxjs && o.mongo && o.limiter, true);
});

test('--auth or --rxjs without --mongo is rejected', async () => {
  await assert.rejects(run(['--auth'], undefined), /require --mongo/);
  await assert.rejects(run(['--rxjs'], undefined), /require --mongo/);
});

test('unknown --pm is rejected', () => {
  assert.throws(() => parseCli(['--pm', 'bun']), /--pm/);
});

test('--docker is flag-only: set by flag, never prompted', async () => {
  const asked = [];
  const ask = async (q) => {
    asked.push(q);
    return false;
  };
  assert.equal((await run(['--docker'], ask)).docker, true);
  assert.equal((await run([], ask)).docker, false);
  assert.ok(asked.every((q) => !/docker/i.test(q)));
});

test('--test is flag-only: set by flag, never prompted', async () => {
  const ask = async (q) => {
    assert.ok(!/test/i.test(q), 'no prompt for --test');
    return false;
  };
  assert.equal((await run(['--test'], ask)).test, true);
  assert.equal((await run([], ask)).test, false);
});

test('--git forces, --no-git disables, default is auto', async () => {
  assert.equal((await run(['--git'])).git, true);
  assert.equal((await run(['--no-git'])).git, false);
  assert.equal((await run([])).git, 'auto');
  assert.throws(() => parseCli(['--git', '--no-git']), /--git/);
});

test('package manager comes from --pm, else the invoking user agent, else npm', async () => {
  assert.equal(detectPm('pnpm/9.1.0 npm/? node/v22.0.0 win32 x64'), 'pnpm');
  assert.equal(detectPm('yarn/1.22.19 npm/? node/v20.0.0'), 'yarn');
  assert.equal(detectPm('npm/10.2.0 node/v22.0.0'), 'npm');
  assert.equal(detectPm('bun/1.0.0'), undefined);
  assert.equal(detectPm(undefined), undefined);
  const ua = { npm_config_user_agent: 'pnpm/9.1.0 node/v22' };
  assert.equal((await run([], undefined, ua)).pm, 'pnpm');
  assert.equal((await run(['--pm', 'yarn'], undefined, ua)).pm, 'yarn');
  assert.equal((await run([], undefined, {})).pm, 'npm');
});

test('validateName follows npm package-name rules', () => {
  for (const ok of ['express-ts', 'my.app', 'a_b', 'app2']) {
    assert.doesNotThrow(() => validateName(ok), ok);
  }
  for (const bad of ['My App', 'MyApp', '.hidden', '_x', '-x', 'a/b', '', 'x'.repeat(215)]) {
    assert.throws(() => validateName(bad), /name/i, bad);
  }
});

test('--here is a plain boolean flag', async () => {
  assert.equal((await run(['--here'])).here, true);
});

test('--zod is flag-only: set by flag, never prompted', async () => {
  const ask = async (q) => {
    assert.ok(!/zod|validat/i.test(q), 'no prompt for --zod');
    return false;
  };
  assert.equal((await run(['--zod'], ask)).zod, true);
  assert.equal((await run([], ask)).zod, false);
});

test('--openapi is flag-only and requires --zod', async () => {
  const ask = async (q) => {
    assert.ok(!/openapi|swagger/i.test(q), 'no prompt for --openapi');
    return false;
  };
  const o = await run(['--zod', '--openapi'], ask);
  assert.equal(o.openapi, true);
  assert.equal((await run([], ask)).openapi, false);
  assert.throws(() => parseCli(['--openapi']), /--openapi requires --zod/);
});
