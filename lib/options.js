import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';

const PMS = ['npm', 'pnpm', 'yarn'];

// A preset is a bundle of flags. Explicit flags are added on top; an explicit
// database flag replaces the preset's database.
export const PRESETS = {
  minimal: {},
  api: { postgres: true, auth: true, zod: true, openapi: true, test: true },
  full: {
    postgres: true,
    auth: true,
    zod: true,
    openapi: true,
    test: true,
    ci: true,
    docker: true,
    limiter: true,
  },
};

const BOOLEAN_KEYS = [
  'mongo',
  'postgres',
  'limiter',
  'auth',
  'rxjs',
  'docker',
  'test',
  'zod',
  'openapi',
  'ci',
  'git',
  'agents',
];
const CONFIG_KEYS = [...BOOLEAN_KEYS, 'pm', 'preset'];
const CLI_ONLY = ['yes', 'here', 'no-install', 'no-config', 'version'];
const CONFIG_FILE = '.mfgrc.json';

const presetError = (name) =>
  new Error(
    `unknown preset "${name}". Valid presets: ${Object.keys(PRESETS).join(', ')}`
  );

// .mfgrc.json: the home directory first, the current directory overrides it.
export function loadConfig({ cwd = process.cwd(), home = os.homedir() } = {}) {
  const files = [...new Set([path.join(home, CONFIG_FILE), path.join(cwd, CONFIG_FILE)])];
  const merged = {};
  for (const file of files) {
    if (!existsSync(file)) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      throw new Error(`${file}: invalid JSON (${err.message})`);
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error(`${file}: expected a JSON object`);
    }
    for (const [key, value] of Object.entries(data)) {
      if (CLI_ONLY.includes(key)) {
        throw new Error(`${file}: "${key}" can only be passed on the command line`);
      }
      if (!CONFIG_KEYS.includes(key)) {
        throw new Error(
          `${file}: unknown option "${key}" (allowed: ${CONFIG_KEYS.join(', ')})`
        );
      }
      if (BOOLEAN_KEYS.includes(key) && typeof value !== 'boolean') {
        throw new Error(`${file}: "${key}" must be true or false`);
      }
      if (key === 'pm' && !PMS.includes(value)) {
        throw new Error(`${file}: "pm" must be one of: ${PMS.join(', ')}`);
      }
      if (key === 'preset' && !PRESETS[value]) {
        throw new Error(`${file}: preset: ${presetError(value).message}`);
      }
    }
    Object.assign(merged, data);
  }
  return merged;
}

// Config booleans mirror the CLI: git:false is --no-git, agents:false is --no-agents.
function fromConfig(config) {
  const out = {};
  for (const [key, value] of Object.entries(config)) {
    if (key === 'preset') continue;
    if (key === 'git') {
      if (value) out.git = true;
      else out['no-git'] = true;
    } else if (key === 'agents') {
      if (!value) out['no-agents'] = true;
    } else {
      out[key] = value;
    }
  }
  return out;
}

// preset < config file < command line. A later layer that picks a database
// replaces the earlier layer's database.
function layerValues(cli, config) {
  const out = {};
  const apply = (layer) => {
    if (layer.mongo) delete out.postgres;
    if (layer.postgres) delete out.mongo;
    if (layer['no-git']) delete out.git;
    if (layer.git) delete out['no-git'];
    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) out[key] = value;
    }
  };
  const presetName = cli.preset ?? config.preset;
  if (presetName !== undefined) {
    if (!PRESETS[presetName]) throw presetError(presetName);
    apply(PRESETS[presetName]);
    out.yes = true; // a preset answers every question
  }
  apply(fromConfig(config));
  apply(cli);
  return out;
}

// "pnpm/9.1.0 npm/? node/v22 ..." -> "pnpm"; unknown tools fall through to npm
export function detectPm(userAgent = '') {
  const name = userAgent.split('/')[0];
  return PMS.includes(name) ? name : undefined;
}

// npm package-name rules, minus scopes (the folder name becomes package.json name)
export function validateName(name) {
  if (!/^[a-z0-9][a-z0-9._-]{0,213}$/.test(name)) {
    throw new Error(
      `Invalid project name "${name}": use lowercase letters, digits, "-", "_" ` +
        'or ".", start with a letter or digit, max 214 characters.'
    );
  }
}

export function parseCli(argv, { config = {} } = {}) {
  const { values: cli, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      yes: { type: 'boolean', short: 'y' },
      mongo: { type: 'boolean' },
      postgres: { type: 'boolean' },
      limiter: { type: 'boolean' },
      auth: { type: 'boolean' },
      rxjs: { type: 'boolean' },
      docker: { type: 'boolean' },
      test: { type: 'boolean' },
      zod: { type: 'boolean' },
      openapi: { type: 'boolean' },
      ci: { type: 'boolean' },
      pm: { type: 'string' },
      git: { type: 'boolean' },
      'no-git': { type: 'boolean' },
      here: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      'no-agents': { type: 'boolean' },
      preset: { type: 'string' },
      'no-config': { type: 'boolean' },
      version: { type: 'boolean', short: 'v' },
    },
  });
  if (cli.pm !== undefined && !PMS.includes(cli.pm)) {
    throw new Error(`--pm must be one of: ${PMS.join(', ')}`);
  }
  if (cli.mongo && cli.postgres) {
    throw new Error('--mongo and --postgres cannot be used together');
  }
  const values = layerValues(cli, config);
  if (values.openapi && !values.zod) {
    throw new Error(
      '--openapi requires --zod (the spec is generated from the zod schemas)'
    );
  }
  if (values.git && values['no-git']) {
    throw new Error('--git and --no-git cannot be used together');
  }
  return { values, positionals };
}

export async function resolveOptions(values, ask, env = process.env) {
  const prompt = !values.yes && ask;
  const get = async (key, question) =>
    values[key] ?? (prompt ? await ask(question) : false);

  const limiter = await get('limiter', 'Setup express-rate-limit on routes?');
  // an explicit --postgres already answers the database question
  const mongo = values.postgres ? false : await get('mongo', 'Setup MongoDB with mongoose?');
  const postgres =
    !mongo && (await get('postgres', 'Setup PostgreSQL with Prisma?'));
  const db = mongo ? 'mongo' : postgres ? 'postgres' : null;
  if (!db && (values.auth || values.rxjs)) {
    throw new Error(
      '--auth and --rxjs require a database (--mongo or --postgres)'
    );
  }
  const auth = !!db && (await get('auth', 'Create an authentication route?'));
  const rxjs = !!db && (await get('rxjs', 'Use rxjs instead of promises?'));
  return {
    limiter,
    db,
    auth,
    rxjs,
    pm: values.pm ?? detectPm(env.npm_config_user_agent) ?? 'npm',
    git: values['no-git'] ? false : values.git ? true : 'auto',
    here: values.here ?? false,
    install: !values['no-install'],
    docker: values.docker ?? false, // flag-only, no prompt
    test: values.test ?? false, // flag-only, no prompt
    zod: values.zod ?? false, // flag-only, no prompt
    openapi: values.openapi ?? false, // flag-only, no prompt
    ci: values.ci ?? false, // flag-only, no prompt
    agents: !values['no-agents'], // on unless --no-agents
  };
}

export function createAsk() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q) =>
    /^y(es)?$/i.test((await rl.question(`${q} (y/N) `)).trim());
  ask.close = () => rl.close();
  return ask;
}
