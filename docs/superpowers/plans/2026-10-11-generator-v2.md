# Generator v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v2.0.0 of the generator: zero-dependency ESM CLI with flags, and a modern, bug-fixed generated Express + TypeScript app.

**Architecture:** `bin/cli.js` parses flags/prompts (`lib/options.js`), then `lib/generate.js` copies template folders with `fs.cp`, writes `package.json` with pinned versions, renders `routes/index.ts` from a marker, runs `git init` and the package manager. Templates under `lib/` keep their layout; contents are rewritten.

**Tech Stack:** Node >= 20.19 stdlib only (`node:util` parseArgs/styleText, `node:readline/promises`, `node:fs/promises`, `node:test`). Generated app: Express 5, Mongoose 9, express-rate-limit 8, TypeScript 5.9, tsx, ESLint 10 flat config.

**Spec:** `docs/superpowers/specs/2026-10-11-generator-v2-design.md`

## Global Constraints

- Generator: no runtime dependencies, no build step, `"type": "module"`, `"engines": {"node": ">=20.19"}`.
- Version `2.0.0`.
- Flags: `--yes/-y`, `--mongo`, `--limiter`, `--auth`, `--rxjs`, `--pm npm|pnpm|yarn`, `--no-install`, `--version/-v`.
- `--auth` and `--rxjs` require `--mongo`.
- Any failure: print message to stderr, exit code 1.
- Generated app scripts: `build: tsc`, `dev: tsx watch src/index.ts`, `start: node dist/index.js`, `lint: eslint .`.
- Generated app has no webpack, nodemon, ts-loader, airbnb, auto-bind, mongoose-unique-validator, `@types/mongoose*`, `@types/express-rate-limit`.
- Versions, verified with `npm view` on 2026-10-11 (differ from spec: spec said Mongoose 8 / rate-limit 7, latest majors are used instead; `typescript` stays 5.9.3 because `typescript-eslint` peer is `<6.1.0`; `auto-bind` is dropped because v5 is ESM-only and generated output is CommonJS):

| package | version |
|---|---|
| express | 5.3.0 |
| helmet | 8.3.0 |
| morgan | 1.12.1 |
| winston | 3.19.0 |
| dotenv | 18.0.7 |
| cors | 2.8.6 |
| http-errors | 2.0.1 |
| express-rate-limit | 8.7.1 |
| mongoose | 9.11.1 |
| rxjs | 7.8.2 |
| bcryptjs | 3.0.3 |
| jsonwebtoken | 9.0.3 |
| typescript | 5.9.3 |
| tsx | 4.23.15 |
| eslint | 10.12.0 |
| @eslint/js | 10.0.1 |
| typescript-eslint | 8.71.1 |
| eslint-config-prettier | 10.1.8 |
| prettier | 3.9.10 |
| @types/node | 26.6.5 |
| @types/express | 5.0.6 |
| @types/cors | 2.8.19 |
| @types/morgan | 1.9.10 |
| @types/http-errors | 2.0.5 |
| @types/jsonwebtoken | 9.0.10 |

## Review Focus

1. `--auth` / `--rxjs` without `--mongo` — expected: exit 1, message names `--mongo` (Task 1 test).
2. Target directory already exists — expected: exit 1, existing files untouched (Task 2 test).
3. stdin not a TTY and no `--yes` — expected: defaults used, no hang (Task 2 test).
4. Login body with non-string `email` (e.g. `{"$ne":null}`) — expected: 400, never reaches the query (Task 3 content assertion; runtime needs a live MongoDB so not exercised).
5. Invalid ObjectId / duplicate email / validation failure — expected: 400 / 409 / 400, not 500 (Task 3 content assertion on `errorHandler.ts`; runtime not exercised).
6. Every flag combination must compile and lint — expected: `tsc` and `eslint .` exit 0 (Task 4 `FULL=1` test).

---

### Task 1: Options parsing and prompts

**Files:**
- Create: `lib/options.js`
- Create: `test/options.test.js`
- Modify: `package.json` (add `"type": "module"`)

**Interfaces:**
- Produces: `parseCli(argv: string[]) => { values, positionals }` (throws on bad `--pm`); `resolveOptions(values, ask?: (q: string) => Promise<boolean>) => Promise<{ limiter: boolean, mongo: boolean, auth: boolean, rxjs: boolean, pm: string, install: boolean }>` (throws on `--auth`/`--rxjs` without mongo); `createAsk() => ask & { close(): void }`.

- [ ] **Step 1: Mark package as ESM**

In `package.json` add `"type": "module",` after the `"description"` line.

