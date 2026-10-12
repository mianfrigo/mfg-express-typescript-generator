![express-typescript](https://github.com/mianfrigo/mfg-express-typescript-generator/blob/main/express-typescript-draf.png?raw=true)

# @mianfrigo/express-typescript-generator

[![npm](https://badgen.net/npm/v/@mianfrigo/express-typescript-generator)](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator) ![license](https://badgen.net/badge/license/MIT/green) [![CI](https://github.com/mianfrigo/mfg-express-typescript-generator/actions/workflows/test.yml/badge.svg)](https://github.com/mianfrigo/mfg-express-typescript-generator/actions/workflows/test.yml) [![downloads](https://img.shields.io/npm/dm/@mianfrigo/express-typescript-generator)](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator)

Scaffold an [Express 5](https://expressjs.com) + [TypeScript](https://www.typescriptlang.org) API in seconds, with the production basics already done: validation, auth, a database, migrations, OpenAPI docs, tests, CI and Docker are each one flag away.

Zero runtime dependencies. Requires Node >= 20.19.

## Quick start

```bash
npx @mianfrigo/express-typescript-generator my-api
cd my-api
npm run dev          # http://localhost:3000/api/v1/health
```

Installed globally it is `mfg-express-generator my-api` (or `mfg-express-typescript-generator`). The default project name is `express-ts`.

### Recipes

```bash
# a PostgreSQL API with login, validation, Swagger UI, tests, CI and Docker
npx @mianfrigo/express-typescript-generator shop --yes \
  --postgres --auth --zod --openapi --test --ci --docker

# the same on MongoDB, with rxjs controllers and rate limiting
npx @mianfrigo/express-typescript-generator shop --yes \
  --mongo --auth --zod --rxjs --limiter

# the smallest thing that runs (in-memory sample data, no database)
npx @mianfrigo/express-typescript-generator tiny --yes
```

Without `--yes` you are asked a few yes/no questions: rate limiting, MongoDB, PostgreSQL (only if you said no to MongoDB), and then authentication and rxjs when a database is chosen. Everything else is flag-only.

## Which generator should you use?

There are good lean generators, for example [express-generator-typescript](https://www.npmjs.com/package/express-generator-typescript): a small Express + TypeScript skeleton with no ORM, on a recent Node. If that is what you want, use it.

This package is for when you want the next layer wired up and verified, and still want to choose each piece:

| You want | Here |
|---|---|
| A database with migrations | `--postgres` (Prisma) or `--mongo` (mongoose), a local compose file, seed data |
| Login and protected routes | `--auth` (JWT, bcrypt, `requireAuth`) |
| Validated input and living API docs | `--zod`, `--openapi` (Swagger UI from the same schemas) |
| Tests, CI and containers | `--test`, `--ci`, `--docker` (full-stack `docker compose up --build`) |
| Production basics by default | `/health` and `/ready`, graceful shutdown, stdout logs, pagination, `.env.example`, `AGENTS.md` for AI agents |

A matrix of option combinations is generated, installed, built, linted and run in CI, against real PostgreSQL and MongoDB, with npm, pnpm and yarn, and a release is blocked if any of it fails.

### What you get, for real

This is the real file list from a run of `--postgres --auth --zod --openapi --test --ci --docker` (plus `.env` and `.gitignore`, without `node_modules`):

```text
.dockerignore
.env.example
.github/workflows/ci.yml
.prettierrc.json
AGENTS.md
Dockerfile
README.md
docker-compose.yml
eslint.config.mjs
package.json
prisma.config.ts
prisma/migrations/20261011000000_init/migration.sql
prisma/migrations/migration_lock.toml
prisma/schema.prisma
scripts/seed.ts
src/app.ts
src/config/config.ts
src/config/logger.config.ts
src/config/prisma.ts
src/controllers/auth.controller.ts
src/controllers/user.controller.ts
src/index.ts
src/middleware/auth.ts
src/middleware/errorHandler.ts
src/middleware/validate.ts
src/openapi.ts
src/routes/auth.route.ts
src/routes/index.ts
src/routes/user.route.ts
src/utils/pagination.ts
src/validation/auth.validation.ts
src/validation/user.validation.ts
test/health.test.ts
tsconfig.json
```

## Options

| Flag | Effect |
|---|---|
| `-y, --yes` | No prompts; unset options default to off |
| **Database** | |
| `--mongo` | MongoDB with mongoose: `/user` CRUD, `docker-compose.yml`, `db:seed` |
| `--postgres` | PostgreSQL with Prisma 7: schema, initial migration, `docker-compose.yml`, `db:migrate` / `db:deploy` / `db:seed` (exclusive with `--mongo`) |
| **Features** | |
| `--auth` | `POST /api/v1/auth/register` and `POST /api/v1/auth` (JWT), and a `Bearer` token on `/api/v1/user`; needs a database; writes a random `SECRET_KEY` to `.env` |
| `--zod` | Validate request bodies with zod (`src/validation/`); invalid input is a 400 naming each field |
| `--openapi` | Swagger UI at `/api/v1/docs` and the spec at `/api/v1/openapi.json`, generated from the zod schemas (needs `--zod`) |
| `--limiter` | Rate limiting with `express-rate-limit` on the routes |
| `--rxjs` | rxjs instead of promises in the controllers (needs a database) |
| **Tooling** | |
| `--test` | vitest + supertest with an example test in `test/` (`npm test`) |
| `--ci` | GitHub Actions workflow: install, lint, build, test; with a Postgres service for `--postgres` |
| `--docker` | Multi-stage `Dockerfile`, `.dockerignore`, and a full-stack `docker-compose.yml` (database, migrations, app) |
| **CLI** | |
| `--pm npm\|pnpm\|yarn` | Package manager for install (default: the one that launched the CLI, else `npm`) |
| `--git`, `--no-git` | Force or skip `git init` (default: init unless already inside a repo) |
| `--here` | Scaffold into the current (empty) directory |
| `--no-install` | Skip dependency install |
| `--no-agents` | Skip the generated `AGENTS.md` (a guidance file for AI coding agents and new contributors: commands, layout, conventions; it follows the options you chose) |
| `-v, --version` | Print version |

## What you get

### Scripts

| Script | |
|---|---|
| `npm run dev` | `tsx watch`, restarts on change |
| `npm run build` / `npm start` | compile with `tsc`, run `dist/` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | with `--test` |
| `npm run db:seed` | three sample users, idempotent; with `--auth` they use the password `password123` (development only) |
| `npm run db:migrate` / `npm run db:deploy` | with `--postgres`: create, then apply, migrations |

### Endpoints

All under `/api/v1`.

| | |
|---|---|
| `GET /api/v1/health` | liveness |
| `GET /api/v1/ready` | readiness: pings the database, 503 when it is unreachable |
| `GET /api/v1/user?page=1&limit=20` | `{ data, meta: { page, limit, total, totalPages } }`; `limit` defaults to 20 and is capped at 100 |
| `GET`, `PUT`, `DELETE /api/v1/user/:id`, `POST /api/v1/user` | CRUD; the password hash is never returned |
| `POST /api/v1/auth/register`, `POST /api/v1/auth` | with `--auth` |
| `GET /api/v1/docs`, `GET /api/v1/openapi.json` | with `--openapi` |

Errors are JSON `{ "error": { "statusCode", "message" } }`. Duplicate emails answer 409, unknown ids 404, and server errors never leak internals.

### API docs (Swagger UI)

With `--zod --openapi` and the app running (default port 3000):

- Swagger UI: **http://localhost:3000/api/v1/docs**
- Raw OpenAPI 3.1 spec: **http://localhost:3000/api/v1/openapi.json**

Both are public. The spec is generated from the zod schemas, so request bodies cannot drift from what the API accepts.

### Authentication (`--auth`)

`/api/v1/user` needs `Authorization: Bearer <token>`; `/api/v1/auth/register`, `/api/v1/auth`, `/health` and `/ready` are public. There is no built-in default user: create one first.

1. **Get a user.** `npm run db:seed` creates `ada@example.com`, `grace@example.com` and `alan@example.com`, all with the password `password123` (development only, never use it in production). Or register your own with `POST /api/v1/auth/register` (`firstName`, `lastName`, `email`, `password` of at least 8 characters).
2. **Log in** with `POST /api/v1/auth` and `{ "email", "password" }`. The response contains `authToken`, valid for 24 hours.
3. **Send it** as `Authorization: Bearer <authToken>`.
4. **In Swagger UI** click **Authorize** and paste the token without the `Bearer ` prefix.

```bash
curl -s -X POST http://localhost:3000/api/v1/auth \
  -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"password123"}'
```

### Configuration

`.env` is generated (and git-ignored); `.env.example` documents the same variables and is safe to commit.

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `MONGO_DB` | MongoDB connection string (`--mongo`; defaults to the compose service) |
| `DATABASE_URL` | PostgreSQL connection string (`--postgres`) |
| `SECRET_KEY` | JWT signing secret (`--auth`); generated randomly |
| `CORS_ORIGINS` | Comma-separated browser origins allowed by CORS (exact match) |
| `TRUST_PROXY` | Reverse-proxy hops to trust, so the rate limiter sees real client IPs |
| `LOG_LEVEL` | `debug`, `info`, `warn` or `error` |

Logs go to stdout: JSON when `NODE_ENV=production`, readable text otherwise.

### Databases

```bash
# PostgreSQL (--postgres)
docker compose up -d        # local Postgres matching DATABASE_URL in .env
npm run db:deploy           # apply the committed migration
npm run db:seed             # optional sample users
npm run dev
```

The Prisma client is generated into `src/generated/prisma` by `postinstall`. Change `prisma/schema.prisma`, then `npm run db:migrate`.

```bash
# MongoDB (--mongo)
docker compose up -d        # local MongoDB matching MONGO_DB in .env
npm run db:seed
npm run dev
```

### Docker and CI

With `--docker`, `docker compose up --build` runs the whole stack: the database, the migrations (PostgreSQL) and the app, in order. `docker run --env-file .env -p 3000:3000 <image>` runs just the app image. With `--ci` the workflow starts the same database as a service container so the tests can import the app.

## Migrating

**From 1.x**

- Webpack, nodemon and the airbnb ESLint config are gone; build is plain `tsc`, dev is `tsx watch`.
- Needs Node >= 20.19 (Express 5, Mongoose 9, ESLint 10).
- `auto-bind` and `mongoose-unique-validator` are removed; email uniqueness is a database unique index (duplicate gives HTTP 409).

**Behavior changes inside 2.x**

- 2.1: with `--auth`, `/api/v1/user` requires a `Bearer` token.
- 2.4: apps log to stdout and no longer write `logs/*.log`.
- 2.5: `GET /api/v1/user` returns `{ data, meta }`, not a bare array; `MONGO_DB` defaults to `mongodb://localhost:27017/app`.

See [CHANGELOG.md](CHANGELOG.md) for the full list.

## Development

```bash
npm test                # fast checks (generates into temp directories, no install)
FULL=1 npm test         # also installs, builds and lints every flag combination
```

`FULL=1` additionally checks compiled output at runtime (validation, auth guard, health, pagination, stdout logging). With `POSTGRES_URL` and/or `MONGO_URL` set it boots the generated apps against those real databases and drives CRUD, auth and seeding over HTTP. CI does this in the `database` workflow, and the `docker` workflow runs `docker compose up --build` for both databases.

Dependency versions of generated apps are pinned in `lib/generate.js`. A weekly workflow re-runs the full matrix and lists pins that are behind the registry. `typescript` (typescript-eslint peer range) and `vitest` (vitest 4 crashes the npm 10 resolver) are held back on purpose.

### Releasing

1. Move the changelog entries under a new version heading and bump `version` in `package.json` (a test fails if they disagree).
2. Merge to `main`, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. The `release` workflow checks the tag matches `package.json`, runs `FULL=1 npm test`, and publishes with provenance. It needs an `NPM_TOKEN` repository secret (a granular token with publish rights on the package and 2FA bypass).

## License

MIT
