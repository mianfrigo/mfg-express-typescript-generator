# Generator v2 — design

## Goal
Modernize `@mianfrigo/express-typescript-generator` (v1.3.8 → 2.0.0): zero-dependency CLI, current generated stack, fix known generator and template bugs, add flags and a smoke test.

## CLI
- Plain Node ESM (`"type": "module"`), Node >= 20, no runtime dependencies, no build step.
- Prompts: `node:readline/promises` (yes/no). Colors: `util.styleText`. Copy: `fs.cp`. JSON: `JSON.parse`/`writeFileSync`.
- Flags via `node:util.parseArgs`: `--yes`, `--mongo`, `--limiter`, `--auth`, `--rxjs`, `--pm npm|pnpm|yarn`, `--no-install`, `-v/--version`.
- Flow: parse args -> resolve answers (flags, `--yes` defaults, else prompts when TTY) -> refuse existing dir -> copy templates -> write `package.json` with pinned deps/scripts -> render `routes/index.ts` -> `git init` -> `<pm> install` unless `--no-install` -> print next steps.
- Auth option only valid with `--mongo`; `--rxjs` only with `--mongo`.
- Every copy/spawn awaited. Any failure prints the error and exits non-zero. Spawn `error` event handled.
- `routes/index.ts` produced by replacing a `// {{auth}}` marker, no line splicing.

## Generated app
- Express 5, Mongoose 9, express-rate-limit 8 (`limit`, bundled types), TypeScript 5.9 (typescript-eslint peer `<6.1`), helmet, morgan, winston, cors, dotenv, http-errors, optional rxjs, bcryptjs, jsonwebtoken. `auto-bind` dropped (ESM-only, output is CommonJS); controllers use arrow-function members.
- Build `tsc`; dev `tsx watch src/index.ts`; start `node dist/index.js`. Webpack, nodemon, ts-loader removed.
- ESLint flat config (10.x) + typescript-eslint + prettier. airbnb removed.
- tsconfig: `strict: true`, no `strictNullChecks: false`.
- Mongoose fixes: drop `useNewUrlParser`, `mongoose-unique-validator`, `@types/mongoose*`; fix `requiered` typo; whitelist body fields instead of spreading `req.body`; fail fast if `MONGO_DB` unset.
- No duplicated `@types/*`. Dependency versions pinned in the generator.

## Repo
- Template folders under `lib/` keep layout; contents edited.
- `package.json`: `type`, `files`, `engines`, real `test` script; remove `script`, `directories`.
- `test/smoke.test.js` (`node:test`): generate into a tmp dir with `--no-install` for flag matrix (base, limiter, mongo, mongo+auth, mongo+rxjs); assert files exist and `package.json` deps/scripts match; assert `routes/index.ts` contains auth route only when `--auth`.
- `.github/workflows/test.yml`: `node --test` on Node 20 and 22.

## Out of scope
TypeScript generator source, commander/yargs, tests for the generated app's own build, new features.
