import mongoose from 'mongoose';
import logger from './logger.config';

export default class MongoDb {
  constructor() {}

  connect() {
    mongoose
      .connect('YOUR_MONGO_STRING_CONNECTION', {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
      })
      .then(() => {
        logger.info('MongoDb connected');
      })
      .catch((error) => {
        logger.error(error);
      });
  }
}
