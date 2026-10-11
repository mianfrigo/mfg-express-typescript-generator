import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import logger from './logger.config';

// Checked at boot (this module loads with the controllers).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to your .env file.');
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

export async function connectDb() {
  await prisma.$connect();
  logger.info('PostgreSQL connected');
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
