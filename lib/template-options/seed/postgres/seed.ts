import 'dotenv/config';
//{{auth}} import bcrypt from 'bcryptjs';
import { disconnectDb, prisma } from '../src/config/prisma';

// Development data only. Idempotent: upserts by email, safe to run repeatedly.
const users = [
  { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
  { firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
  { firstName: 'Alan', lastName: 'Turing', email: 'alan@example.com' },
];

async function main() {
//{{auth}}   const password = await bcrypt.hash('password123', 10);
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
//{{auth}}       update: { password },
//{{!auth}}       update: {},
//{{auth}}       create: { ...user, password },
//{{!auth}}       create: user,
    });
  }
  console.log(`Seeded ${users.length} users`);
//{{auth}}   console.log('Development login: any seeded email with password "password123"');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