- [ ] **Step 2: Write the failing test** — `test/options.test.js`

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/options.test.js`
Expected: FAIL, `Cannot find module '.../lib/options.js'`.

- [ ] **Step 4: Write implementation** — `lib/options.js`

```js
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
  };
}

export function createAsk() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q) =>
    /^y(es)?$/i.test((await rl.question(`${q} (y/N) `)).trim());
  ask.close = () => rl.close();
  return ask;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/options.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/options.js test/options.test.js
git commit -m "feat: add flag parsing and prompts (esm, stdlib only)"
```

---

### Task 2: Generator core, CLI entry, smoke test

**Files:**
- Create: `lib/generate.js`
- Create: `test/smoke.test.js`
- Rewrite: `bin/cli.js`
- Rename: `lib/common_files/configFiles/.gitignore` -> `lib/common_files/configFiles/gitignore` (npm strips `.gitignore` from tarballs; generator renames it back)
- Modify: `lib/common_files/src/routes/index.ts`
- Modify: `package.json` (version, bin unchanged, `files`, `engines`, `scripts.test`, remove `dependencies`, `devDependencies`, `script`, `directories`)
- Delete: `lib/cli-question.js`, `lib/utilities.js`, `lib/express-generator.js`

**Interfaces:**
- Consumes: `parseCli`, `resolveOptions`, `createAsk` from `lib/options.js` (Task 1).
- Produces: `generateApp(dest: string, options) => Promise<void>` and `renderRoutesIndex(src: string, auth: boolean) => string` from `lib/generate.js`. Marker syntax in `routes/index.ts`: a line starting with `//{{auth}} ` is kept (prefix stripped) when `auth`, dropped otherwise.

- [ ] **Step 1: Write the failing smoke test** — `test/smoke.test.js`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/smoke.test.js`
Expected: FAIL (old CommonJS `bin/cli.js` errors under `"type": "module"`, or `--mongo` unknown).

- [ ] **Step 3: Rename gitignore and put markers in routes index**

```bash
git mv lib/common_files/configFiles/.gitignore lib/common_files/configFiles/gitignore
```

Replace the whole content of `lib/common_files/src/routes/index.ts`:

```ts
import { Router } from 'express';
//{{auth}} import authRoute from './auth.route';
import userRoute from './user.route';

const router = Router();

router.use('/user', userRoute);
//{{auth}} router.use('/auth', authRoute);

export default router;
```

- [ ] **Step 4: Write `lib/generate.js`**

```js
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFile, cp, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lib = path.dirname(fileURLToPath(import.meta.url));
const AUTH_MARK = '//{{auth}} ';

// Exact versions. Bump here, then run `FULL=1 node --test`.
const BASE = {
  dependencies: {
    express: '5.3.0',
    helmet: '8.3.0',
    morgan: '1.12.1',
    winston: '3.19.0',
    dotenv: '18.0.7',
    cors: '2.8.6',
    'http-errors': '2.0.1',
  },
  devDependencies: {
    typescript: '5.9.3',
    tsx: '4.23.15',
    eslint: '10.12.0',
    '@eslint/js': '10.0.1',
    'typescript-eslint': '8.71.1',
    'eslint-config-prettier': '10.1.8',
    prettier: '3.9.10',
    '@types/node': '26.6.5',
    '@types/express': '5.0.6',
    '@types/cors': '2.8.19',
    '@types/morgan': '1.9.10',
    '@types/http-errors': '2.0.5',
  },
};

const EXTRA = {
  limiter: { dependencies: { 'express-rate-limit': '8.7.1' } },
  mongo: { dependencies: { mongoose: '9.11.1' } },
  rxjs: { dependencies: { rxjs: '7.8.2' } },
  auth: {
    dependencies: { bcryptjs: '3.0.3', jsonwebtoken: '9.0.3' },
    devDependencies: { '@types/jsonwebtoken': '9.0.10' },
  },
};

function buildPackageJson(name, options) {
  const pkg = {
    name,
    version: '0.1.0',
    private: true,
    description: 'My new project',
    scripts: {
      start: 'node dist/index.js',
      build: 'tsc',
      dev: 'tsx watch src/index.ts',
      lint: 'eslint .',
    },
    engines: { node: '>=20.19' },
    dependencies: { ...BASE.dependencies },
    devDependencies: { ...BASE.devDependencies },
  };
  for (const key of Object.keys(EXTRA)) {
    if (!options[key]) continue;
    Object.assign(pkg.dependencies, EXTRA[key].dependencies);
    Object.assign(pkg.devDependencies, EXTRA[key].devDependencies);
  }
  return pkg;
}

export function renderRoutesIndex(src, auth) {
  return src
    .split('\n')
    .flatMap((line) => {
      if (!line.startsWith(AUTH_MARK)) return [line];
      return auth ? [line.slice(AUTH_MARK.length)] : [];
    })
    .join('\n');
}

