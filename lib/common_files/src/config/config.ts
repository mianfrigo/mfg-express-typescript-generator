import { CorsOptions } from 'cors';
import { Request } from 'express';
import { IncomingMessage, ServerResponse } from 'node:http';
import { TokenIndexer } from 'morgan';
import logger from './logger.config';

/* Cors Config  */
const corsOptions: CorsOptions = {
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'X-Access-Token',
    'Authorization',
  ],
  credentials: true,
  methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
};

const allowed = ['http://localhost:4200', 'http://localhost:3000'];

// Exact origin match. Requests without an Origin header (curl, server-to-server,
// same-origin) are served; they just get no CORS headers.
export const corsOptionsWhiteList = (
  request: Request,
  callback: (err: Error | null, options?: CorsOptions) => void
) => {
  const origin = request.header('origin');
  callback(null, {
    ...corsOptions,
    origin: origin !== undefined && allowed.includes(origin),
  });
};

export const morganConfig = (
  tokens: TokenIndexer,
  req: IncomingMessage,
  res: ServerResponse
) => {
  const log = [
    tokens.method(req, res),
    tokens.url(req, res),
    '-',
    'statusCode:',
    tokens.status(req, res),
    '-',
    'response-size:',
    tokens.res(req, res, 'content-length'),
    '-',
    'response-time:',
    tokens['response-time'](req, res),
    'ms',
  ].join(' ');
  logger.info(log);
  return log;
};
