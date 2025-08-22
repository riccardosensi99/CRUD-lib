import express, { type Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

export { createAuthRouter } from './modules/auth/auth.controller.js';
export { createUserRouter } from './modules/user/user.controller.js';

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