function run(cmd, args, cwd, stdio = 'inherit') {
  return new Promise((resolve, reject) => {
    // shell on Windows: Node refuses to spawn npm.cmd/pnpm.cmd without it
    const child = spawn(cmd, args, {
      cwd,
      stdio,
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code || signal) {
        reject(new Error(`${cmd} ${args.join(' ')} failed (${code ?? signal})`));
      } else {
        resolve();
      }
    });
  });
}

export async function generateApp(dest, options) {
  const src = (...p) => path.join(lib, ...p);
  const out = (...p) => path.join(dest, ...p);
  const copy = (from, to) => cp(from, to, { recursive: true });
  const limiter = options.limiter ? 'with-limiter' : 'no-limiter';
  const style = options.rxjs ? 'with-rxjs' : 'no-rxjs';

  await copy(
    src(options.mongo ? 'express-typescript-with-mongo' : 'express-typescript'),
    dest
  );
  await copy(src('common_files/src'), out('src'));
  await copy(src('common_files/configFiles'), dest);
  await rename(out('gitignore'), out('.gitignore'));
  await copy(
    src('template-options/limiter-option/route', limiter),
    out('src/routes')
  );
  if (options.limiter) {
    await copy(
      src('template-options/limiter-option/middleware'),
      out('src/middleware')
    );
  }
  if (options.mongo) {
    await copy(src('template-options/mongo', style), out('src/controllers'));
  }
  if (options.auth) {
    await copy(src('template-options/auth/route', limiter), out('src/routes'));
    await copy(
      src('template-options/auth/controller', style),
      out('src/controllers')
    );
    await appendFile(
      out('.env'),
      `\nSECRET_KEY=${randomBytes(32).toString('hex')}\n`
    );
  }

  const routesIndex = out('src/routes/index.ts');
  await writeFile(
    routesIndex,
    renderRoutesIndex(await readFile(routesIndex, 'utf8'), options.auth)
  );
  await writeFile(
    out('package.json'),
    JSON.stringify(buildPackageJson(path.basename(dest), options), null, 2) +
      '\n'
  );

  await run('git', ['init', '-q'], dest, 'ignore').catch(() => {}); // git optional
  if (options.install) await run(options.pm, ['install'], dest);
}
```

- [ ] **Step 5: Rewrite `bin/cli.js`**

```js
#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { generateApp } from '../lib/generate.js';
import { createAsk, parseCli, resolveOptions } from '../lib/options.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

try {
  const { values, positionals } = parseCli(process.argv.slice(2));
  if (values.version) {
    console.log(`express-typescript-generator v${pkg.version}`);
    process.exit(0);
  }
  const dest = path.resolve(positionals[0] ?? 'express-ts');
  if (existsSync(dest)) {
    throw new Error(`${dest} already exists. Pick another name.`);
  }
  const ask = !values.yes && process.stdin.isTTY ? createAsk() : undefined;
  const options = await resolveOptions(values, ask);
  ask?.close();

  console.log(`\nBootstrapping Express app in ${styleText('green', dest)}\n`);
  await generateApp(dest, options);

  const run = options.pm === 'npm' ? 'npm run' : options.pm;
  console.log(`
Done. Next:
  cd ${path.basename(dest)}
  ${run} dev     start dev server (tsx watch)
  ${run} build   compile to dist/
  ${options.pm} start   run compiled server`);
} catch (err) {
  console.error(styleText('red', err.message));
  process.exit(1);
}
```

- [ ] **Step 6: Delete old files and rewrite root `package.json`**

```bash
git rm lib/cli-question.js lib/utilities.js lib/express-generator.js
```

Replace root `package.json` with:

```json
{
  "name": "@mianfrigo/express-typescript-generator",
  "version": "2.0.0",
  "description": "npm package to generate a boilerplate node express application with typescript",
  "type": "module",
  "main": "bin/cli.js",
  "bin": {
    "mfg-express-typescript-generator": "bin/cli.js",
    "mfg-express-generator": "bin/cli.js"
  },
  "files": [
    "bin",
    "lib"
  ],
  "engines": {
    "node": ">=20.19"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/mianfrigo/mfg-express-typescript-generator.git"
  },
  "keywords": [
    "express",
    "generator",
    "typescript",
    "express-ts",
    "scaffold",
    "boilerplate",
    "mongoose",
    "rxjs"
  ],
  "preferGlobal": true,
  "author": "Miguel Frias",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/mianfrigo/mfg-express-typescript-generator/issues"
  },
  "homepage": "https://github.com/mianfrigo/mfg-express-typescript-generator#readme",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `node --test`
