import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  detectPm,
  loadConfig,
  parseCli,
  PRESETS,
  resolveOptions,
  validateName,
} from '../lib/options.js';

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
    db: 'mongo',
    auth: true,
    rxjs: true,
    pm: 'pnpm',
    install: false,
    git: 'auto',
    here: false,
    zod: false,
    openapi: false,
    ci: false,
    agents: true,
    docker: false,
    test: false,
    zod: false,
    openapi: false,
    ci: false,
    agents: true,
    git: 'auto',
    here: false,
  });
});

test('--yes never prompts and defaults every option to false', async () => {
  const o = await run(['--yes'], never);
  assert.deepEqual(o, {
    limiter: false,
    db: null,
    auth: false,
    rxjs: false,
    pm: 'npm',
    install: true,
    docker: false,
    test: false,
    zod: false,
    openapi: false,
    ci: false,
    agents: true,
    git: 'auto',
    here: false,
  });
});

test('no ask function and no flags falls back to defaults', async () => {
  const o = await run([], undefined);
  assert.equal(o.db, null);
});

test('prompts fill unflagged options; db-only questions skipped when no db is chosen', async () => {
  const asked = [];
  const ask = async (q) => {
    asked.push(q);
    return /rate-limit/.test(q);
  };
  const o = await run([], ask);
  assert.equal(o.limiter, true);
  assert.equal(o.db, null);
  assert.equal(asked.length, 3); // limiter + mongo + postgres only
});

test('auth/rxjs questions asked when mongo answered yes', async () => {
  const asked = [];
  const ask = async (q) => {
    asked.push(q);
    return true;
  };
  const o = await run([], ask);
  assert.equal(asked.length, 4);
  assert.equal(o.auth && o.rxjs && o.db === 'mongo' && o.limiter, true);
});

