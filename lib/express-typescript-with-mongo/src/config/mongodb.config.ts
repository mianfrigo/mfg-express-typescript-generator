import mongoose from 'mongoose';
import { env } from './env';
import logger from './logger.config';

export default async function connectMongo() {
  await mongoose.connect(env.mongoUrl);
  logger.info('MongoDb connected');
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
