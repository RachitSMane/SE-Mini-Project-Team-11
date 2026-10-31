// SEC-REQ-007 application-side transport controls (FORCE_HTTPS, TRUST_PROXY), exercised locally with a
// simulated TLS-terminating proxy (X-Forwarded-Proto). Supplementary evidence only: TC-109 needs a
// real deployed HTTPS endpoint (TLS version, certificate, wss://) and stays Blocked without one.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { connectSocket, newPassword, startTestServer } from '../helpers/harness.js';

const PUBLIC = 'https://wb.example.test';
const HTTPS_ENV = { FORCE_HTTPS: 'true', TRUST_PROXY: 'true', PUBLIC_URL: PUBLIC };

let dist;
beforeAll(() => {
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-dist-'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>t</title>');
});
afterAll(() => fs.rmSync(dist, { recursive: true, force: true }));

/** Registers and logs in a user; `headers` are sent with both requests (e.g. X-Forwarded-Proto). */
async function sessionToken(srv, headers = {}) {
  const email = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = newPassword();
  const reg = await srv.http().post('/api/v1/auth/register').set(headers).send({ email, password, displayName: 'Transport' });
  expect(reg.status).toBe(201);
  const login = await srv.http().post('/api/v1/auth/login').set(headers).send({ email, password });
  expect(login.status).toBe(200);
  return login.body.token;
}

/** Resolves 'connected' or the connect_error message of a socket opened with the given headers. */
async function socketOutcome(srv, token, extraHeaders) {
  const s = connectSocket(srv.url, token, { extraHeaders, reconnection: false });
  let timer;
  try {
    // One timer and both listeners are always cleaned up, so no handle outlives the test.
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('no connect or connect_error within 10 s')), 10000);
      s.once('connect', () => resolve('connected'));
      s.once('connect_error', (e) => resolve(`error:${e.message}`));
    });
  } finally {
    clearTimeout(timer);
    s.removeAllListeners();
    s.disconnect();
  }
}

describe('FORCE_HTTPS with TRUST_PROXY behind a TLS-terminating proxy', () => {
  let srv;
  beforeAll(async () => {
    srv = await startTestServer({ ...HTTPS_ENV, CLIENT_DIST: dist });
  });
  afterAll(async () => srv?.stop());

  test('plain HTTP is redirected (308) to the configured HTTPS origin, never to a client-supplied Host', async () => {
    const res = await srv.http().get('/api/v1/health?x=1').set('Host', 'attacker.example');
    expect(res.status).toBe(308);
    expect(res.headers.location).toBe(`${PUBLIC}/api/v1/health?x=1`);
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000');
  });

  test('requests forwarded as HTTPS are served with HSTS', async () => {
    const res = await srv.http().get('/api/v1/health').set('X-Forwarded-Proto', 'https');
    expect(res.status).toBe(200);
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000');
  });

  test('the client CSP allows only secure WebSockets', async () => {
    const res = await srv.http().get('/').set('X-Forwarded-Proto', 'https');
    expect(res.status).toBe(200);
    const csp = res.headers['content-security-policy'];
    expect(csp).toMatch(/connect-src 'self' wss:;/);
    expect(csp).not.toMatch(/\bws:/);
  });

  test('real-time connections are accepted only when forwarded as HTTPS (wss://)', async () => {
    const token = await sessionToken(srv, { 'X-Forwarded-Proto': 'https' });
    expect(await socketOutcome(srv, token, { 'X-Forwarded-Proto': 'https' })).toBe('connected');
    expect(await socketOutcome(srv, token, {})).toMatch(/^error:/);
    expect(await socketOutcome(srv, token, { 'X-Forwarded-Proto': 'http' })).toMatch(/^error:/);
  });

  // forwardedProto() (server.js) must decide exactly like Express's req.protocol, which takes the first
  // value of a comma-separated X-Forwarded-Proto. A proxy that appends instead of replacing the header
  // would let the client's value win in both places; the deployment plan therefore requires replacing it.
  test('REST and real-time connections read a multi-valued X-Forwarded-Proto the same way (first value)', async () => {
    const token = await sessionToken(srv, { 'X-Forwarded-Proto': 'https' });
    const rest = async (proto) => (await srv.http().get('/api/v1/health').set('X-Forwarded-Proto', proto)).status;
    expect(await rest('http, https')).toBe(308);
    expect(await socketOutcome(srv, token, { 'X-Forwarded-Proto': 'http, https' })).toMatch(/^error:/);
    expect(await rest('https, http')).toBe(200);
    expect(await socketOutcome(srv, token, { 'X-Forwarded-Proto': 'https, http' })).toBe('connected');
  });
});

describe('local defaults (FORCE_HTTPS off)', () => {
  let srv;
  beforeAll(async () => {
    srv = await startTestServer({ CLIENT_DIST: dist });
  });
  afterAll(async () => srv?.stop());

  test('no redirect, no HSTS, ws: allowed, plain real-time connections accepted', async () => {
    const res = await srv.http().get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['strict-transport-security']).toBeUndefined();
    const page = await srv.http().get('/');
    expect(page.headers['content-security-policy']).toMatch(/connect-src 'self' ws: wss:;/);
    const token = await sessionToken(srv);
    expect(await socketOutcome(srv, token, {})).toBe('connected');
  });
});
