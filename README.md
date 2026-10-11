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
| `--auth` | Add `POST /api/v1/auth/register` and `POST /api/v1/auth` (JWT login), and require a `Bearer` token on `/api/v1/user`; needs `--mongo`; writes a random `SECRET_KEY` to `.env` |
| `--rxjs` | Use rxjs instead of promises in controllers (needs `--mongo`) |
| `--test` | Add vitest + supertest and an example test in `test/` (`npm test`) |
| `--zod` | Validate request bodies with zod (`src/validation/`, `validate` middleware); invalid input is a 400 naming each field |
| `--docker` | Add a multi-stage `Dockerfile` and `.dockerignore` (run with `docker run --env-file .env`) |
| `--pm npm\|pnpm\|yarn` | Package manager for install (default: the one that launched the CLI, else `npm`) |
| `--git`, `--no-git` | Force or skip `git init` (default: init unless already inside a repo) |
| `--here` | Scaffold into the current (empty) directory |
| `--no-install` | Skip dependency install |
| `-v, --version` | Print version |

Default project name is `express-ts`.

## What you get

- Express 5, helmet, cors allow-list, morgan + winston logging, `.env` via dotenv.
- `npm run dev` (tsx watch), `npm run build` (tsc), `npm start`, `npm run lint` (ESLint flat config + prettier).
- Routes under `/api/v1`, public `GET /api/v1/health`, graceful shutdown on SIGTERM/SIGINT. With `--mongo`: edit `MONGO_DB` in `.env` before `npm run dev`.

## Migrating from 1.x

- Webpack, nodemon and the airbnb ESLint config are gone; build is plain `tsc`, dev is `tsx watch`.
- Needs Node >= 20.19 (Express 5, Mongoose 9, ESLint 10).
- `auto-bind` and `mongoose-unique-validator` removed; email uniqueness is a MongoDB unique index (duplicate -> HTTP 409).

## Development

```bash
npm test                # fast checks (generates into a temp dir, no install)
FULL=1 npm test         # also installs, builds and lints every flag combination
```

### Releasing

1. Move the changelog entries under a new version heading and bump `version` in `package.json`.
2. Merge to `main`, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. The `release` workflow checks the tag matches `package.json`, runs `FULL=1 npm test`, and publishes with provenance. It needs an `NPM_TOKEN` repository secret (a granular token with publish rights on the package).

A weekly workflow re-runs `FULL=1 npm test` and lists pinned dependencies that are behind the registry.

MIT
