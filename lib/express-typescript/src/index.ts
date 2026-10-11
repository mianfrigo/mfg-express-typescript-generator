import 'dotenv/config';
import app from './app';
import logger from './config/logger.config';

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  logger.info(`connected to port ${port}`);
});

// Graceful shutdown: stop accepting connections, let in-flight requests finish.
const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
