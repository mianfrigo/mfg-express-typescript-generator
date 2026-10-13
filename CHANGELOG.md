# Changelog

## [2.9.0] - 2026-10-13

### Added
- **`--roles`** (needs `--auth`). Users get a `role` (`user` or `admin`) in the
  model, the migration and the access token. `requireRole('admin')` is exported
  from the auth middleware and `req.auth` carries the caller. `DELETE /user/:id`
  becomes admin-only, `PATCH /user/:id/role` promotes and demotes, and
  `db:seed` adds `admin@example.com`. A role set through the normal write
  routes is ignored.
- **`--refresh-tokens`** (needs `--auth`). The access token lives 15 minutes
  (`ACCESS_TOKEN_TTL`) and login also returns an opaque refresh token
  (`REFRESH_TOKEN_TTL_DAYS`, default 30). `POST /auth/refresh` rotates it and
  `POST /auth/logout` ends the session. Only a SHA-256 hash is stored (a
  mongoose model with a TTL index, or a Prisma `RefreshToken` model and
  migration). Replaying a spent token revokes the whole session, and a refresh
  re-reads the user, so a role change applies.
- **Wizard:** with Authentication selected it asks for roles and refresh tokens.
  Both are also config-file keys (`roles`, `refresh-tokens`).
- OpenAPI, the generated README and `AGENTS.md` follow both flags.

### Changed
- The README is restructured: features, installation, quick start, an
  architecture tree and a collapsible file list.

### Repo
- SQL templates support `--{{flag}}` marker lines.
- The FULL matrix checks that the committed Prisma migration equals what
  `prisma migrate diff` generates from the schema, and runs role and
  refresh-token scenarios against real PostgreSQL and MongoDB.

## [2.8.1] - 2026-10-12

### Added
- **`npm create express-blueprint`.** The thin entry-point package is now
  published as `create-express-blueprint`: `npm create express-blueprint@latest
  my-api` (also `pnpm create`, `yarn create` and `npx create-express-blueprint`).
  It runs this generator, so flags, presets, the wizard and `--dry-run` work the
  same. With `npm create`, put `--` before flags.

### Fixed
- **A taken port is a clear failure.** In Express 5 the `app.listen` callback
  receives the bind error, which the generated `src/index.ts` ignored: if the
  port was in use the app logged `connected to port N` and idled without
  listening. It now prints the error (`EADDRINUSE`, `EACCES`) and exits with
  code 1.

### Notes
- 2.8.0 announced `create-expresskit`. npm rejected that name as too similar to
  the existing `create-express-kit`, so it was never published; the package
  under its final name first ships with this release.

### Repo
- The runtime checks ask the OS for a free port and report the port and last
  response when an app fails to boot.

## [2.8.0] - 2026-10-12

### Added
- **Interactive wizard.** Run the generator with no flags in a terminal and pick
  Minimal, API starter, Full or Custom with the arrow keys. Custom asks for a
  database and then a checklist of features; options that need something else
  are disabled with the reason (authentication and rxjs need a database,
  Swagger needs validation). It prints the equivalent command and asks you to
  confirm; Esc or Ctrl+C cancels without writing anything. It is skipped when
  `--yes`, `--preset` or any feature flag is given, and in scripts and CI.
- **`npm create expresskit`.** A new thin package, `create-expresskit`, runs
  this generator under a name `npm create`, `pnpm create` and `yarn create`
  understand: `npm create expresskit@latest my-api`. It is published from the
  same release as this package.

### Changed
- **One runtime dependency:** `@clack/prompts` (pinned exactly), used only by the
  wizard and loaded only when the wizard runs. The package is no longer "zero
  runtime dependencies".
- A `package-lock.json` is committed, and Dependabot watches npm.

### Repo
- Every workflow that runs the tests installs dependencies with `npm ci` first.
- The release workflow publishes `create-expresskit` once per version, after the
  generator, with provenance.

## [2.7.0] - 2026-10-12

### Added
- **`--preset minimal|api|full`**: a bundle of flags (`api` is `--postgres
  --auth --zod --openapi --test`; `full` adds `--ci --docker --limiter`). A
  preset answers every question, explicit flags are added on top, and an
  explicit database replaces the preset's.
- **`.mfgrc.json`** team defaults, read from the home directory and then the
  current directory (which overrides). Keys are `preset`, `pm` and the feature
  flags; precedence is preset, then file, then command line. Errors name the
  file and key. `--no-config` ignores it.
