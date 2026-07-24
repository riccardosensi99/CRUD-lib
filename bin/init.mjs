#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const templateRoot = path.join(packageRoot, 'templates', 'init');
const cwd = process.cwd();

const files = [
  { from: path.join(templateRoot, 'prisma', 'schema.prisma'), to: path.join(cwd, 'prisma', 'schema.prisma') },
  { from: path.join(templateRoot, 'src', 'server.ts'), to: path.join(cwd, 'src', 'server.ts') },
  { from: path.join(templateRoot, 'env.example'), to: path.join(cwd, '.env') },
];

function copyTemplate({ from, to }) {
  if (existsSync(to)) {
    console.log(`skip  ${path.relative(cwd, to)} (already exists)`);
    return;
  }
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`create ${path.relative(cwd, to)}`);
}

console.log('Scaffolding my-crud-lib project...\n');
for (const file of files) copyTemplate(file);

console.log(`
Next steps:
  npm i my-crud-lib express cors body-parser @prisma/client prisma dotenv
  npx prisma generate
  npx prisma migrate dev --name init
  npx ts-node src/server.ts

Edit .env with your DATABASE_URL and JWT_SECRET before starting the server.
`);
