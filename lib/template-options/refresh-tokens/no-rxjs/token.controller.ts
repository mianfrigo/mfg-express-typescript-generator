import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import { refreshSession, revokeSession } from '../services/tokens';

const tokenOf = (req: Request) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== 'string') {
    throw new createHttpError.BadRequest('refreshToken is required');
  }
  return refreshToken;
};

export default class TokenController {
  refresh = async (req: Request, res: Response) => {
    res.status(200).json(await refreshSession(tokenOf(req)));
  };

  logout = async (req: Request, res: Response) => {
    await revokeSession(tokenOf(req));
    res.status(204).end();
  };
}
