import { createServer } from './index.js';
import { createAuthRouter } from './modules/auth/auth.controller.js';
import 'dotenv/config';
import { createUserRouter } from './modules/user/user.controller.js';

const app = createServer();

app.use('/auth', createAuthRouter());
app.use('/users', createUserRouter());

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`API dev up on http://localhost:${PORT}`);
  console.log(`   -> POST /auth/register, /auth/login, POST /auth/refresh, GET /auth/me`);
  console.log(`   -> GET /users/me, PUT /users/me`);
});