Expected: PASS (options + smoke).

- [ ] **Step 8: Commit**

```bash
git add -A bin lib test package.json
git commit -m "feat: zero-dependency esm cli and generator core"
```

---

### Task 3: Rewrite generated-app templates

**Files (all paths under `lib/`):**
- Delete: `common_files/configFiles/.eslintrc.json`, `common_files/configFiles/webpack.config.js`, `common_files/configFiles/webpack.dev.config.js`
- Create: `common_files/configFiles/eslint.config.mjs`, `common_files/configFiles/.prettierrc.json`
- Rewrite: `common_files/configFiles/tsconfig.json`, `common_files/configFiles/gitignore`, `common_files/configFiles/README.md`
- Rewrite: `common_files/src/config/config.ts`
- Rewrite: `express-typescript/src/index.ts`, `express-typescript/src/middleware/errorHandler.ts`, `express-typescript/src/controllers/user.controller.ts`
- Rewrite: `express-typescript-with-mongo/src/index.ts`, `.../src/config/mongodb.config.ts`, `.../src/models/user.schema.ts`, `.../src/middleware/errorHandler.ts`
- Rewrite: `template-options/limiter-option/middleware/limiters.ts`, `.../route/no-limiter/user.route.ts`, `.../route/with-limiter/user.route.ts`
- Rewrite: `template-options/mongo/no-rxjs/user.controller.ts`, `template-options/mongo/with-rxjs/user.controller.ts`
- Rewrite: `template-options/auth/controller/no-rxjs/auth.controller.ts`, `.../with-rxjs/auth.controller.ts`, `template-options/auth/route/no-limiter/auth.route.ts`, `.../with-limiter/auth.route.ts`
- Modify: `test/smoke.test.js` (add assertions)

**Interfaces:**
- Consumes: marker contract and file layout from Task 2.
- Produces: generated projects whose `src/controllers/user.controller.ts` default-exports a class with arrow-function members `getUsers`, `getSingleUser`, `createUsers`, `removeUser`, `updateUser`; `auth.controller.ts` default-exports class with `authUser`; `limiters.ts` exports `mainLimiter`.

- [ ] **Step 1: Write the failing assertions** — append to `test/smoke.test.js`

Add `readdirSync` to the `node:fs` import, then append:

```js
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
  ]) {
    assert.ok(!ts.includes(bad), `found ${bad}`);
  }
  assert.ok(ts.includes("typeof email !== 'string'"), 'auth must validate input type');
  assert.ok(ts.includes("err.name === 'CastError'"), 'CastError must map to 400');
  assert.ok(ts.includes('11000'), 'duplicate key must map to 409');
  assert.ok(ts.includes('limit: 100'), 'rate-limit v8 option name');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/smoke.test.js`
Expected: FAIL on the two new tests (webpack files present, old patterns found).

- [ ] **Step 3: Remove old config files, write new config files**

```bash
git rm lib/common_files/configFiles/.eslintrc.json lib/common_files/configFiles/webpack.config.js lib/common_files/configFiles/webpack.dev.config.js
```

`lib/common_files/configFiles/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`lib/common_files/configFiles/eslint.config.mjs`:

```js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist', 'logs'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  }
);
```

`lib/common_files/configFiles/.prettierrc.json`:

```json
{ "singleQuote": true }
```

`lib/common_files/configFiles/gitignore`:

```
node_modules
dist
logs
.env
```

`lib/common_files/configFiles/README.md`:

````markdown
# Express + TypeScript app

Generated with [@mianfrigo/express-typescript-generator](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator).

## Scripts

- `npm run dev` — start with `tsx watch` at `http://localhost:3000/`.
- `npm run build` — compile to `dist/` with `tsc`.
- `npm start` — run the compiled server.
- `npm run lint` — ESLint (flat config) + Prettier rules.

## Notes

- Config lives in `.env` (never committed).
- CORS allow-list: `src/config/config.ts`.
- Logs are written to `logs/`.
- API base path: `/api/v1`.
````

- [ ] **Step 4: Write shared source** — `lib/common_files/src/config/config.ts`

