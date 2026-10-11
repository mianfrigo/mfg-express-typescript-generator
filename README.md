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
| `--auth` | Add JWT login route (needs `--mongo`); writes a random `SECRET_KEY` to `.env` |
| `--rxjs` | Use rxjs instead of promises in controllers (needs `--mongo`) |
| `--pm npm\|pnpm\|yarn` | Package manager for install (default `npm`) |
| `--no-install` | Skip dependency install |
| `-v, --version` | Print version |

Default project name is `express-ts`.

## What you get

- Express 5, helmet, cors allow-list, morgan + winston logging, `.env` via dotenv.
- `npm run dev` (tsx watch), `npm run build` (tsc), `npm start`, `npm run lint` (ESLint flat config + prettier).
- Routes under `/api/v1`. With `--mongo`: edit `MONGO_DB` in `.env` before `npm run dev`.

## Migrating from 1.x

- Webpack, nodemon and the airbnb ESLint config are gone; build is plain `tsc`, dev is `tsx watch`.
- Needs Node >= 20.19 (Express 5, Mongoose 9, ESLint 10).
- `auto-bind` and `mongoose-unique-validator` removed; email uniqueness is a MongoDB unique index (duplicate -> HTTP 409).

## Development

```bash
node --test             # fast checks (generates into a temp dir, no install)
FULL=1 node --test      # also installs, builds and lints every flag combination
```

MIT
