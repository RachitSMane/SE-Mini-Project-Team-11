// `npm run test:e2e:browsers` (TC-021, issue #25): the E2E suite in installed Chrome and Edge and in
// Playwright's Firefox and WebKit (Safari engine) builds. Override with E2E_BROWSERS, e.g.
// E2E_BROWSERS=chrome,msedge.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const env = { ...process.env, E2E_BROWSERS: process.env.E2E_BROWSERS || 'chrome,msedge,firefox,webkit' };
const r = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], { cwd: root, env, stdio: 'inherit' });
process.exit(r.status ?? 1);
