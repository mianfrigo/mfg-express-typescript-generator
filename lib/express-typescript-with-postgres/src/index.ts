import app from './app';
import { env } from './config/env';
import logger from './config/logger.config';
import { connectDb, disconnectDb } from './config/prisma';

const port = env.port;

connectDb()
  .then(() => {
    // Express 5 hands a bind error (EADDRINUSE, EACCES) to this callback
    const server = app.listen(port, (err?: Error) => {
      if (err) {
        logger.error(`could not listen on port ${port}: ${err.message}`);
        process.exit(1);
      }
      logger.info(`connected to port ${port}`);
    });

    // Graceful shutdown: drain requests, then close the database connection.
    const shutdown = () => {
      server.close(async () => {
        await disconnectDb();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    logger.error(String(err));
    process.exit(1);
  });
