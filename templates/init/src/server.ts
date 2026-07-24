import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createLibrary, createServer } from 'my-crud-lib';
import { makePrismaUserRepo } from 'my-crud-lib/adapter-prisma';

const prisma = new PrismaClient();
const app = createServer();

const lib = createLibrary(
  {
    routesPrefix: '/api',
    auth: {
      passwordHashRounds: Number(process.env.BCRYPT_SALT) || 10,
    },
  },
  { userRepo: makePrismaUserRepo(prisma) },
);

app.use(lib.router);

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
