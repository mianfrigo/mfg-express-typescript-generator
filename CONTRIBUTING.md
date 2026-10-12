# Contributing

Thanks for helping. The project is small on purpose: a small CLI (`bin/`, `lib/options.js`, `lib/generate.js`, `lib/wizard.js`) with one runtime dependency and a set of templates under `lib/`.

## Setup

```bash
git clone https://github.com/mianfrigo/mfg-express-typescript-generator
cd mfg-express-typescript-generator
npm test                # fast checks: generates into temp directories, no install
```

Node >= 20.19, then `npm install` once (the only runtime dependency is `@clack/prompts`, used by the interactive wizard and loaded lazily). There is no build step. Keep new runtime dependencies to a minimum: the generator is run through `npx` on other people's machines.

## Tests

| Command | What it does |
|---|---|
| `npm test` | Option parsing and generation checks. Seconds. |
| `FULL=1 npm test` | Also installs, builds and lints every flag combination, and checks compiled output at runtime (validation, auth guard, health, pagination, stdout logging). A few minutes. |
| `FULL=1 POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres npm test -- --test-name-pattern postgres` | Boots the generated `--postgres` apps against a real PostgreSQL and drives CRUD, auth and seeding over HTTP. |
| `FULL=1 MONGO_URL=mongodb://127.0.0.1:27017 npm test -- --test-name-pattern mongo` | The same for the MongoDB apps. |

CI runs all of these (`test`, `database`, `docker` workflows). If you cannot run a database locally, say so in the pull request and CI will.

## How the templates work

Templates are plain files under `lib/`. `lib/generate.js` copies the folders for the chosen options, then renders conditional lines.

- A line starting with `//{{flag}} ` (or `#{{flag}} ` in YAML, Dockerfile and Markdown) is kept, with the prefix removed, when the flag is on.
- `//{{!flag}} ` is kept when the flag is off.
- Available flags are built in `lib/generate.js` (`auth`, `zod`, `openapi`, `mongo`, `postgres`, `db`, `docker`, `test`, `ci`, `limiter`, `rxjs`, `authdocs`).

Dependency versions of generated apps are pinned in `lib/generate.js`. Bump them there and run `FULL=1 npm test`.

## Adding or changing a flag

1. Write the failing test first (`test/options.test.js` for parsing, `test/smoke.test.js` for generated output).
2. Add it to `parseArgs` in `lib/options.js` and to the returned options.
3. Wire it in `lib/generate.js` (copy step, marker flag, dependencies).
4. Document it in `README.md`. A test fails if a flag is missing from the README, and `AGENTS.md` (`lib/common_files/configFiles/AGENTS.md`) must stay accurate: a test checks that every path it mentions exists.
5. If it changes generated output, add a `FULL` combination so it is built, linted and, where possible, run.

## Pull requests

- Keep each PR to one idea, with its tests.
- Note any behavior change for the changelog in the PR description.
- Release housekeeping (maintainers): move entries to a new heading in `CHANGELOG.md` and bump `package.json` after the content PRs are merged, then tag the merge commit. The `release` workflow refuses a tag that does not match `package.json`.

## Reporting bugs and security issues

Use the issue templates for bugs and ideas. For security problems follow `SECURITY.md` and do not open a public issue.
