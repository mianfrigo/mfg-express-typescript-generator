import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCli, resolveOptions } from '../lib/options.js';

const run = (argv, ask) => resolveOptions(parseCli(argv).values, ask);
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
    docker: false,
    test: false,
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
