# Express + TypeScript app

Generated with [@mianfrigo/express-typescript-generator](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator).

## Scripts

- `npm run dev` — start with `tsx watch` at `http://localhost:3000/`.
- `npm run build` — compile to `dist/` with `tsc`.
- `npm start` — run the compiled server.
- `npm run lint` — ESLint (flat config).
#{{db}} - `npm run db:seed` — insert sample users (development only; safe to re-run).
#{{test}} - `npm test` — vitest + supertest (tests live in `test/`).
#{{postgres}} - `npm run db:migrate` — create and apply a migration after editing `prisma/schema.prisma`.
#{{postgres}} - `npm run db:deploy` — apply the committed migrations.

## Endpoints

All under `/api/v1`.

- `GET /health` — liveness.
- `GET /ready` — readiness (checks the database when there is one).
- `GET /user`, `GET /user/:id`, `POST /user`, `PUT /user/:id`, `DELETE /user/:id`
- `GET /user?page=1&limit=20` returns `{ data, meta }` where `meta` is `{ page, limit, total, totalPages }`; `limit` defaults to 20 and is capped at 100.
#{{auth}} - `POST /auth/register` and `POST /auth` — register and log in (JWT). The `/user` routes need `Authorization: Bearer <token>`.
#{{openapi}} - `GET /docs` (Swagger UI) and `GET /openapi.json`.

## Configuration

Copy `.env.example` to `.env` (`.env` is never committed).

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 3000) |
#{{mongo}} | `MONGO_DB` | MongoDB connection string |
#{{postgres}} | `DATABASE_URL` | PostgreSQL connection string |
#{{auth}} | `SECRET_KEY` | JWT signing secret; use a long random value |
| `CORS_ORIGINS` | Comma-separated browser origins allowed by CORS |
| `TRUST_PROXY` | Number of reverse-proxy hops to trust (set it behind a load balancer) |
| `LOG_LEVEL` | `debug`, `info`, `warn` or `error` (default `info`) |

Logs go to stdout: JSON when `NODE_ENV=production`, readable text otherwise.

#{{mongo}} ## Database (MongoDB)
#{{mongo}} Set `MONGO_DB` in `.env` (for a local server: `mongodb://localhost:27017/app`) before `npm run dev`.
#{{postgres}} ## Database (PostgreSQL)
#{{postgres}} ```bash
#{{postgres}} docker compose up -d   # local PostgreSQL matching DATABASE_URL
#{{postgres}} npm run db:deploy      # apply the committed migration
#{{postgres}} npm run dev
#{{postgres}} ```

#{{openapi}} ## API docs (Swagger UI)

#{{openapi}} With the app running, open **http://localhost:3000/api/v1/docs** (the port comes from `PORT`). The raw OpenAPI 3.1 document is at **http://localhost:3000/api/v1/openapi.json**.

#{{openapi}} The spec is generated from the zod schemas in `src/validation/`, so request bodies always match what the API accepts. Both routes are public.

#{{authdocs}} To call the protected routes from Swagger UI, get a token (see Authentication below), click **Authorize**, and paste the token without the `Bearer ` prefix.

#{{auth}} ## Authentication

#{{auth}} `/api/v1/user` needs an `Authorization: Bearer <token>` header. `/api/v1/auth/register`, `/api/v1/auth`, `/api/v1/health` and `/api/v1/ready` are public.

#{{auth}} 1. **Get a user.** Run `npm run db:seed` and use a seeded user: `ada@example.com`, `grace@example.com` or `alan@example.com`, all with the password `password123` (development only, never use it in production). Or register your own with `POST /api/v1/auth/register` and `firstName`, `lastName`, `email` and a `password` of at least 8 characters.
#{{auth}} 2. **Log in** with `POST /api/v1/auth` and `{ "email", "password" }`. The response contains `authToken`, valid for 24 hours.
#{{auth}} 3. **Send it** on every request as `Authorization: Bearer <authToken>`.

#{{auth}} ```bash
#{{auth}} curl -s -X POST http://localhost:3000/api/v1/auth \
#{{auth}}   -H 'content-type: application/json' \
#{{auth}}   -d '{"email":"ada@example.com","password":"password123"}'
#{{auth}} ```

#{{roles}} ## Roles

#{{roles}} Users have a `role`: `user` (the default for everyone who registers) or `admin`. The role is in the access token, and `requireAuth` puts it on `req.auth`.

#{{roles}} - `DELETE /api/v1/user/:id` is admin-only; a normal user gets 403.
#{{roles}} - `PATCH /api/v1/user/:id/role` with `{ "role": "admin" }` promotes or demotes a user (admin-only).
#{{roles}} - `npm run db:seed` also creates `admin@example.com` (role `admin`, same development-only password).
#{{roles}} - Protect your own routes with `requireRole('admin')` after `requireAuth` (see `src/middleware/auth.ts`).

#{{roles}} A role is read from the token, so a promotion applies on the next login (or token refresh).

#{{ci}} ## CI
#{{ci}} `.github/workflows/ci.yml` runs install, lint, build and tests on every push to `main` and on pull requests.

#{{docker}} ## Docker
#{{docker}} ```bash
#{{docker}} docker build -t app .
#{{docker}} docker run --env-file .env -p 3000:3000 app
#{{docker}} ```
#{{docker}} With a database, the whole stack (database, migrations when there are any, and the app) runs with one command:
#{{docker}} ```bash
#{{docker}} docker compose up --build
#{{docker}} ```
