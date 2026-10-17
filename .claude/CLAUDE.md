# CLAUDE.md

`@mianfrigo/express-typescript-generator`: a CLI that scaffolds an Express 5 + TypeScript API. Also publishes the thin wrapper `create-express-blueprint` (`packages/create-express-blueprint`). See `CONTRIBUTING.md` for setup, tests and how to add a flag.

## How I want to work

- **Use `/ponytail:ponytail` every time you write code.** Shortest working diff, reuse before adding, no speculative abstractions. A hook enforces it: a successful code edit uses up the marker, so invoke the skill again before the next edit. Edits to `.md`, `.json`, `.txt` and `.lock` files are exempt. Writing code through Bash (`sed -i`, redirects) is not gated; the rule still applies.
- Show a short design and wait for a go before implementing anything bigger than a fix. Write the failing test first.
- Open PRs; the user merges, tags and publishes. Never push to `main`, never run `npm publish`.
- After a release is tagged, verify it from the real registry (`npm view`, a fresh `npx` run), not from the repo.
- Commits are unsigned (`-c commit.gpgsign=false`) and end with the `Co-Authored-By` trailer from the session reminder. PR bodies end with the Claude Code line.
- Stacked PRs: merge commits, not squash (squash causes conflicts in the next PR of the stack).
- Don't poll or sleep in loops; run long suites in the background and wait for the notification.

## Commands

- `npm test`: fast checks, seconds (`test/options.test.js`, `test/smoke.test.js`, `test/wizard.test.js`).
- `FULL=1 npm test`: installs, builds, lints, typechecks and format-checks every flag combination and runs runtime checks. Several minutes; filter with `--test-name-pattern`.
- `POSTGRES_URL=… / MONGO_URL=…` with `FULL=1` boots the generated apps against a real database (CI does this in the `database` workflow).

## How the generator works (what the code doesn't say)

- `bin/cli.js` → `lib/options.js` (flags, presets, `.mfgrc.json`) → `lib/generate.js` (copy templates, render, package.json) → `lib/wizard.js` (clack wizard, injected prompts).
- Conditional template lines: `//{{flag}} ` / `#{{flag}} ` / `--{{flag}} ` keeps the line when the flag is on, `{{!flag}}` when off. **One flag per line**; for two conditions add a combined flag in `generate.js` (`rolespg`, `refreshzod`). A marker line with nothing after it loses its trailing space and stops matching: never use blank marker lines.
- Every generated text file is rendered (except `.git`); there is no list to maintain. Route files list their middleware inline and `ROUTE_MIDDLEWARE` strips the ones whose feature is off.
- Output is always LF. Templates are CRLF in a Windows checkout: edit them with tools that preserve line endings.
- The init Prisma migration is committed text, not generated: after changing `schema.prisma`, the FULL `checkMigrationMatchesSchema` test must still pass.
- Generated apps are formatted with their own Prettier after install, so template line lengths don't have to be Prettier-perfect.

## Gotchas learned the hard way

- pnpm is strict: don't augment types of transitive packages (augment `express`, not `express-serve-static-core`); pnpm 10+ needs the build allow-list in `pnpm-workspace.yaml`.
- Held-back pins on purpose: `typescript` 5.9 (typescript-eslint peer range), `vitest` 3.2.7 (4.x crashes the npm 10 resolver), Prisma 7.10.
- Generated tests import the app, which validates the environment at import: the generated CI workflow must declare every variable `src/config/env.ts` requires.
- npm rejects a package name too similar to an existing one (`create-expresskit` was refused); the release workflow publishes the generator, then the wrapper.
- Git Bash on Windows mangles backslashes in inline `node -e` and heredocs: write non-trivial scripts to a file with the Write tool.

## Release

Bump `package.json` (`npm version X.Y.Z --no-git-tag-version`), add the `CHANGELOG.md` entry, open the PR, and after it merges the user tags `vX.Y.Z`. The `release` workflow refuses a tag that doesn't match `package.json`, runs `FULL=1`, and publishes with provenance. Track the npm token expiry.
