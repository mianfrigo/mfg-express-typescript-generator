//{{auth}} import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';
//{{roles}} import { Role } from '../src/config/roles';
import connectMongo, { disconnectMongo } from '../src/config/mongodb.config';
import UserModel from '../src/models/user.schema';

// Development data only. Idempotent: upserts by email, safe to run repeatedly.
const users: {
  firstName: string;
  lastName: string;
  email: string;
//{{roles}}   role?: Role;
}[] = [
  { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
  { firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
  { firstName: 'Alan', lastName: 'Turing', email: 'alan@example.com' },
//{{roles}}   { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: 'admin' },
];

async function main() {
  if (env.production) {
    throw new Error('db:seed creates well-known passwords: development only.');
  }
  await connectMongo();
//{{auth}}   const password = await bcrypt.hash('password123', 10);
  for (const user of users) {
    await UserModel.updateOne(
      { email: user.email },
//{{auth}}       { $set: { ...user, password } },
//{{!auth}}       { $set: user },
      { upsert: true }
    );
  }
  console.log(`Seeded ${users.length} users`);
//{{auth}}   console.log('Development login: any seeded email with password "password123"');
//{{roles}}   console.log('Admin: admin@example.com (role admin), same password');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo());
