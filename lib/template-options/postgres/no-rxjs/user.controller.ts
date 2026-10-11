import { Request, Response } from 'express';
import createHttpError from 'http-errors';
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

export default class UserController {
  createUsers = async (req: Request, res: Response) => {
    const user = await prisma.user.create({
      data: pick(req.body) as UserInput,
      omit,
    });
    res.status(201).json(user);
  };

  getUsers = async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePaging(req.query);
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        omit,
      }),
      prisma.user.count(),
    ]);
    res.status(200).json(pageOf(users, total, page, limit));
  };

  getSingleUser = async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: idOf(req) },
      omit,
    });
    if (!user) throw new createHttpError.NotFound();
    res.status(200).json(user);
  };

  // a missing id makes prisma throw P2025, which the error handler maps to 404
  removeUser = async (req: Request, res: Response) => {
    await prisma.user.delete({ where: { id: idOf(req) } });
    res.status(200).json({
      message: `User ${idOf(req)} successfully deleted`,
    });
  };

  updateUser = async (req: Request, res: Response) => {
    const user = await prisma.user.update({
      where: { id: idOf(req) },
      data: pick(req.body),
      omit,
    });
    res.status(200).json(user);
  };
}
