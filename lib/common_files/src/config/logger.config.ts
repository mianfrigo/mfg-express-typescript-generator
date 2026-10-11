import { createLogger, format, transports } from 'winston';

// Logs go to stdout (what containers and PaaS expect): JSON in production,
// readable text otherwise. Level comes from LOG_LEVEL (default info).
const production = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: production
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
