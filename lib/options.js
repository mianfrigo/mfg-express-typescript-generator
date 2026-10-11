import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';

const PMS = ['npm', 'pnpm', 'yarn'];

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
      pm: { type: 'string', default: 'npm' },
      'no-install': { type: 'boolean' },
      version: { type: 'boolean', short: 'v' },
    },
  });
  if (!PMS.includes(values.pm)) {
    throw new Error(`--pm must be one of: ${PMS.join(', ')}`);
  }
  return { values, positionals };
}

export async function resolveOptions(values, ask) {
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
    pm: values.pm,
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
