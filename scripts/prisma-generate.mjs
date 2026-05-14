import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const homeDir = process.env.PRISMA_GENERATE_HOME || join(process.cwd(), '.home');
const cacheDir = process.env.XDG_CACHE_HOME || join(process.cwd(), '.cache');
mkdirSync(homeDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });

const command = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(command, ['generate'], {
  env: {
    ...process.env,
    HOME: homeDir,
    XDG_CACHE_HOME: cacheDir,
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
