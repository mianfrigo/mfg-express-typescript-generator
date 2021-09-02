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
  const whiteList = ['http://localhost:4200', 'http://localhost:5000'];
  const origin = request.header('origin')
    ? request.header('origin')
    : request.header('referer').slice(0, request.header('referer').length - 1);
  if (whiteList.indexOf(origin) !== -1) {
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
