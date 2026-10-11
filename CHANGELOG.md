# Changelog

## [2.4.0] - 2026-10-11

### Added
- `--ci`: a GitHub Actions workflow (`.github/workflows/ci.yml`) running install,
  lint, build and tests. With `--postgres` it starts a `postgres:17-alpine`
  service; with `--auth` it sets a CI-only `SECRET_KEY`.
- `npm run db:seed` for `--mongo` and `--postgres` apps: three sample users,
  idempotent. With `--auth` they get the password `password123` (development
  only).
- `.env.example` with the secret blanked, plus commented `TRUST_PROXY` and
  `LOG_LEVEL`.
- `CORS_ORIGINS` (comma-separated allowed origins), `LOG_LEVEL`, and
  `TRUST_PROXY=<hops>` for apps behind a load balancer.
- `GET /api/v1/ready`: readiness probe that pings the database and answers 503
  when it is unreachable (documented in the OpenAPI spec with `--openapi`).
- The generated README lists only the scripts, endpoints, variables and
  database steps that apply to the chosen options.

### Changed
- **Logging goes to stdout** (JSON when `NODE_ENV=production`, readable text
  otherwise) instead of `logs/*.log` files. Apps no longer write a `logs/`
  directory; collect output from the process or container as usual.
- Morgan's own output is suppressed, so each request is logged once.
- The CORS allow-list is read from `CORS_ORIGINS` instead of being hardcoded
  (defaults are unchanged: `http://localhost:3000`, `http://localhost:4200`).
- The Dockerfile no longer needs the log-directory `chown`.

### Repo
- Runtime checks now run against real databases: PostgreSQL and MongoDB, locally
  and in the `database` workflow (service containers).

## [2.3.0] - 2026-10-11

### Added
- `--postgres`: PostgreSQL with Prisma 7 as an alternative to `--mongo` (the two
  are exclusive). Generates `prisma/schema.prisma`, `prisma.config.ts`, an
  initial migration, a `docker-compose.yml` with Postgres 17, `DATABASE_URL` in
  `.env`, and `db:migrate` / `db:deploy` scripts. The Prisma client is generated
  by `postinstall` into `src/generated/prisma`.
- Users and auth controllers (promise and rxjs variants) on Prisma. The password
  hash is never returned; duplicate emails answer 409 and unknown ids 404.
- `--auth`, `--rxjs`, `--zod` and `--openapi` work with either database.
- Interactive mode asks "Setup PostgreSQL with Prisma?" when MongoDB is declined;
  an explicit `--postgres` skips the MongoDB question.

### Changed
- `--auth`/`--rxjs` without a database now say "require a database (--mongo or
  --postgres)".
- The Dockerfile runs `prisma generate` before the build for `--postgres`.

### Repo
- New `postgres` workflow boots the generated apps against a `postgres:17`
  service and drives CRUD and auth over HTTP.

## [2.2.0] - 2026-10-11

### Added
- `--zod`: request validation with zod. A `validate` middleware and per-app
  schemas in `src/validation/`; invalid bodies get a 400 naming each field,
  valid bodies are parsed (unknown keys stripped). Login and register schemas
  with `--auth`.
- `--openapi` (needs `--zod`): Swagger UI at `/api/v1/docs` and the spec at
  `/api/v1/openapi.json`, built from the zod schemas (OpenAPI 3.1).

### Fixed
- `repository.url` is stored in the normalized `git+https` form, so
  `npm publish` no longer prints an auto-correction warning.

### Repo
- GitHub Actions: `actions/setup-node` 4 to 7.

## [2.1.0] - 2026-10-11

### Added
- `--docker`: multi-stage `Dockerfile` and `.dockerignore`.
- `--test`: vitest + supertest with an example test.
- `--git` / `--no-git`: git init is skipped when already inside a repo.
- `--here`: scaffold into the current empty directory.
- Package manager detected from the tool that launched the CLI.
- Project name validated against npm package-name rules.
- Generated apps: `GET /api/v1/health`, graceful shutdown on SIGTERM/SIGINT,
  `src/app.ts` split from `src/index.ts`.
- `--auth` apps: `requireAuth` JWT middleware guards `/api/v1/user`, and
  `SECRET_KEY` is checked at boot.

### Changed
- **Behavior change:** with `--auth`, `/api/v1/user` requires a Bearer token.

### Fixed
- `DEP0190` warning on Windows installs.
- Mongoose 9 `new: true` deprecation warning on updates.
- In-memory `POST /user` returns 400 (not 500) on an empty body.
- `cd` hint is relative to the current directory.
- Failed installs say the files were generated and how to recover.

### Repo
- CI runs on Windows; tag push publishes with provenance; weekly job re-runs the
  full build matrix and reports outdated pins.

## [2.0.0] - 2026-10-11

### Changed
- Rewritten as a zero-dependency ESM CLI (Node >= 20.19) with flags
  (`--yes`, `--mongo`, `--limiter`, `--auth`, `--rxjs`, `--pm`, `--no-install`).
- Generated app: Express 5, Mongoose 9, express-rate-limit 8, TypeScript 5.9,
  `tsc` build, `tsx` dev, ESLint flat config. Webpack, nodemon, airbnb config,
  `auto-bind` and `mongoose-unique-validator` removed.

### Fixed
- Unreachable `POST /user`, JWT signed with a literal string, mass assignment
  via `req.body`, CORS substring matching, error responses leaking internals,
  login user enumeration, missing register route.
