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

- **Pick only what you need**: a database with migrations, login, validation, Swagger, tests, CI and Docker are each one flag away.
- **PostgreSQL (Prisma 7) or MongoDB (mongoose 9)**: schema, committed migration, compose file and seed data included.
- **Auth that goes beyond a demo**: JWT login, roles (`user` / `admin`) and rotating refresh tokens with reuse detection.
- **Validated input, living docs**: zod schemas drive request validation and the OpenAPI document served by Swagger UI.
- **Production basics by default**: `/health` and `/ready`, graceful shutdown, stdout logs, pagination, `.env.example`, an `AGENTS.md` for AI agents.
- **Verified, not hoped for**: option combinations are generated, installed, built, linted and run in CI against real databases, with npm, pnpm and yarn.

---

## ⚡ Quick start

Needs Node >= 20.19. Nothing to install:

```bash
npm create express-blueprint@latest my-api
cd my-api
npm run dev          # http://localhost:3000/api/v1/health
```

Run with no flags in a terminal and an arrow-key wizard asks what you want (Minimal, API starter, Full or Custom) and prints the equivalent command before creating anything. Or pass flags:

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

`npm create express-blueprint` runs [`create-express-blueprint`](https://www.npmjs.com/package/create-express-blueprint), a thin entry point to this package, so `npx @mianfrigo/express-typescript-generator my-api` is the same thing (and `mfg-express-generator my-api` after `npm install -g`). With `npm create`, put `--` before flags (`npm create express-blueprint@latest my-api -- --preset api`); `pnpm create` and `yarn create` take them directly. The default project name is `express-ts`.

With `--zod --openapi`, Swagger UI is at **http://localhost:3000/api/v1/docs** once the app runs.

---

## 🧱 What it generates

The app is layered, which suits a CRUD API. To add a resource, copy the user controller and route.

```
src/
├── index.ts          starts the server: .env, database, listen, graceful shutdown
├── app.ts            the Express app only (middleware, /api/v1 routes, error handlers)
├── config/           env (validated at startup), CORS, logger, database connection
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

---

## 🎛️ Options

| Flag | Effect |
|---|---|
| `-y, --yes` | No prompts; unset options default to off |
| **Database** | |
| `--mongo` | MongoDB with mongoose: `/user` CRUD, `docker-compose.yml`, `db:seed` |
| `--postgres` | PostgreSQL with Prisma 7: schema, initial migration, `docker-compose.yml`, `db:migrate` / `db:deploy` / `db:seed` (exclusive with `--mongo`) |
| **Features** | |
| `--auth` | Register and login (JWT), `Bearer` token on `/api/v1/user`, random `SECRET_KEY` in `.env`; needs a database |
| `--roles` | `user` / `admin` roles: `requireRole('admin')`, admin-only `DELETE /user/:id` and `PATCH /user/:id/role`, a seeded `admin@example.com` (needs `--auth`) |
| `--refresh-tokens` | 15 minute access tokens plus rotating refresh tokens: `POST /auth/refresh` and `/auth/logout`, hashed in the database, reuse revokes the session (needs `--auth`) |
| `--zod` | Validate request bodies with zod (`src/validation/`); invalid input is a 400 naming each field |
| `--openapi` | Swagger UI at `/api/v1/docs`, spec at `/api/v1/openapi.json`, built from the zod schemas (needs `--zod`) |
| `--limiter` | Rate limiting with `express-rate-limit` |
| `--rxjs` | rxjs instead of promises in the controllers (needs a database) |
| **Tooling** | |
| `--test` | vitest + supertest with an example test in `test/` (`npm test`) |
| `--ci` | GitHub Actions workflow: install, lint, typecheck, format check, build, test; a Postgres service for `--postgres` |
| `--docker` | Multi-stage `Dockerfile` and a full-stack `docker-compose.yml` (database, migrations, app): `docker compose up --build` runs it all |
| **CLI** | |
| `--pm npm\|pnpm\|yarn` | Package manager for the install (default: the one that launched the CLI) |
| `--git`, `--no-git` | Force or skip `git init` (default: init unless already inside a repo) |
| `--here` | Scaffold into the current (empty) directory |
| `--no-install` | Skip the dependency install |
| `--preset minimal\|api\|full` | A bundle of flags (below); implies `--yes` |
| `--no-config` | Ignore `.mfgrc.json` files |
| `--dry-run` | List the files a run would create and write nothing |
| `--no-agents` | Skip the generated `AGENTS.md` (guidance for AI coding agents and new contributors) |
| `-v, --version` | Print version |

| Preset | Adds |
|---|---|
| `minimal` | nothing (the in-memory sample app) |
| `api` | `--postgres --auth --zod --openapi --test` |
| `full` | `api` plus `--ci --docker --limiter` |

Explicit flags are added on top (`--preset api --docker --rxjs`), and an explicit database replaces the preset's. To leave something out, pick a smaller preset.

<details>
<summary>Team defaults (<code>.mfgrc.json</code>)</summary>

Put a `.mfgrc.json` in your home directory or the directory you run the generator from (the current directory overrides home):

```json
{ "preset": "api", "pm": "pnpm", "docker": true }
```

Allowed keys are `preset`, `pm`, and the feature flags (`mongo`, `postgres`, `limiter`, `auth`, `rxjs`, `docker`, `test`, `zod`, `openapi`, `ci`, `git`, `agents`) as `true` / `false`. Order of precedence: preset, then the file, then command-line flags. Unknown keys are an error that names the file; pass `--no-config` to ignore it.

</details>

---

## 🚀 The generated app

<details>
<summary>Scripts and endpoints</summary>

| Script | |
|---|---|
| `npm run dev` | `tsx watch`, restarts on change |
| `npm run build` / `npm start` | compile with `tsc`, run `dist/` |
| `npm run lint` / `typecheck` / `format:check` | ESLint, `tsc` over `src`, `test` and `scripts`, Prettier |
| `npm test` | with `--test` |
| `npm run db:seed` | three sample users, idempotent; with `--auth` they use the password `password123` (development only) |
| `npm run db:migrate` / `npm run db:deploy` | with `--postgres`: create, then apply, migrations |

All endpoints are under `/api/v1`:

| | |
|---|---|
| `GET /api/v1/health` | liveness |
| `GET /api/v1/ready` | readiness: pings the database, 503 when it is unreachable |
| `GET /api/v1/user?page=1&limit=20` | `{ data, meta }` where `meta` is `{ page, limit, total, totalPages }`; `limit` defaults to 20 and is capped at 100 |
| `GET`, `PUT`, `DELETE /api/v1/user/:id`, `POST /api/v1/user` | CRUD; the password hash is never returned |
| `POST /api/v1/auth/register`, `POST /api/v1/auth` | with `--auth` |
| `GET /api/v1/docs`, `GET /api/v1/openapi.json` | with `--openapi` |

Errors are JSON `{ "error": { "statusCode", "message" } }`. Duplicate emails answer 409, unknown ids 404, and server errors never leak internals.

</details>

<details>
<summary>Swagger UI and authentication</summary>

With `--zod --openapi` and the app running (default port 3000):

- Swagger UI: **http://localhost:3000/api/v1/docs**
- Raw OpenAPI 3.1 spec: **http://localhost:3000/api/v1/openapi.json**

Both are public. The spec is generated from the zod schemas, so request bodies cannot drift from what the API accepts.

With `--auth`, `/api/v1/user` needs `Authorization: Bearer <token>`; `/api/v1/auth/register`, `/api/v1/auth`, `/health` and `/ready` are public. There is no built-in default user: create one first.

1. **Get a user.** `npm run db:seed` creates `ada@example.com`, `grace@example.com` and `alan@example.com`, all with the password `password123` (development only, never use it in production). Or register your own with `POST /api/v1/auth/register` (`firstName`, `lastName`, `email`, `password` of 8 to 72 characters).
2. **Log in** with `POST /api/v1/auth` and `{ "email", "password" }`. The response contains `authToken`, valid for 24 hours.
3. **Send it** as `Authorization: Bearer <authToken>`.
4. **In Swagger UI** click **Authorize** and paste the token without the `Bearer ` prefix.

```bash
curl -s -X POST http://localhost:3000/api/v1/auth \
  -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"password123"}'
```

With `--refresh-tokens` the access token lives 15 minutes and login also returns a `refreshToken`: `POST /api/v1/auth/refresh` rotates it (each token works once; replaying a spent one revokes the session) and `POST /api/v1/auth/logout` ends the session. With `--roles`, `DELETE /api/v1/user/:id` and `PATCH /api/v1/user/:id/role` are admin-only and `npm run db:seed` adds `admin@example.com`.

</details>

<details>
<summary>Configuration and databases</summary>

`.env` is generated (and git-ignored); `.env.example` documents the same variables and is safe to commit. They are validated once at startup in `src/config/env.ts`.

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

</details>

---

## 📄 License

MIT
