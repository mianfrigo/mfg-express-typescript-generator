# create-express-blueprint

Scaffold a production-ready **Express 5 + TypeScript** API in one command.

```bash
npm create express-blueprint@latest my-api
# or
npx create-express-blueprint my-api
pnpm create express-blueprint my-api
yarn create express-blueprint my-api
```

Run it with no flags in a terminal for an arrow-key wizard, or pass flags / a preset:

```bash
npm create express-blueprint@latest shop -- --preset api      # PostgreSQL, auth, zod, Swagger, tests
npm create express-blueprint@latest shop -- --postgres --auth --zod --openapi --test --ci --docker
npm create express-blueprint@latest shop -- --preset full --dry-run   # preview the files, write nothing
```

(With `npm create`, put `--` before the flags so npm passes them through.)

This package is a thin entry point. It runs [`@mianfrigo/express-typescript-generator`](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator), where the options, templates, tests and changelog live. See its README for the full list of flags, what you get, and how to configure defaults with `.mfgrc.json`.

MIT
