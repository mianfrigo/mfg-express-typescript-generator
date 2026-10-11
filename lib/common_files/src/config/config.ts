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

export const corsOptionsWhiteList = (
  request: Request,
  callback: (err: Error | null, options?: CorsOptions) => void
) => {
  const whiteList = ['localhost:4200', 'localhost:3000'];
  const origin = request.header('origin') ?? request.header('host');
  if (origin && whiteList.some((host) => origin.includes(host))) {
    callback(null, { ...corsOptions, origin: true });
    return;
  }
  callback(new Error(`Origin not allowed by CORS: ${origin}`), {
    ...corsOptions,
    origin: false,
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
