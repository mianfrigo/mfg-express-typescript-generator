import { PRESETS } from './options.js';

// Interactive project picker (arrow keys, space, enter), built on @clack/prompts.
// Everything it returns is plain flag values, so it goes through the same option
// resolution as a command line. The prompts library is injected so the logic is
// testable without a terminal.

const FEATURE_FLAGS = [
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
  'roles',
];
const FLAG_ORDER = [
  'postgres',
  'mongo',
  'auth',
  'roles',
  'zod',
  'openapi',
  'limiter',
  'rxjs',
  'test',
  'ci',
  'docker',
];

export const toFlags = (flags) =>
  FLAG_ORDER.filter((k) => flags[k]).map((k) => `--${k}`);

// Only on a real terminal, and only when nothing has been decided yet
// (partial flags keep today's yes/no questions for the rest).
export function shouldRunWizard(values, { stdin, stdout }) {
  if (!stdin || !stdout) return false;
  if (values.yes || values.preset) return false;
  return !FEATURE_FLAGS.some((k) => values[k]);
}

const presetOf = (flags) =>
  Object.entries(PRESETS).find(
    ([, preset]) =>
      JSON.stringify(Object.keys(preset).sort()) ===
      JSON.stringify(Object.keys(flags).filter((k) => flags[k]).sort())
  )?.[0];

const START = [
  { value: 'minimal', label: 'Minimal', hint: 'in-memory sample app, nothing else' },
  {
    value: 'api',
    label: 'API starter',
    hint: 'PostgreSQL, auth, validation, Swagger, tests',
  },
  {
    value: 'full',
    label: 'Full',
    hint: 'API starter plus CI, Docker and rate limiting',
  },
  { value: 'custom', label: 'Custom...', hint: 'choose each piece' },
];

// Returns the chosen flags, or null if the user cancelled or declined.
export async function runWizard({ prompts, io = {}, projectName = 'express-ts' }) {
  const ask = (fn, opts) => fn({ ...opts, ...io });
  const cancelled = (v) => prompts.isCancel(v);

  const start = await ask(prompts.select, {
    message: 'How do you want to start?',
    options: START,
  });
  if (cancelled(start)) return null;

  let flags;
  let command;
  if (start !== 'custom') {
    flags = { ...PRESETS[start] };
    command = start === 'minimal' ? '' : `--preset ${start}`;
  } else {
    const db = await ask(prompts.select, {
      message: 'Database',
      options: [
        { value: 'none', label: 'None', hint: 'in-memory sample data' },
        { value: 'postgres', label: 'PostgreSQL', hint: 'Prisma, migrations' },
        { value: 'mongo', label: 'MongoDB', hint: 'mongoose' },
      ],
    });
    if (cancelled(db)) return null;
    const hasDb = db !== 'none';
    const needsDb = hasDb ? undefined : 'needs a database';

    const picked = await ask(prompts.multiselect, {
      message: 'Features (space to toggle, enter to continue)',
      required: false,
      options: [
        { value: 'zod', label: 'Request validation', hint: 'zod' },
        {
          value: 'auth',
          label: 'Authentication',
          hint: needsDb ?? 'JWT, register and login',
          disabled: !hasDb,
        },
        {
          value: 'rxjs',
          label: 'rxjs controllers',
          hint: needsDb ?? 'instead of promises',
          disabled: !hasDb,
        },
        { value: 'limiter', label: 'Rate limiting', hint: 'express-rate-limit' },
        { value: 'test', label: 'Tests', hint: 'vitest + supertest' },
        { value: 'ci', label: 'GitHub Actions CI' },
        { value: 'docker', label: 'Docker', hint: 'Dockerfile + compose' },
      ],
    });
    if (cancelled(picked)) return null;

    flags = {};
    if (hasDb) flags[db] = true;
    for (const key of picked) flags[key] = true;

    if (flags.zod) {
      const openapi = await ask(prompts.confirm, {
        message: 'Serve Swagger UI / OpenAPI docs?',
        initialValue: true,
      });
      if (cancelled(openapi)) return null;
      if (openapi) flags.openapi = true;
    }
    command = toFlags(flags).join(' ');
    // an exact match with a preset reads better as the preset
    const match = presetOf(flags);
    if (match && match !== 'minimal') command = `--preset ${match}`;
  }

  prompts.note(
    `npx @mianfrigo/express-typescript-generator ${projectName}${command ? ` ${command}` : ''}`,
    'Equivalent command',
    io
  );
  const go = await ask(prompts.confirm, {
    message: `Create ${projectName}?`,
    initialValue: true,
  });
  if (cancelled(go) || !go) return null;
  return flags;
}
