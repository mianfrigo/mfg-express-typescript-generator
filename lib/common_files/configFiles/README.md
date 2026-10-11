# Express + TypeScript app

Generated with [@mianfrigo/express-typescript-generator](https://www.npmjs.com/package/@mianfrigo/express-typescript-generator).

## Scripts

- `npm run dev` — start with `tsx watch` at `http://localhost:3000/`.
- `npm run build` — compile to `dist/` with `tsc`.
- `npm start` — run the compiled server.
- `npm run lint` — ESLint (flat config) + Prettier rules.

## Notes

- Config lives in `.env` (never committed).
- CORS allow-list: `src/config/config.ts`.
- Logs are written to `logs/`.
- API base path: `/api/v1`.