```ts
import { CorsOptions } from 'cors';
import { Request, Response } from 'express';
import { TokenIndexer } from 'morgan';
import logger from './logger.config';

/* Cors Config  */
const corsOptions: CorsOptions = {
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'X-Access-Token',
    'Authorization',
  ],
  credentials: true,
  methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
};

export const corsOptionsWhiteList = (
  request: Request,
  callback: (err: Error | null, options?: CorsOptions) => void
) => {
  const whiteList = ['localhost:4200', 'localhost:3000'];
  const origin = request.header('origin') ?? request.header('host');
  if (origin && whiteList.some((host) => origin.includes(host))) {
    callback(null, { ...corsOptions, origin: true });
    return;
  }
  callback(new Error(`Origin not allowed by CORS: ${origin}`), {
    ...corsOptions,
    origin: false,
  });
};

export const morganConfig = (
  tokens: TokenIndexer,
  req: Request,
  res: Response
) => {
  const log = [
    tokens.method(req, res),
    tokens.url(req, res),
    '-',
    'statusCode:',
    tokens.status(req, res),
    '-',
    'response-size:',
    tokens.res(req, res, 'content-length'),
    '-',
    'response-time:',
    tokens['response-time'](req, res),
    'ms',
  ].join(' ');
  logger.info(log);
  return log;
};
```

- [ ] **Step 5: Error handler (both base and mongo)** — identical content for `lib/express-typescript/src/middleware/errorHandler.ts` and `lib/express-typescript-with-mongo/src/middleware/errorHandler.ts`

```ts
import { NextFunction, Request, Response } from 'express';
import createError, { HttpError } from 'http-errors';
import logger from '../config/logger.config';

export const notFound = (_req: Request, _res: Response, next: NextFunction) => {
  next(new createError.NotFound());
};

const statusOf = (err: HttpError & { code?: number }) => {
  if (err.status) return err.status;
  if (err.name === 'CastError' || err.name === 'ValidationError') return 400;
  if (err.code === 11000) return 409; // mongo duplicate key
  return 500;
};

export const handleError = (
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = statusOf(err);
  logger.error(
    `statusCode: ${statusCode}; message: ${err.message}; stack: ${err.stack};`
  );
  res.status(statusCode).json({ error: { statusCode, message: err.message } });
};
```

- [ ] **Step 6: Base app** — `lib/express-typescript/src/index.ts`

```ts
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptionsWhiteList, morganConfig } from './config/config';
import logger from './config/logger.config';
import { handleError, notFound } from './middleware/errorHandler';
import baseRoutes from './routes';

const app = express();

// Basic middlewares
app.use(morgan(morganConfig));
app.use(helmet());
app.use(cors(corsOptionsWhiteList));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// base routes
app.use('/api/v1', baseRoutes);

// Error handler
app.use(notFound);
app.use(handleError);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`connected to port ${port}`);
});
```

`lib/express-typescript/src/controllers/user.controller.ts`:

```ts
import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import users from '../db/data';

export default class UserController {
  getUsers = (_req: Request, res: Response) => {
    res.status(200).json(users);
  };

  getSingleUser = (req: Request, res: Response) => {
    const user = users.find((u) => u.id === Number(req.params.id));
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json(user);
  };

  createUsers = (req: Request, res: Response) => {
    const { first_name, last_name, email, gender } = req.body;
    const user = {
      id: users.length + 1,
      first_name,
      last_name,
      email,
      gender,
    };
    users.push(user);
    res.status(201).json(user);
  };

  removeUser = (req: Request, res: Response) => {
    res.status(200).json({
      message: `User ${req.params.id} successfully removed`,
    });
  };

  updateUser = (req: Request, res: Response) => {
    res.status(200).json({
      message: `User ${req.params.id} successfully updated`,
    });
  };
}
```

- [ ] **Step 7: Mongo app** — `lib/express-typescript-with-mongo/src/index.ts`

```ts
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptionsWhiteList, morganConfig } from './config/config';
import logger from './config/logger.config';
import connectMongo from './config/mongodb.config';
import { handleError, notFound } from './middleware/errorHandler';
import baseRoutes from './routes';

const app = express();

// Basic middlewares
app.use(morgan(morganConfig));
app.use(helmet());
app.use(cors(corsOptionsWhiteList));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// base routes
app.use('/api/v1', baseRoutes);

// Error handler
app.use(notFound);
app.use(handleError);

const port = process.env.PORT || 3000;

connectMongo()
  .then(() => {
    app.listen(port, () => {
      logger.info(`connected to port ${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    logger.error(String(err));
    process.exit(1);
  });
```

`lib/express-typescript-with-mongo/src/config/mongodb.config.ts`:

```ts
import mongoose from 'mongoose';
import logger from './logger.config';

export default async function connectMongo() {
  const uri = process.env.MONGO_DB;
  if (!uri) throw new Error('MONGO_DB is not set. Add it to your .env file.');
  await mongoose.connect(uri);
  logger.info('MongoDb connected');
}
```

`lib/express-typescript-with-mongo/src/models/user.schema.ts`:

```ts
import { model, Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
  },
  { timestamps: true }
);

