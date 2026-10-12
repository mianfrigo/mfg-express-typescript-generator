# create-expresskit

Scaffold a production-ready **Express 5 + TypeScript** API in one command.

```bash
npm create expresskit@latest my-api
# or
npx create-expresskit my-api
pnpm create expresskit my-api
yarn create expresskit my-api
```

Run it with no flags in a terminal for an arrow-key wizard, or pass flags / a preset:

```bash
npm create expresskit@latest shop -- --preset api      # PostgreSQL, auth, zod, Swagger, tests
npm create expresskit@latest shop -- --postgres --auth --zod --openapi --test --ci --docker
npm create expresskit@latest shop -- --preset full --dry-run   # preview the files, write nothing
```

(With `npm create`, put `--` before the flags so npm passes them through.)

This package is a thin entry point. It runs [`@mianfrigo/express-typescript-generator`](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator), where the options, templates, tests and changelog live. See its README for the full list of flags, what you get, and how to configure defaults with `.mfgrc.json`.

MIT
