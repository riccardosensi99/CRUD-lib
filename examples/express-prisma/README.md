# Express + Prisma Example

Minimal app using `my-crud-lib` with Express and Prisma.

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

The API starts on `http://localhost:3000`.

## Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/users/me`

Use `Authorization: Bearer <accessToken>` for protected routes.
