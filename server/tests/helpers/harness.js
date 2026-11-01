// Test harness: in-process and child-process servers, REST helpers and scripted Socket.IO clients
// that use the same COMP-02 sync module as the browser client.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { SyncClient } from '@wb/shared/sync';
import { startServer } from '../../src/server.js';
import { logger } from '../../src/logger.js';
import { URL_FILE } from './globalSetup.js';
import { freePort } from '../../../scripts/mongod.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ENTRY = path.resolve(here, '../../src/index.js');

// Test-only secrets (never used outside tests; equivalent of .env.test, SAD §3.9.7).
export const TEST_JWT_SECRET = 'test-jwt-secret-0123456789abcdefghijklmnop';
export const TEST_HMAC_KEY = 'test-hmac-key-0123456789abcdefghijklmnopqr';

export function mongoBase() {
  return process.env.TEST_MONGO_URL || fs.readFileSync(URL_FILE, 'utf8').trim();
}

export function uniqueDbUrl(name = 'wb') {
  return `${mongoBase()}/${name}_${crypto.randomBytes(5).toString('hex')}`;
}

export function testEnv(extra = {}) {
  return {
    NODE_ENV: 'test',
    JWT_SECRET: TEST_JWT_SECRET,
    LOGIN_HMAC_KEY: TEST_HMAC_KEY,
    BCRYPT_COST: '4',
    PORT: '0',
    HOST: '127.0.0.1',
    LOG_LEVEL: 'info',
    PUBLIC_URL: 'http://localhost:5173',
    VERSION_INTERVAL_MS: '0',
    METRICS_INTERVAL_MS: '0',
    ...extra,
  };
}

/** In-process server on a fresh database; captures every log line in `logs`. */
export async function startTestServer(extra = {}) {
  const logs = [];
  const mongoUrl = extra.MONGO_URL || uniqueDbUrl();
  const server = await startServer(testEnv({ MONGO_URL: mongoUrl, ...extra }), { logStdout: false });
  const removeSink = logger.addSink((line) => logs.push(line));
  const sockets = [];
  return {
    ...server,
    mongoUrl,
    logs,
    parsedLogs: () => logs.map((l) => JSON.parse(l)),
    http: () => request(server.app),
    client(token, opts) {
      const s = connectSocket(server.url, token, opts);
      sockets.push(s);
      return s;
    },
    async stop() {
      for (const s of sockets) s.disconnect();
      removeSink();
      await server.close();
    },
  };
}

export function connectSocket(url, token, opts = {}) {
  return ioClient(`${url}/board`, {
    auth: { token },
    transports: ['websocket'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    randomizationFactor: 0.2,
    forceNew: true,
    ...opts,
  });
}

export function waitFor(predicate, { timeout = 5000, interval = 10, message = 'condition' } = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      let v;
      try {
        v = await predicate();
      } catch (err) {
        reject(err);
        return;
      }
      if (v) resolve(v);
      else if (Date.now() - start > timeout) reject(new Error(`Timed out waiting for ${message}`));
      else setTimeout(tick, interval);
    };
    tick();
  });
}