export default model('User', UserSchema);
```

- [ ] **Step 8: Limiter templates**

`lib/template-options/limiter-option/middleware/limiters.ts`:

```ts
import rateLimit from 'express-rate-limit';

export const mainLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 100,
  message: {
    status: 429,
    message: 'Too Many Requests',
  },
});
```

`lib/template-options/limiter-option/route/no-limiter/user.route.ts`:

```ts
import { Router } from 'express';
import UserController from '../controllers/user.controller';

const router = Router();
const userController = new UserController();

router.get('/', userController.getUsers);

router.get('/:id', userController.getSingleUser);

router.post('/', userController.createUsers);

router.delete('/:id', userController.removeUser);

router.put('/:id', userController.updateUser);

export default router;
```

`lib/template-options/limiter-option/route/with-limiter/user.route.ts`:

```ts
import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { mainLimiter } from '../middleware/limiters';

const router = Router();
const userController = new UserController();

router.get('/', mainLimiter, userController.getUsers);

router.get('/:id', mainLimiter, userController.getSingleUser);

router.post('/', mainLimiter, userController.createUsers);

router.delete('/:id', mainLimiter, userController.removeUser);

router.put('/:id', mainLimiter, userController.updateUser);

export default router;
```

- [ ] **Step 9: Mongo controllers**

`lib/template-options/mongo/no-rxjs/user.controller.ts` (Express 5 forwards rejected promises to the error handler, so no try/catch):

```ts
import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import UserModel from '../models/user.schema';

const FIELDS = ['firstName', 'lastName', 'email'];
const pick = (body: Record<string, unknown> = {}) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => FIELDS.includes(k)));

export default class UserController {
  createUsers = async (req: Request, res: Response) => {
    const user = await UserModel.create(pick(req.body));
    res.status(201).json(user);
  };

  getUsers = async (_req: Request, res: Response) => {
    res.status(200).json(await UserModel.find());
  };

  getSingleUser = async (req: Request, res: Response) => {
    const user = await UserModel.findById(req.params.id);
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json(user);
  };

  removeUser = async (req: Request, res: Response) => {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json({
      message: `User ${req.params.id} successfully deleted`,
    });
  };

  updateUser = async (req: Request, res: Response) => {
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json(user);
  };
}
```

`lib/template-options/mongo/with-rxjs/user.controller.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { from, map } from 'rxjs';
import UserModel from '../models/user.schema';

const FIELDS = ['firstName', 'lastName', 'email'];
const pick = (body: Record<string, unknown> = {}) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => FIELDS.includes(k)));

const orNotFound = <T>(value: T | null) => {
  if (!value) throw new createHttpError.NotFound();
  return value;
};

const send = (res: Response, next: NextFunction, status = 200) => ({
  next: (body: unknown) => res.status(status).json(body),
  error: next,
});

export default class UserController {
  createUsers = (req: Request, res: Response, next: NextFunction) => {
    from(UserModel.create(pick(req.body))).subscribe(send(res, next, 201));
  };

  getUsers = (_req: Request, res: Response, next: NextFunction) => {
    from(UserModel.find()).subscribe(send(res, next));
  };

  getSingleUser = (req: Request, res: Response, next: NextFunction) => {
    from(UserModel.findById(req.params.id))
      .pipe(map(orNotFound))
      .subscribe(send(res, next));
  };

  removeUser = (req: Request, res: Response, next: NextFunction) => {
    from(UserModel.findByIdAndDelete(req.params.id))
      .pipe(
        map(orNotFound),
        map(() => ({ message: `User ${req.params.id} successfully deleted` }))
      )
      .subscribe(send(res, next));
  };

  updateUser = (req: Request, res: Response, next: NextFunction) => {
    from(
      UserModel.findByIdAndUpdate(req.params.id, pick(req.body), {
        new: true,
        runValidators: true,
      })
    )
      .pipe(map(orNotFound))
      .subscribe(send(res, next));
  };
}
```

- [ ] **Step 10: Auth templates**

`lib/template-options/auth/controller/no-rxjs/auth.controller.ts`:

```ts
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.schema';

export default class AuthController {
  authUser = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new createHttpError.BadRequest('email and password are required');
    }
    const secret = process.env.SECRET_KEY;
    if (!secret) throw new Error('SECRET_KEY is not set');

    const user = await UserModel.findOne({ email }).select('+password');
    // compare against '' when user is missing: same failure path, no user enumeration
    const ok = await bcrypt.compare(password, user?.password ?? '');
    if (!user || !ok) {
      throw new createHttpError.Unauthorized('Invalid credentials');
    }

    const token = jwt.sign({ auth_id: user._id, email: user.email }, secret, {
      expiresIn: '24h',
    });
    const { exp } = jwt.decode(token) as { exp: number };
    const { password: _hash, ...authUser } = user.toObject();
    res.status(200).json({
      authToken: token,
      authToken_exp: exp,
      auth_user: authUser,
    });
  };
}
```

`lib/template-options/auth/controller/with-rxjs/auth.controller.ts`:

```ts
import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { from, map, switchMap } from 'rxjs';
import UserModel from '../models/user.schema';

