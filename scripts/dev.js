// Development: runs the API server (node --watch, reads server/.env) and the Vite dev server
// (http://localhost:5173, proxies /api and /socket.io to the API). MongoDB must already run
// (`npm run db:start` in another terminal). Ctrl+C stops both.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The server reads ENV_FILE when set, otherwise server/.env (server/src/index.js).
const envFile = process.env.ENV_FILE || path.join(root, 'server', '.env');
if (!fs.existsSync(envFile)) {
  console.error(`${envFile} is missing. Copy server/.env.example to server/.env and set the two secrets (see README).`);
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  ['server', spawn(npm, ['run', 'dev', '-w', 'server'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })],
  ['client', spawn(npm, ['run', 'dev', '-w', 'client'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })],
];

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const [, child] of children) {
    if (child.exitCode !== null) continue;
    // On Windows the child is a shell; stop its whole process tree (node --watch, vite).
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill();
  }
  process.exitCode = code;
};
for (const [name, child] of children) {
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${name} exited with code ${code}; stopping.`);
      stop(code || 1);
    }
  });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