export function waitEvent(emitter, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timed out waiting for event ${event}`)), timeout);
    emitter.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

/** Emit with acknowledgement as a promise. */
export function emitAck(socket, event, payload, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`No acknowledgement for ${event}`)), timeout);
    socket.emit(event, payload, (ack) => {
      clearTimeout(t);
      resolve(ack);
    });
  });
}

let userCounter = 0;
export function newPassword() {
  return `Pw-${crypto.randomBytes(9).toString('base64url')}`;
}

/** REST helper bound to a base (supertest app or URL). */
export function restClient(target) {
  const agent = () => request(target);
  return {
    async register(name = 'User', email) {
      userCounter += 1;
      const addr = email || `user${userCounter}_${crypto.randomBytes(3).toString('hex')}@example.test`;
      const password = newPassword();
      const res = await agent().post('/api/v1/auth/register').send({ email: addr, password, displayName: name });
      if (res.status !== 201) throw new Error(`register failed ${res.status} ${JSON.stringify(res.body)}`);
      const login = await agent().post('/api/v1/auth/login').send({ email: addr, password });
      if (login.status !== 200) throw new Error(`login failed ${login.status}`);
      return { id: res.body.userId, email: addr, password, name, token: login.body.token };
    },
    async createBoard(token, title = 'Board') {
      const res = await agent().post('/api/v1/boards').set('Authorization', `Bearer ${token}`).send({ title });
      if (res.status !== 201) throw new Error(`createBoard failed ${res.status}`);
      return res.body.id;
    },
    async link(token, boardId, role, expiresIn = '7d') {
      const res = await agent().post(`/api/v1/boards/${boardId}/links`).set('Authorization', `Bearer ${token}`).send({ role, expiresIn });
      if (res.status !== 201) throw new Error(`link failed ${res.status} ${JSON.stringify(res.body)}`);
      return { ...res.body, token: res.body.url.split('#')[1] };
    },
    async addMember(ownerToken, boardId, userToken, role) {
      const l = await this.link(ownerToken, boardId, role);
      const res = await agent().post('/api/v1/links/resolve').set('Authorization', `Bearer ${userToken}`).send({ token: l.token });
      if (res.status !== 200) throw new Error(`resolve failed ${res.status}`);
      return l;
    },
    async guest(linkToken, displayName = 'Guest') {
      const res = await agent().post('/api/v1/links/resolve').send({ token: linkToken, displayName });
      if (res.status !== 200) throw new Error(`guest resolve failed ${res.status} ${JSON.stringify(res.body)}`);
      return { token: res.body.guestToken, name: displayName, ...jwt.decode(res.body.guestToken) };
    },
    agent,
  };
}

/** Scripted client: socket + COMP-02 SyncClient joined to a board. */
export async function scriptedClient(url, token, boardId, opts = {}) {
  const socket = connectSocket(url, token, opts.socket);
  const sync = new SyncClient(socket, boardId, opts.sync);
  await waitFor(() => sync.status === 'ready' || sync.status === 'error', { timeout: 10000, message: 'join' });
  if (sync.status !== 'ready') throw new Error('join failed');
  return {
    socket,
    sync,
    submit: (type, payload) => sync.submit(type, payload),
    /** Submit and resolve with the acknowledgement. */
    submitAck(type, payload) {
      return new Promise((resolve) => {
        const id = sync.submit(type, payload);
        if (!id) {
          resolve({ ok: false, error: { code: 'NOT_READY' } });
          return;
        }
        const unsub = sync.subscribe((kind, data) => {
          if ((kind === 'ack' || kind === 'rejected') && data.entry.clientOpId === id) {
            unsub();
            resolve(kind === 'ack' ? data.ack : { ok: false, error: data.error });
          }
        });
      });
    },
    close() {
      sync.close();
      socket.disconnect();
    },
  };
}

let objCounter = 0;
export function rect(extra = {}) {
  objCounter += 1;
  return { id: `r${objCounter}_${crypto.randomBytes(4).toString('hex')}`, kind: 'rect', x: 10, y: 20, w: 120, h: 60, color: '#1E88E5', strokeWidth: 3, ...extra };
}

export function stroke(n = 10, extra = {}) {
  objCounter += 1;
  const points = Array.from({ length: n }, (_, i) => [i * 2, Math.round(Math.sin(i) * 50 * 10) / 10]);
  return { id: `s${objCounter}_${crypto.randomBytes(4).toString('hex')}`, kind: 'stroke', points, color: '#000000', strokeWidth: 2, ...extra };
}

export function text(t = 'Sprint plan', extra = {}) {
  objCounter += 1;
  return { id: `t${objCounter}_${crypto.randomBytes(4).toString('hex')}`, kind: 'text', x: 50, y: 50, text: t, color: '#000000', strokeWidth: 1, ...extra };
}

/** Server as a child process (needed for crash/restart tests). Logs go to a file. */
export async function spawnServer({ mongoUrl, port, logFile, env = {} }) {
  port = port || (await freePort());
  logFile = logFile || path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wb-log-')), 'server.log');
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    env: { ...process.env, ...testEnv({ MONGO_URL: mongoUrl, PORT: String(port), LOG_FILE: logFile, ENV_FILE: 'none', ...env }) },
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
  });
  let stderr = '';
  child.stderr.on('data', (b) => {
    stderr += b.toString();
  });
  const exited = new Promise((resolve) => child.once('exit', (code) => resolve(code)));
  const url = `http://127.0.0.1:${port}`;
  const ready = await Promise.race([
    waitFor(async () => {
      try {
        const res = await fetch(`${url}/api/v1/health`);
        return res.ok;
      } catch {
        return false;
      }
    }, { timeout: 30000, interval: 100, message: 'server health' }).then(() => true),
    exited.then(() => false),
  ]);
  return {
    child,
    port,
    url,
    logFile,
    ready,
    exited,
    stderr: () => stderr,
    logs: () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    async kill() {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
        await exited;
      }
    },
  };
}