test('--auth or --rxjs without --mongo is rejected', async () => {
  await assert.rejects(run(['--auth'], undefined), /require a database/);
  await assert.rejects(run(['--rxjs'], undefined), /require a database/);
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

test('--postgres selects the postgres db', async () => {
  const o = await run(['--postgres', '--auth', '--rxjs', '--limiter'], never);
  assert.equal(o.db, 'postgres');
  assert.equal(o.auth && o.rxjs, true);
});

test('--mongo and --postgres together are rejected', () => {
  assert.throws(() => parseCli(['--mongo', '--postgres']), /--mongo.*--postgres/);
});

test('postgres question is asked only when mongo is answered no; yes enables auth/rxjs questions', async () => {
  const asked = [];
  const ask = async (q) => {
    asked.push(q);
    return /PostgreSQL|auth|rxjs/i.test(q);
  };
  const o = await run([], ask);
  assert.equal(o.db, 'postgres');
  assert.equal(asked.length, 5); // limiter, mongo, postgres, auth, rxjs

  const asked2 = [];
  const ask2 = async (q) => {
    asked2.push(q);
    return /MongoDB|auth|rxjs/i.test(q);
  };
  const o2 = await run([], ask2);
  assert.equal(o2.db, 'mongo');
  assert.ok(asked2.every((q) => !/PostgreSQL/i.test(q)), 'no postgres prompt after mongo yes');
});

test('--auth without any db names both database flags', async () => {
  await assert.rejects(run(['--auth'], undefined), /--mongo or --postgres/);
});

test('--ci is flag-only: set by flag, never prompted', async () => {
  const ask = async (q) => {
    assert.ok(!/\bci\b|github|workflow/i.test(q), 'no prompt for --ci');
    return false;
  };
  assert.equal((await run(['--ci'], ask)).ci, true);
  assert.equal((await run([], ask)).ci, false);
});

test('--no-agents is the only way to skip AGENTS.md (on by default, no prompt)', async () => {
  const ask = async (q) => {
    assert.ok(!/agent/i.test(q), 'no prompt for AGENTS.md');
    return false;
  };
  assert.equal((await run([], ask)).agents, true);
  assert.equal((await run(['--no-agents'], ask)).agents, false);
});

test('--preset expands to flags and answers every question (implies --yes)', async () => {
  const api = parseCli(['--preset', 'api']).values;
  for (const k of ['postgres', 'auth', 'zod', 'openapi', 'test', 'yes']) assert.equal(api[k], true, k);
  assert.ok(!api.ci && !api.docker && !api.limiter);

  const full = parseCli(['--preset', 'full']).values;
  for (const k of ['postgres', 'auth', 'zod', 'openapi', 'test', 'ci', 'docker', 'limiter']) {
    assert.equal(full[k], true, k);
  }

  const minimal = parseCli(['--preset', 'minimal']).values;
  assert.equal(minimal.yes, true);
  assert.ok(!minimal.postgres && !minimal.mongo && !minimal.auth);

  // a preset never prompts
  const o2 = await resolveOptions(parseCli(['--preset', 'api']).values, never);
  assert.equal(o2.db, 'postgres');
  assert.deepEqual([o2.auth, o2.zod, o2.openapi, o2.test], [true, true, true, true]);
  assert.deepEqual(Object.keys(PRESETS).sort(), ['api', 'full', 'minimal']);
});

test('--preset: explicit flags add on top, --mongo replaces the preset database, unknown name is an error', () => {
  const plus = parseCli(['--preset', 'api', '--docker', '--rxjs']).values;
  assert.equal(plus.docker, true);
  assert.equal(plus.rxjs, true);

  const mongo = parseCli(['--preset', 'api', '--mongo']).values;
  assert.equal(mongo.mongo, true);
  assert.ok(!mongo.postgres, 'explicit --mongo replaces the preset postgres');
  assert.equal(mongo.auth, true);

  assert.throws(() => parseCli(['--preset', 'huge']), /minimal, api, full/);
});

test('config file layer: preset < config < command line', () => {
  // config adds to nothing
  assert.equal(parseCli([], { config: { postgres: true, zod: true } }).values.zod, true);
  // cli beats config
  assert.equal(parseCli(['--pm', 'yarn'], { config: { pm: 'pnpm' } }).values.pm, 'yarn');
  assert.equal(parseCli([], { config: { pm: 'pnpm' } }).values.pm, 'pnpm');
  // config beats a preset's database
  const v = parseCli([], { config: { preset: 'api', mongo: true } }).values;
  assert.equal(v.mongo, true);
  assert.ok(!v.postgres);
  // cross-layer rules use the merged result: --openapi is fine when the config enables zod
  assert.doesNotThrow(() => parseCli(['--openapi'], { config: { zod: true } }));
  assert.throws(() => parseCli(['--openapi'], { config: {} }), /--openapi requires --zod/);
  // cli preset beats config preset
  assert.equal(parseCli(['--preset', 'minimal'], { config: { preset: 'full' } }).values.docker, undefined);
  // config booleans for git / agents map to the negative flags
  const g = parseCli([], { config: { git: false, agents: false } }).values;
  assert.equal(g['no-git'], true);
  assert.equal(g['no-agents'], true);
});

test('loadConfig: current directory overrides home; errors name the file and key', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mfgrc-'));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'work');
  mkdirSync(home);
  mkdirSync(cwd);
  assert.deepEqual(loadConfig({ cwd, home }), {}, 'no files: empty config');

  writeFileSync(path.join(home, '.mfgrc.json'), JSON.stringify({ pm: 'yarn', zod: true }));
  writeFileSync(path.join(cwd, '.mfgrc.json'), JSON.stringify({ pm: 'pnpm' }));
  assert.deepEqual(loadConfig({ cwd, home }), { pm: 'pnpm', zod: true });

  writeFileSync(path.join(cwd, '.mfgrc.json'), '{ not json');
  assert.throws(() => loadConfig({ cwd, home }), /\.mfgrc\.json.*invalid JSON/);

  writeFileSync(path.join(cwd, '.mfgrc.json'), JSON.stringify({ banana: true }));
  assert.throws(() => loadConfig({ cwd, home }), /\.mfgrc\.json.*unknown option "banana"/);

  writeFileSync(path.join(cwd, '.mfgrc.json'), JSON.stringify({ here: true }));
  assert.throws(() => loadConfig({ cwd, home }), /"here" can only be passed on the command line/);

  writeFileSync(path.join(cwd, '.mfgrc.json'), JSON.stringify({ zod: 'yes' }));
  assert.throws(() => loadConfig({ cwd, home }), /"zod" must be true or false/);

  writeFileSync(path.join(cwd, '.mfgrc.json'), JSON.stringify({ preset: 'nope' }));
  assert.throws(() => loadConfig({ cwd, home }), /preset/);
});
