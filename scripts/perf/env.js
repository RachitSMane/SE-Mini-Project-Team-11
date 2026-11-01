// Shared set-up for the performance harness (STP TC-009, TC-013, TC-019, TC-020): a throw-away
// mongod, the server as a separate process, REST helpers, scripted clients, TB-STD and CSV output.
import { execSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';
import { SyncClient } from '@wb/shared/sync';
import { canonicalState } from '@wb/shared/objects';
import { freePort, startMongod } from '../mongod.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const QUICK = process.env.PERF_QUICK === '1';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Starts mongod and the server (NODE_ENV=production unless overridden). */
export async function startEnv(extraEnv = {}) {
  const mongo = process.env.TEST_MONGO_URL ? { url: process.env.TEST_MONGO_URL.replace(/\/$/, ''), stop: async () => {} } : await startMongod();
  const port = await freePort();
  const logFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wb-perf-')), 'server.log');
  const env = {
    ...process.env,
    ENV_FILE: 'none',
    NODE_ENV: 'production',
    PORT: String(port),
    HOST: '127.0.0.1',
    MONGO_URL: `${mongo.url}/wb_perf_${Date.now()}`,
    JWT_SECRET: crypto.randomBytes(48).toString('base64url'),
    LOGIN_HMAC_KEY: crypto.randomBytes(48).toString('base64url'),
    PUBLIC_URL: `http://127.0.0.1:${port}`,
    LOG_LEVEL: 'info',
    LOG_FILE: logFile,
    METRICS_INTERVAL_MS: '0',
    ...extraEnv,
  };
  const server = spawn(process.execPath, [path.join(root, 'server', 'src', 'index.js')], { env, stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true });
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      if ((await fetch(`${url}/api/v1/health`)).ok) break;
    } catch {
      // starting
    }
    if (server.exitCode !== null || Date.now() > deadline) throw new Error(`server did not start (log ${logFile})`);
    await sleep(200);
  }
  return {
    url,
    mongoUrl: env.MONGO_URL,
    logFile,
    async stop() {
      if (server.exitCode === null) {
        server.kill();
        await new Promise((r) => server.once('exit', r));
      }
      await mongo.stop();
    },
  };
}

