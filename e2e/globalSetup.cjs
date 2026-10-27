// Starts a throw-away mongod and the server (NODE_ENV=test, CLIENT_DIST=client/dist) for the E2E run.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, startMongod } = require('../scripts/mongod.js');

const root = path.resolve(__dirname, '..');
// Test-only secret; specs use it to sign deliberately short-lived tokens (as TC-106 does).
const E2E_JWT_SECRET = 'e2e-jwt-secret-0123456789abcdefghijklmnopqrstu';

module.exports = async function globalSetup() {
  const dist = path.join(root, 'client', 'dist', 'index.html');
  if (!fs.existsSync(dist)) throw new Error('client/dist is missing: run `npm run build:test` (npm run test:e2e does this).');
  // TEST_MONGO_URL: use an existing MongoDB (e.g. the CI service container) instead of a local mongod.
  const mongo = process.env.TEST_MONGO_URL ? { url: process.env.TEST_MONGO_URL.replace(/\/$/, ''), stop: async () => {} } : await startMongod();
  const port = await freePort();
  const logFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wb-e2e-')), 'server.log');
  const server = spawn(process.execPath, [path.join(root, 'server', 'src', 'index.js')], {
    env: {
      ...process.env,
      ENV_FILE: 'none',
      NODE_ENV: 'test',
      PORT: String(port),
      HOST: '127.0.0.1',
      MONGO_URL: `${mongo.url}/wb_e2e`,
      JWT_SECRET: E2E_JWT_SECRET,
      LOGIN_HMAC_KEY: 'e2e-hmac-key-0123456789abcdefghijklmnopqrstuv',
      BCRYPT_COST: '4',
      PUBLIC_URL: `http://127.0.0.1:${port}`,
      CLIENT_DIST: path.join(root, 'client', 'dist'),
      VERSION_INTERVAL_MS: '0',
      LOG_FILE: logFile,
      LOG_LEVEL: 'info',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
    windowsHide: true,
  });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) break;
    } catch {
      // not up yet
    }
    if (server.exitCode !== null || Date.now() > deadline) throw new Error(`E2E server did not start (log: ${logFile})`);
    await new Promise((r) => setTimeout(r, 200));
  }
  process.env.E2E_BASE_URL = base;
  process.env.E2E_LOG_FILE = logFile;
  process.env.E2E_JWT_SECRET = E2E_JWT_SECRET;
  return async () => {
    server.kill();
    await new Promise((r) => (server.exitCode !== null ? r() : server.once('exit', r)));
    await mongo.stop();
  };
}
