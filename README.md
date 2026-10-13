![express-typescript](https://github.com/mianfrigo/mfg-express-typescript-generator/blob/main/express-typescript-draf.png?raw=true)

<h1 align="center">@mianfrigo/express-typescript-generator</h1>

<p align="center">
  Scaffold an <a href="https://expressjs.com">Express 5</a> + <a href="https://www.typescriptlang.org">TypeScript</a> API in seconds, with the production basics already done.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mianfrigo/express-typescript-generator"><img alt="npm" src="https://badgen.net/npm/v/@mianfrigo/express-typescript-generator"></a>
  <img alt="license" src="https://badgen.net/badge/license/MIT/green">
  <a href="https://github.com/mianfrigo/mfg-express-typescript-generator/actions/workflows/test.yml"><img alt="CI" src="https://github.com/mianfrigo/mfg-express-typescript-generator/actions/workflows/test.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/@mianfrigo/express-typescript-generator"><img alt="downloads" src="https://img.shields.io/npm/dm/@mianfrigo/express-typescript-generator"></a>
</p>

<p align="center">
  <img alt="Generating an API with npm create express-blueprint" src="https://github.com/mianfrigo/mfg-express-typescript-generator/blob/main/docs/demo.gif?raw=true" width="720">
</p>

---

## ✨ Features

- **Pick only what you need** – a database with migrations, login, validation, Swagger, tests, CI and Docker are each one flag away.
- **PostgreSQL (Prisma 7) or MongoDB (mongoose 9)** – schema, committed migration, compose file and seed data included.
- **Auth that goes beyond a demo** – JWT login, roles (`user` / `admin`) and rotating refresh tokens with reuse detection.
- **Validated input, living docs** – zod schemas drive request validation and the OpenAPI document served by Swagger UI.
- **Production basics by default** – `/health` and `/ready`, graceful shutdown, stdout logs, pagination, `.env.example`, an `AGENTS.md` for AI agents.
- **Verified, not hoped for** – option combinations are generated, installed, built, linted and run in CI against real databases, with npm, pnpm and yarn.
- **Lean** – one small runtime dependency ([`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts), only for the wizard). Needs Node >= 20.19.

---

## 📦 Installation

Nothing to install: run it with `npm create` or `npx`.

```bash
npm create express-blueprint@latest my-api
# or
npx @mianfrigo/express-typescript-generator my-api
# or install globally, then run: mfg-express-generator my-api
npm install -g @mianfrigo/express-typescript-generator
```

`npm create express-blueprint` runs [`create-express-blueprint`](https://www.npmjs.com/package/create-express-blueprint), a thin entry point to this package. With `npm create`, put `--` before flags (`npm create express-blueprint@latest my-api -- --preset api`); `pnpm create` and `yarn create` take them directly.

---

## ⚡ Quick start

```bash
npm create express-blueprint@latest my-api
cd my-api
npm run dev          # http://localhost:3000/api/v1/health
```

The default project name is `express-ts`.

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

### Interactive wizard

Run it with no flags in a terminal and you get an arrow-key wizard: pick **Minimal**, **API starter**, **Full** or **Custom**. Custom asks for a database, then a checklist of features (space to toggle) and, with authentication, roles and refresh tokens. Options that need something else are greyed out with the reason. Before creating anything it prints the equivalent command and asks you to confirm; Esc or Ctrl+C cancels without writing anything.

The wizard only runs on a terminal when nothing has been decided yet. Pass `--yes`, `--preset` or any feature flag and it is skipped; in scripts and CI it never runs.

---

## 🤔 Which generator should you use?

There are good lean generators, for example [express-generator-typescript](https://www.npmjs.com/package/express-generator-typescript): a small Express + TypeScript skeleton with no ORM, on a recent Node. If that is what you want, use it.

This package is for when you want the next layer wired up and verified, and still want to choose each piece:

| You want | Here |
|---|---|
| A database with migrations | `--postgres` (Prisma) or `--mongo` (mongoose), a local compose file, seed data |
| Login and protected routes | `--auth` (JWT, bcrypt, `requireAuth`), `--roles`, `--refresh-tokens` |
| Validated input and living API docs | `--zod`, `--openapi` (Swagger UI from the same schemas) |
| Tests, CI and containers | `--test`, `--ci`, `--docker` (full-stack `docker compose up --build`) |
| Production basics by default | `/health` and `/ready`, graceful shutdown, stdout logs, pagination, `.env.example`, `AGENTS.md` for AI agents |

A matrix of option combinations is generated, installed, built, linted and run in CI, against real PostgreSQL and MongoDB, with npm, pnpm and yarn, and a release is blocked if any of it fails.

---

## 🧱 Architecture

The generated app is layered, which suits a CRUD API. To add a resource, copy the user controller and route.

```
src/
├── index.ts          starts the server: .env, database, listen, graceful shutdown
├── app.ts            the Express app only (middleware, /api/v1 routes, error handlers)
├── config/           CORS, request logging, logger, database connection
├── routes/           map URLs to controllers (index.ts mounts them)
├── controllers/      read the request, call the data layer, send the response
├── middleware/       auth, validation, rate limiting, error handler
├── models/           mongoose models (--mongo)
├── validation/       zod schemas (--zod)
├── services/         refresh tokens (--refresh-tokens)
├── utils/            pagination helpers
└── openapi.ts        the OpenAPI document (--openapi)
prisma/               schema and committed migrations (--postgres)
scripts/seed.ts       idempotent sample users
test/                 vitest + supertest (--test)
```

### What you get, for real

This is the real file list from a run of `--postgres --auth --zod --openapi --test --ci --docker` (plus `.env` and `.gitignore`, without `node_modules`):

<details>
<summary>Show all 38 files</summary>

```text
.dockerignore
.env.example
.github/workflows/ci.yml
.prettierignore
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
src/config/env.ts
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
test/auth.test.ts
test/health.test.ts
tsconfig.check.json
tsconfig.json
```

</details>

---

## 🎛️ Options

| Flag | Effect |
|---|---|
| `-y, --yes` | No prompts; unset options default to off |
| **Database** | |
| `--mongo` | MongoDB with mongoose: `/user` CRUD, `docker-compose.yml`, `db:seed` |
| `--postgres` | PostgreSQL with Prisma 7: schema, initial migration, `docker-compose.yml`, `db:migrate` / `db:deploy` / `db:seed` (exclusive with `--mongo`) |
| **Features** | |
| `--auth` | `POST /api/v1/auth/register` and `POST /api/v1/auth` (JWT), and a `Bearer` token on `/api/v1/user`; needs a database; writes a random `SECRET_KEY` to `.env` |
| `--roles` | `user` / `admin` roles on top of `--auth`: the role in the token, `requireRole('admin')`, admin-only `DELETE /user/:id`, `PATCH /user/:id/role`, a seeded `admin@example.com` (needs `--auth`) |
| `--refresh-tokens` | Short-lived (15 min) access tokens plus rotating refresh tokens on top of `--auth`: `POST /auth/refresh` and `POST /auth/logout`, hashed tokens in the database, reuse detection that revokes the session (needs `--auth`) |
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
| `--preset minimal\|api\|full` | A bundle of flags, see below. It answers every question, so it implies `--yes`. |
| `--no-config` | Ignore `.mfgrc.json` files |
| `--dry-run` | Show the files, dependency counts and scripts a run would create, and write nothing (it still refuses an existing directory) |
| `--no-agents` | Skip the generated `AGENTS.md` (a guidance file for AI coding agents and new contributors: commands, layout, conventions; it follows the options you chose) |
| `-v, --version` | Print version |

### Presets

| Preset | Adds |
|---|---|
| `minimal` | nothing (the in-memory sample app) |
| `api` | `--postgres --auth --zod --openapi --test` |
| `full` | `api` plus `--ci --docker --limiter` |

Explicit flags are added on top (`--preset api --docker --rxjs`), and an explicit database replaces the preset's: `--preset api --mongo` gives MongoDB with auth, zod, OpenAPI and tests. To leave something out, pick a smaller preset.

### Team defaults (`.mfgrc.json`)

Put a `.mfgrc.json` in your home directory or the directory you run the generator from (the current directory overrides home) to set defaults:

```json
{ "preset": "api", "pm": "pnpm", "docker": true }
```

Allowed keys are `preset`, `pm`, and the feature flags (`mongo`, `postgres`, `limiter`, `auth`, `rxjs`, `docker`, `test`, `zod`, `openapi`, `ci`, `git`, `agents`) as `true` / `false`. `git: false` means `--no-git` and `agents: false` means `--no-agents`. Order of precedence: preset, then the file, then command-line flags. Unknown keys are an error that names the file; pass `--no-config` to ignore it.

---

## 🚀 What you get

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
| `GET /api/v1/user?page=1&limit=20` | `{ data, meta }` where `meta` is `{ page, limit, total, totalPages }`; `limit` defaults to 20 and is capped at 100 |
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

With `--refresh-tokens` the access token lives 15 minutes and login also returns a `refreshToken`: `POST /api/v1/auth/refresh` rotates it (each token works once; replaying a spent one revokes the session) and `POST /api/v1/auth/logout` ends the session. With `--roles`, `DELETE /api/v1/user/:id` and `PATCH /api/v1/user/:id/role` are admin-only and `npm run db:seed` adds `admin@example.com`.

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

---

## 📄 License

MIT