export async function api(url, method, p, token, body, headers = {}) {
  const res = await fetch(`${url}/api/v1${p}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

export async function user(url, name) {
  const email = `${name.toLowerCase()}_${crypto.randomBytes(4).toString('hex')}@perf.test`;
  const password = `Pw-${crypto.randomBytes(8).toString('hex')}`;
  const { userId } = await api(url, 'POST', '/auth/register', null, { email, password, displayName: name });
  const session = await api(url, 'POST', '/auth/login', null, { email, password });
  return { id: userId, name, token: session.token, session };
}

/** Owner plus n-1 Editor members on a new board. */
export async function boardWithEditors(url, n) {
  const owner = await user(url, 'Owner');
  const { id: boardId } = await api(url, 'POST', '/boards', owner.token, { title: 'Perf board' });
  const editors = [];
  for (let i = 1; i < n; i += 1) {
    const u = await user(url, `Editor${i}`);
    const link = await api(url, 'POST', `/boards/${boardId}/links`, owner.token, { role: 'editor' });
    await api(url, 'POST', '/links/resolve', u.token, { token: link.url.split('#')[1] });
    editors.push(u);
  }
  return { owner, editors, boardId };
}

/** Scripted client: Socket.IO with the D6b settings + the COMP-02 sync module. */
export async function client(url, token, boardId) {
  const socket = io(`${url}/board`, { auth: { token }, transports: ['websocket'], reconnectionDelay: 500, reconnectionDelayMax: 2000, randomizationFactor: 0.2, forceNew: true });
  const sync = new SyncClient(socket, boardId);
  const t0 = Date.now();
  while (sync.status !== 'ready') {
    if (sync.status === 'error' || Date.now() - t0 > 15_000) throw new Error('join failed');
    await sleep(20);
  }
  return { socket, sync, close: () => (sync.close(), socket.disconnect()) };
}

/** Submits and resolves with the acknowledgement or rejection. */
export function submitAck(c, type, payload) {
  return new Promise((resolve) => {
    const id = c.sync.submit(type, payload);
    const unsub = c.sync.subscribe((kind, d) => {
      if ((kind === 'ack' || kind === 'rejected') && d.entry.clientOpId === id) {
        unsub();
        resolve(kind === 'ack' ? d.ack : { ok: false, error: d.error });
      }
    });
  });
}

/** Deterministic PRNG (mulberry32). */
export function prng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** TB-STD (D7a): 300 strokes (≤ 200 points), 50 shapes, 20 texts. */
export function tbStd(seed = 7, prefix = 'tb') {
  const r = prng(seed);
  const c = (max) => Math.round(r() * max * 10) / 10;
  const colours = ['#000000', '#D32F2F', '#1E88E5', '#43A047'];
  const out = [];
  for (let i = 0; i < 300; i += 1) {
    const n = 20 + Math.floor(r() * 181);
    let x = c(1100);
    let y = c(650);
    const points = [];
    for (let k = 0; k < n; k += 1) {
      x = Math.round((x + (r() - 0.5) * 8) * 10) / 10;
      y = Math.round((y + (r() - 0.5) * 8) * 10) / 10;
      points.push([x, y]);
    }
    out.push({ id: `${prefix}-s${i}`, kind: 'stroke', points, color: colours[i % 4], strokeWidth: 1 + (i % 6) });
  }
  const kinds = ['rect', 'ellipse', 'line'];
  for (let i = 0; i < 50; i += 1) {
    const k = kinds[i % 3];
    out.push(k === 'line'
      ? { id: `${prefix}-l${i}`, kind: 'line', x1: c(1000), y1: c(600), x2: c(1000), y2: c(600), color: '#000000', strokeWidth: 2 }
      : { id: `${prefix}-h${i}`, kind: k, x: c(1000), y: c(600), w: c(200), h: c(150), color: '#8E24AA', strokeWidth: 3 });
  }
  for (let i = 0; i < 20; i += 1) out.push({ id: `${prefix}-t${i}`, kind: 'text', x: c(1000), y: c(600), text: `Note ${i}: ${'lorem ipsum '.repeat(1 + (i % 5))}`.trim(), color: '#000000', strokeWidth: 2 });
  return out;
}

/** Adds objects through a client at ≤ 25 operations/s (below the 30/s limit). */
export async function seed(c, objects) {
  for (const o of objects) {
    const ack = await submitAck(c, 'object:add', o);
    if (!ack.ok) throw new Error(`seed rejected: ${JSON.stringify(ack.error)}`);
    await sleep(40);
  }
}

export async function freshState(url, token, boardId) {
  const c = await client(url, token, boardId);
  const s = c.sync.exportState();
  c.close();
  return s;
}

export function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  const rank = (q) => (s.length ? s[Math.max(0, Math.ceil(q * s.length) - 1)] : null); // nearest rank
  const r1 = (v) => (v === null ? null : Math.round(v * 10) / 10);
  return { n: s.length, median: r1(rank(0.5)), p95: r1(rank(0.95)), p99: r1(rank(0.99)), max: r1(s.at(-1) ?? null) };
}

export function environmentInfo() {
  let commit = 'uncommitted';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (execSync('git status --porcelain', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) commit += '+local-changes';
  } catch {
    // not a git checkout
  }
  let mongod = 'unknown';
  try {
    mongod = execSync(`"${process.env.MONGOD_BIN || 'mongod'}" --version`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().match(/db version v([\d.]+)/)?.[1] || mongod;
  } catch {
    // not on PATH
  }
  return { commit, cpu: os.cpus()[0].model.trim(), cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), os: `${os.type()} ${os.release()}`, node: process.version, mongod, quick: QUICK };
}

/** Appends one row to perf-results/<name>.csv (header written on creation). */
export function writeCsv(name, row) {
  const dir = path.join(root, 'perf-results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.csv`);
  const keys = Object.keys(row);
  const esc = (v) => (typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v ?? ''));
  if (!fs.existsSync(file)) fs.writeFileSync(file, `${keys.join(',')}\n`);
  fs.appendFileSync(file, `${keys.map((k) => esc(row[k])).join(',')}\n`);
  return file;
}

export const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export { canonicalState };
