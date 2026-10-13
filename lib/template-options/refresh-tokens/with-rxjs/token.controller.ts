import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { from } from 'rxjs';
import { refreshSession, revokeSession } from '../services/tokens';

export default class TokenController {
  refresh = (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== 'string') {
      next(new createHttpError.BadRequest('refreshToken is required'));
      return;
    }
    from(refreshSession(refreshToken)).subscribe({
      next: (body) => res.status(200).json(body),
      error: next,
    });
  };

  logout = (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== 'string') {
      next(new createHttpError.BadRequest('refreshToken is required'));
      return;
    }
    from(revokeSession(refreshToken)).subscribe({
      next: () => res.status(204).end(),
      error: next,
    });
  };
}
