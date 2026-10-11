# Changelog

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