- **`--dry-run`**: prints the files, dependency counts and scripts a run would
  create and writes nothing. It runs the real generator into a temporary
  directory, so the preview cannot drift from a real run.

### Repo
- The release workflow skips install, test and publish when the version is
  already on npm, so re-pushing a tag no longer ends in a red run.
- Boot waits in the runtime checks sleep after every failed attempt and report
  why the app did not answer.

## [2.6.0] - 2026-10-12

### Added
- **`AGENTS.md`** in every generated project: commands, file layout,
  conventions and "adding a resource" steps for AI coding agents and new
  contributors, written for the options you chose (database, auth, zod, OpenAPI,
  tests, CI, Docker). On by default; `--no-agents` skips it.
- `SECURITY.md`, `CONTRIBUTING.md`, issue templates and a pull request template.
- README: CI and downloads badges, a "Which generator should you use?" section,
  and the real file list of a generated project.

### Fixed
- **`--pm pnpm` on pnpm 10 and newer.** `pnpm install` refused dependency build
  scripts (`esbuild`, `prisma`, `@prisma/engines`) and exited with
  `ERR_PNPM_IGNORED_BUILDS`, so the generator reported a failed install. The
  project now gets a `pnpm-workspace.yaml` allow-list (`onlyBuiltDependencies`
  for pnpm 10, `allowBuilds` for pnpm 11+); telemetry (`@scarf/scarf`) stays
  blocked.

### Repo
- The full test matrix runs pnpm and yarn combinations (CI installs both).
- Package description and keywords improved for npm search.

## [2.5.2] - 2026-10-12

### Docs
- Generated apps' README gains an **API docs (Swagger UI)** section with
  `http://localhost:3000/api/v1/docs` and `/api/v1/openapi.json` (with
  `--openapi`), and an **Authentication** section (with `--auth`): how to get a
  user (`npm run db:seed`, then `ada@example.com`, `grace@example.com` or
  `alan@example.com` with `password123` for development, or register your own),
  how to log in, how to send the token, and a curl example. With both flags it
  explains the Swagger **Authorize** button.
- The npm README documents the same, and says plainly that there is no built-in
  default user.

### Changed
- Generated Markdown is written with LF line endings and runs of blank lines
  left by omitted sections are collapsed.

## [2.5.1] - 2026-10-11

### Docs
- The README shown on npm is rewritten: quick start and recipes, the options
  grouped by database, features, tooling and CLI, the endpoint and configuration
  tables, database and Docker workflows, and migration notes for 1.x and the
  2.x behavior changes. 2.5.0 was published before this landed, so its npm page
  still shows the old text and its stale "needs `--mongo`" wording.
- No code or generated-output changes.

## [2.5.0] - 2026-10-11

### Added
- Paginated `GET /api/v1/user?page=&limit=` in every app variant (in-memory,
  MongoDB, PostgreSQL; promise and rxjs). `limit` defaults to 20 and is capped
  at 100; missing or invalid values fall back to the defaults. Results are
  ordered so pages do not shuffle. Documented in the OpenAPI spec and the
  generated README.
- Full-stack `docker-compose.yml` with `--docker`: PostgreSQL apps get a
  one-shot `migrate` service (`prisma migrate deploy`) and the `app`; MongoDB
  apps get `mongo:7` and the `app`. Healthchecks order the startup, and
  `docker compose up --build` runs everything.
- MongoDB apps now ship a `docker-compose.yml` with a local `mongo:7` service,
  also without `--docker`.

### Changed
- **`GET /api/v1/user` returns an envelope** `{ data, meta: { page, limit, total,
  totalPages } }` instead of a bare array. Clients that read the array body need
  to read `data`.
- **`MONGO_DB` defaults to `mongodb://localhost:27017/app`** (matching the
  compose service) instead of a placeholder string.
- The Dockerfile keeps development dependencies in the build stage and prunes
  them in the final stage, so the compose `migrate` service has the Prisma CLI.
  The runtime image contents are unchanged.

### Repo
- New `docker` workflow brings the generated stack up with
  `docker compose up --build` for both databases and checks `/ready`,
  register, login, an authenticated list and the unauthenticated 401.
- Runtime checks cover pagination against the compiled app and against real
  PostgreSQL and MongoDB.

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
