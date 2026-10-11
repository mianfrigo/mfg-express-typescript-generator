import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Used by the prisma CLI (generate, migrate). The app itself reads
// DATABASE_URL in src/config/prisma.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
