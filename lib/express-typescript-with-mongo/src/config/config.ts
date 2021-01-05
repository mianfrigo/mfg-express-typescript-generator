import cors from 'cors';
import { Request, Response } from 'express';
import logger from './logger.config';

const corsWhitelist = (origin: string, callback: Function) => {
  const whiteList = process.env.CORS_WHITE_LIST.split(',');
  console.log(whiteList);
  if (whiteList.indexOf(origin) !== -1) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origin not allowed by CORS: ${origin}`));
};

export const corsOptions: cors.CorsOptions = {
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
  origin: '*', // use the method corsWhitelist() to allow specifit origins
  preflightContinue: false,
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
