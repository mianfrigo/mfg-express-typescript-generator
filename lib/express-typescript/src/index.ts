import 'dotenv/config';
import app from './app';
import logger from './config/logger.config';

const port = process.env.PORT || 3000;

// Express 5 hands a bind error (EADDRINUSE, EACCES) to this callback. Without
// the check the app would log "connected" and idle without listening.
const server = app.listen(port, (err?: Error) => {
  if (err) {
    console.error(`could not listen on port ${port}: ${err.message}`);
    logger.error(`could not listen on port ${port}: ${err.message}`);
    process.exit(1);
  }
  logger.info(`connected to port ${port}`);
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish.
const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
