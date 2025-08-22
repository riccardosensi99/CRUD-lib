import express, { type Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
export type { UserRepo } from './core/ports/user.repo.js';
export { createUserRouter } from './modules/user/user.controller.js';
export { createAuthRouter } from './modules/auth/auth.controller.js';
export { makePrismaUserRepo } from './adapters/prisma.js';

export function createServer(): Express {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  return app;
}


export function mountDefaultRoutes(app: Express) {
  const { createAuthRouter } = require('./modules/auth/auth.controller.js');
  const { createUserRouter } = require('./modules/user/user.controller.js');
  app.use('/auth', createAuthRouter());
  app.use('/users', createUserRouter());
}

function requireUserRouter(deps: { userRepo: import('./core/ports/user.repo.js').UserRepo }) {
  // @ts-ignore: compiled JS avrà il file corretto
  const { createUserRouter } = require('./modules/user/user.router.js');
  return createUserRouter({ userRepo: deps.userRepo });
}

function requireAuthRouter(_deps: unknown) {
  // @ts-ignore
  const { createAuthRouter } = require('./modules/auth/auth.router.js');
  return createAuthRouter(/* es: { userRepo: deps.userRepo, jwt: {...} } */);
}