export default class AuthController {
  authUser = (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      next(new createHttpError.BadRequest('email and password are required'));
      return;
    }
    const secret = process.env.SECRET_KEY;
    if (!secret) {
      next(new Error('SECRET_KEY is not set'));
      return;
    }

    from(UserModel.findOne({ email }).select('+password'))
      .pipe(
        switchMap((user) =>
          // compare against '' when user is missing: same failure path
          from(bcrypt.compare(password, user?.password ?? '')).pipe(
            map((ok) => {
              if (!user || !ok) {
                throw new createHttpError.Unauthorized('Invalid credentials');
              }
              return user;
            })
          )
        ),
        map((user) => {
          const token = jwt.sign(
            { auth_id: user._id, email: user.email },
            secret,
            { expiresIn: '24h' }
          );
          const { exp } = jwt.decode(token) as { exp: number };
          const { password: _hash, ...authUser } = user.toObject();
          return { authToken: token, authToken_exp: exp, auth_user: authUser };
        })
      )
      .subscribe({
        next: (body) => res.status(200).json(body),
        error: next,
      });
  };
}
```

`lib/template-options/auth/route/no-limiter/auth.route.ts`:

```ts
import { Router } from 'express';
import AuthController from '../controllers/auth.controller';

const authController = new AuthController();
const router = Router();

router.post('/', authController.authUser);

export default router;
```

`lib/template-options/auth/route/with-limiter/auth.route.ts`:

```ts
import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { mainLimiter } from '../middleware/limiters';

const authController = new AuthController();
const router = Router();

router.post('/', mainLimiter, authController.authUser);

export default router;
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `node --test`
Expected: PASS. Note: `: any` assertion scans all generated `.ts`; if it matches a legitimate string (e.g. in a comment), reword the comment, not the assertion.

- [ ] **Step 12: Commit**

```bash
git add -A lib test
git commit -m "feat: modernize generated app templates (express 5, mongoose 9, tsc+tsx, eslint flat)"
```

---

### Task 4: Real build check, CI, docs

**Files:**
- Modify: `test/smoke.test.js` (add `FULL` build/lint matrix)
- Create: `.github/workflows/test.yml`
- Rewrite: `README.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: CLI from Task 2/3 (`--no-install` omitted so real install runs).
- Produces: `FULL=1 node --test` — installs and runs `npm run build` and `npm run lint` for every flag combination.

- [ ] **Step 1: Add the FULL test** — append to `test/smoke.test.js`

```js
const MATRIX = {
  'full-base': [],
  'full-limiter': ['--limiter'],
  'full-mongo': ['--mongo'],
  'full-auth': ['--mongo', '--auth'],
  'full-rxjs': ['--mongo', '--rxjs'],
  'full-all': ['--mongo', '--auth', '--rxjs', '--limiter'],
};

