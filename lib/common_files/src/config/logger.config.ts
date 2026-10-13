import { createLogger, format, transports } from 'winston';
import { env } from './env';

// Logs go to stdout (what containers and PaaS expect): JSON in production,
// readable text otherwise. Level comes from LOG_LEVEL (default info).
const logger = createLogger({
  level: env.logLevel,
  format: env.production
    ? format.combine(format.timestamp(), format.json())
    : format.combine(
        format.timestamp(),
        format.printf(
          (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
        )
      ),
  transports: [new transports.Console()],
});

export default logger;
