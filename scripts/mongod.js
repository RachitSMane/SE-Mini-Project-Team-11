// Starts a throw-away local mongod (journaling on, standalone) for tests, E2E and performance runs.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

export async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export async function startMongod({ dbPath, port } = {}) {
  port = port || (await freePort());
  dbPath = dbPath || fs.mkdtempSync(path.join(os.tmpdir(), 'wb-mongo-'));
  fs.mkdirSync(dbPath, { recursive: true });
  const bin = process.env.MONGOD_BIN || 'mongod';
  const child = spawn(bin, ['--port', String(port), '--dbpath', dbPath, '--bind_ip', '127.0.0.1', '--quiet'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`mongod did not start:\n${output.slice(-2000)}`)), 30_000);
    const onData = (buf) => {
      output += buf.toString();
      if (/Waiting for connections/i.test(output)) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Cannot start mongod (${bin}): ${err.message}. Install MongoDB or set MONGOD_BIN.`));
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`mongod exited with code ${code}:\n${output.slice(-2000)}`));
    });
  });
  child.stdout.resume();
  child.stderr.resume();
  return {
    url: `mongodb://127.0.0.1:${port}`,
    port,
    dbPath,
    async stop({ keepData = false } = {}) {
      if (child.exitCode === null) {
        const exited = new Promise((r) => child.once('exit', r));
        child.kill();
        await exited;
      }
      if (!keepData) fs.rmSync(dbPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}
