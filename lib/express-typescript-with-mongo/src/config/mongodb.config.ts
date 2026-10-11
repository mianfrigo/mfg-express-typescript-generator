import mongoose from 'mongoose';
import logger from './logger.config';

export default async function connectMongo() {
  const uri = process.env.MONGO_DB;
  if (!uri) throw new Error('MONGO_DB is not set. Add it to your .env file.');
  await mongoose.connect(uri);
  logger.info('MongoDb connected');
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
