import { CorsOptions } from 'cors';
import { Request, Response } from 'express';
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

export const corsOptionsWhiteList = (request: Request, callback: Function) => {
  const whiteList = ['localhost:4200', 'localhost:3000'];
  const origin = request.header('origin')
    ? request.header('origin')
    : request.header('host');
  if (origin && whiteList.some((host: string) => origin.includes(host))) {
    corsOptions['origin'] = true;
    callback(null, corsOptions);
    return;
  }
  corsOptions['origin'] = false;
  callback(new Error(`Origin not allowed by CORS: ${origin}`), corsOptions);
};

export const morganConfig = (tokens: any, req: Request, res: Response) => {
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
