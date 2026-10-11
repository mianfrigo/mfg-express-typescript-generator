import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';

const PMS = ['npm', 'pnpm', 'yarn'];

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

export function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      yes: { type: 'boolean', short: 'y' },
      mongo: { type: 'boolean' },
      limiter: { type: 'boolean' },
      auth: { type: 'boolean' },
      rxjs: { type: 'boolean' },
      docker: { type: 'boolean' },
      test: { type: 'boolean' },
      pm: { type: 'string' },
      git: { type: 'boolean' },
      'no-git': { type: 'boolean' },
      here: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      version: { type: 'boolean', short: 'v' },
    },
  });
  if (values.pm !== undefined && !PMS.includes(values.pm)) {
    throw new Error(`--pm must be one of: ${PMS.join(', ')}`);
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
  const mongo = await get('mongo', 'Setup MongoDB with mongoose?');
  if (!mongo && (values.auth || values.rxjs)) {
    throw new Error('--auth and --rxjs require --mongo');
  }
  const auth = mongo && (await get('auth', 'Create an authentication route?'));
  const rxjs = mongo && (await get('rxjs', 'Use rxjs instead of promises?'));
  return {
    limiter,
    mongo,
    auth,
    rxjs,
    pm: values.pm ?? detectPm(env.npm_config_user_agent) ?? 'npm',
    git: values['no-git'] ? false : values.git ? true : 'auto',
    here: values.here ?? false,
    install: !values['no-install'],
    docker: values.docker ?? false, // flag-only, no prompt
    test: values.test ?? false, // flag-only, no prompt
  };
}

export function createAsk() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q) =>
    /^y(es)?$/i.test((await rl.question(`${q} (y/N) `)).trim());
  ask.close = () => rl.close();
  return ask;
}
