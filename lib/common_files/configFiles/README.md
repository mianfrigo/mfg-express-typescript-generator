# Express + TypeScript app

Generated with [@mianfrigo/express-typescript-generator](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator).

## Scripts

- `npm run dev` — start with `tsx watch` at `http://localhost:3000/`.
- `npm run build` — compile to `dist/` with `tsc`.
- `npm start` — run the compiled server.
- `npm run lint` — ESLint (flat config).
#{{test}} - `npm test` — vitest + supertest (tests live in `test/`).
#{{postgres}} - `npm run db:migrate` — create and apply a migration after editing `prisma/schema.prisma`.
#{{postgres}} - `npm run db:deploy` — apply the committed migrations.

## Endpoints

All under `/api/v1`.

- `GET /health` — liveness.
- `GET /ready` — readiness (checks the database when there is one).
- `GET /user`, `GET /user/:id`, `POST /user`, `PUT /user/:id`, `DELETE /user/:id`
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

#{{docker}} ## Docker
#{{docker}} ```bash
#{{docker}} docker build -t app .
#{{docker}} docker run --env-file .env -p 3000:3000 app
#{{docker}} ```
