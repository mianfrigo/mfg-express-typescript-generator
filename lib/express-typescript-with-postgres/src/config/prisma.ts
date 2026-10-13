import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from './env';
import logger from './logger.config';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.databaseUrl }),
});

export async function connectDb() {
  await prisma.$connect();
  logger.info('PostgreSQL connected');
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
