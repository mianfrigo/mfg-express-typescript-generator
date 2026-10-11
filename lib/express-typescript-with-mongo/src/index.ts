import 'dotenv/config';
import app from './app';
import logger from './config/logger.config';
import connectMongo, { disconnectMongo } from './config/mongodb.config';

const port = process.env.PORT || 3000;

connectMongo()
  .then(() => {
    const server = app.listen(port, () => {
      logger.info(`connected to port ${port}`);
    });

    // Graceful shutdown: drain requests, then close the Mongo connection.
    const shutdown = () => {
      server.close(async () => {
        await disconnectMongo();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error(err);
    logger.error(String(err));
    process.exit(1);
  });
