import mongoose from 'mongoose';
import logger from './logger.config';

export default class MongoDb {
  constructor() {}

  connect() {
    mongoose
      .connect(process.env.MONGO_DB, {
        useNewUrlParser: true,
      })
      .then(() => {
        logger.info('MongoDb connected');
      })
      .catch((error) => {
        logger.error(error);
      });
  }
}