const npm = (args, cwd) => {
  const r = spawnSync('npm', args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `npm ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
};

for (const [name, flags] of Object.entries(MATRIX)) {
  test(`FULL: ${name} installs, builds, lints`, { skip: !process.env.FULL, timeout: 600_000 }, () => {
    const { dir, r } = gen(name, ['--yes', ...flags]); // runs the real install
    assert.equal(r.status, 0, r.stderr);
    npm(['run', 'build'], dir);
    npm(['run', 'lint'], dir);
  });
}
```

- [ ] **Step 2: Run FULL and fix template type/lint errors**

Run: `FULL=1 node --test` (PowerShell: `$env:FULL=1; node --test`)
Expected: all PASS. If a combo fails, fix the **template** that the error names (not the test). Known risks to check first:
- `import { TokenIndexer } from 'morgan'` in `config.ts` — if TS2305, change to `import morgan from 'morgan'` and use `morgan.TokenIndexer`.
- `findByIdAndUpdate(..., pick(req.body), ...)` typing — if it rejects `Record<string, unknown>`-shaped `{ [k: string]: unknown }`, cast with `as Partial<{ firstName: string; lastName: string; email: string }>`.
- `user?.password` typed `string | undefined` is fine; if `user.toObject()` complains about `password`, destructure from `user.toObject() as Record<string, unknown>`.
Re-run until green.

- [ ] **Step 3: CI** — `.github/workflows/test.yml`

```yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: node --test
        env:
          FULL: ${{ matrix.node == 22 && '1' || '' }}
```

- [ ] **Step 4: Rewrite `README.md`**

````markdown
![express-typescript](https://github.com/mianfrigo/mfg-express-typescript-generator/blob/main/express-typescript-draf.png?raw=true)

# @mianfrigo/express-typescript-generator

[![npm](https://badgen.net/npm/v/@mianfrigo/express-typescript-generator)](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator) ![license](https://badgen.net/badge/license/MIT/green)

Scaffold an [Express 5](https://expressjs.com) + [TypeScript](https://www.typescriptlang.org) app in seconds. Zero runtime dependencies, Node >= 20.19.

## Usage

```bash
npx @mianfrigo/express-typescript-generator my-app
# or, installed globally:
mfg-express-generator my-app
```

Without flags you get a few yes/no prompts. Skip them with flags:

| Flag | Effect |
|---|---|
| `-y, --yes` | No prompts; unset options default to off |
| `--limiter` | Add `express-rate-limit` to routes |
| `--mongo` | Add MongoDB with mongoose and a `/user` CRUD route |
| `--auth` | Add JWT login route (needs `--mongo`); writes a random `SECRET_KEY` to `.env` |
| `--rxjs` | Use rxjs instead of promises in controllers (needs `--mongo`) |
| `--pm npm\|pnpm\|yarn` | Package manager for install (default `npm`) |
| `--no-install` | Skip dependency install |
| `-v, --version` | Print version |

Default project name is `express-ts`.

## What you get

- Express 5, helmet, cors allow-list, morgan + winston logging, `.env` via dotenv.
- `npm run dev` (tsx watch), `npm run build` (tsc), `npm start`, `npm run lint` (ESLint flat config + prettier).
- Routes under `/api/v1`. With `--mongo`: edit `MONGO_DB` in `.env` before `npm run dev`.

## Migrating from 1.x

- Webpack, nodemon and the airbnb ESLint config are gone; build is plain `tsc`, dev is `tsx watch`.
- Needs Node >= 20.19 (Express 5, Mongoose 9, ESLint 10).
- `auto-bind` and `mongoose-unique-validator` removed; email uniqueness is a MongoDB unique index (duplicate -> HTTP 409).

## Development

```bash
node --test             # fast checks (generates into a temp dir, no install)
FULL=1 node --test      # also installs, builds and lints every flag combination
```

MIT
````

- [ ] **Step 5: Tidy `.gitignore`**

Root `.gitignore` becomes:

```
node_modules
```

(`package-lock.json` was ignored only because the package had dependencies; with none, there is no lockfile to ignore.)

- [ ] **Step 6: Verify packaging**

Run: `npm pack --dry-run 2>&1 | grep -E "gitignore|\.env|eslint.config|cli.js"`
Expected: lists `lib/common_files/configFiles/gitignore`, `lib/express-typescript/.env`, `lib/express-typescript-with-mongo/.env`, `lib/common_files/configFiles/eslint.config.mjs`, `bin/cli.js`. If a `.env` is missing, rename it to `env` in the template dirs and add a matching `rename(out('env'), out('.env'))` in `generateApp`, mirroring `gitignore`.

- [ ] **Step 7: Run everything once more**

Run: `FULL=1 node --test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build/lint matrix test, ci, v2 readme"
```

## Self-review

- **Spec coverage:** zero-dep ESM CLI (T1, T2); flags incl. `--pm`, `--no-install`, `-v` (T1, T2); marker-based routes index (T2); awaited copies + non-zero exit + spawn `error` handled (T2 `run`); `git init` (T2); webpack/nodemon removed, tsc+tsx, flat ESLint, strict tsconfig (T3); Mongoose fixes, body whitelist, `MONGO_DB` check (T3); pinned versions (T2 `BASE`/`EXTRA`); smoke test + CI (T2, T4); package.json cleanup (T2).
- **Beyond the spec, needed to make output work:** drop `auto-bind` (ESM-only vs CJS output); `POST /user` route (controller `createUsers` was unreachable); `password` field + `select('+password')` and real `SECRET_KEY` (auth could not compile/sign before); `.gitignore` shipped as `gitignore`; generated `.env` ignored by git.
- **Known gap, not fixed:** no register route, so auth users still need a password hash created outside the app. Adding `POST /auth/register` is a feature; say so if wanted.
- **Type consistency:** `parseCli`/`resolveOptions`/`createAsk` (T1) used verbatim in `bin/cli.js` (T2); option keys `limiter, mongo, auth, rxjs, pm, install` identical in `options.js`, `generate.js`, tests.
