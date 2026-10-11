import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { from, map } from 'rxjs';
import { prisma } from '../config/prisma';
import { pageOf, parsePaging } from '../utils/pagination';

type UserInput = { firstName: string; lastName: string; email: string };

const FIELDS = ['firstName', 'lastName', 'email'];
const pick = (body: Record<string, unknown> = {}) =>
  Object.fromEntries(
    Object.entries(body).filter(([k]) => FIELDS.includes(k))
  ) as Partial<UserInput>;

// express types a route param as string | string[]
const idOf = (req: Request) => req.params.id as string;

// never return the password hash
const omit = { password: true } as const;

const orNotFound = <T>(value: T | null) => {
  if (!value) throw new createHttpError.NotFound();
  return value;
};

const send = (res: Response, next: NextFunction, status = 200) => ({
  next: (body: unknown) => res.status(status).json(body),
  error: next,
});

export default class UserController {
  createUsers = (req: Request, res: Response, next: NextFunction) => {
    from(
      prisma.user.create({ data: pick(req.body) as UserInput, omit })
    ).subscribe(send(res, next, 201));
  };

  getUsers = (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, skip } = parsePaging(req.query);
    from(
      prisma.$transaction([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          omit,
        }),
        prisma.user.count(),
      ])
    )
      .pipe(map(([users, total]) => pageOf(users, total, page, limit)))
      .subscribe(send(res, next));
  };

  getSingleUser = (req: Request, res: Response, next: NextFunction) => {
    from(prisma.user.findUnique({ where: { id: idOf(req) }, omit }))
      .pipe(map(orNotFound))
      .subscribe(send(res, next));
  };

  // a missing id makes prisma throw P2025, which the error handler maps to 404
  removeUser = (req: Request, res: Response, next: NextFunction) => {
    from(prisma.user.delete({ where: { id: idOf(req) } }))
      .pipe(
        map(() => ({ message: `User ${idOf(req)} successfully deleted` }))
      )
      .subscribe(send(res, next));
  };

  updateUser = (req: Request, res: Response, next: NextFunction) => {
    from(
      prisma.user.update({
        where: { id: idOf(req) },
        data: pick(req.body),
        omit,
      })
    ).subscribe(send(res, next));
  };
}
