import autoBind from 'auto-bind';
import { NextFunction, Request, Response } from 'express';

export default class MainController {
  constructor() {
    autoBind(this);
  }

  getMessage(req: Request, res: Response, next: NextFunction) {
    res.status(200).json({
      message: 'Successfull response',
    });
  }
}
