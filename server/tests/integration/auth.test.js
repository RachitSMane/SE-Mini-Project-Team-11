// COMP-04 Auth Service through API-02 and the Socket.IO handshake.
// STP: TC-015 (FR-040, FR-041), TC-105 (SEC-REQ-001), TC-106 (SEC-REQ-002), TC-108 (SEC-REQ-006),
// and the login part of TC-104 (SEC-REQ-008).
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  connectSocket,
  emitAck,
  rect,
  scriptedClient,
  startTestServer,
  TEST_JWT_SECRET,
  waitEvent,
  waitFor,
} from '../helpers/harness.js';
import { apiClient as client, expectError } from '../helpers/api.js';
import { User, BoardObject } from '../../src/db/models.js';

const pw = (n) => crypto.randomBytes(64).toString('base64url').slice(0, n);
const email = () => `u_${crypto.randomBytes(5).toString('hex')}@example.test`;

/** Socket.IO handshake result: 'connected' or the connect_error data code. */
async function handshake(srv, token) {
  const s = connectSocket(srv.url, token, { reconnection: false });
  try {
    return await new Promise((resolve) => {
      s.once('connect', () => resolve('connected'));
      s.once('connect_error', (err) => resolve(err.data?.code || err.message));
    });
  } finally {
    s.close();
  }
}

// ---------------------------------------------------------------------------------------------
describe('TC-015 register, log in, log out (FR-040, FR-041)', () => {
  let srv;
  let c;
  beforeAll(async () => {
    srv = await startTestServer();
    c = client(srv);
  });
  afterAll(async () => {
    await srv.stop();
  });

  test('registration: display-name boundaries, duplicate e-mail, unknown fields', async () => {
    const password = pw(12);
    const first = email();
    const one = await c.call('post', '/auth/register', null, { email: first, password, displayName: 'A' });
    expect(one.status).toBe(201);
    expect(Object.keys(one.body)).toEqual(['userId']);
    const thirty = await c.call('post', '/auth/register', null, { email: email(), password, displayName: 'x'.repeat(30) });
    expect(thirty.status).toBe(201);

    expectError(await c.call('post', '/auth/register', null, { email: first, password, displayName: 'B' }), 409, 'EMAIL_TAKEN');
    expectError(await c.call('post', '/auth/register', null, { email: first.toUpperCase(), password, displayName: 'B' }), 409, 'EMAIL_TAKEN');
    for (const displayName of ['', '   ', 'x'.repeat(31)]) {
      expectError(await c.call('post', '/auth/register', null, { email: email(), password, displayName }), 400, 'VALIDATION_FAILED');
    }
    for (const body of [
      { email: 'not-an-email', password, displayName: 'C' },
      { email: email(), password },
      { email: email(), password, displayName: 'C', role: 'admin' },
    ]) {
      expectError(await c.call('post', '/auth/register', null, body), 400, 'VALIDATION_FAILED');
    }
    const bad = await c.call('post', '/auth/register', null, '{"email":').set('Content-Type', 'application/json');
    expectError(bad, 400, 'VALIDATION_FAILED');
  });

  test('login, generic failure message, logout revokes the session', async () => {
    const U = await c.register('User');
    const wrong = await c.call('post', '/auth/login', null, { email: U.email, password: `${U.password}x` });
    expectError(wrong, 401, 'UNAUTHENTICATED');
    expect(wrong.body.error.message).toBe('Invalid e-mail or password.');
    const unknown = await c.call('post', '/auth/login', null, { email: email(), password: U.password });
    expect({ status: unknown.status, ...unknown.body.error, requestId: 0 }).toEqual({ status: wrong.status, ...wrong.body.error, requestId: 0 });

    const ok = await c.call('post', '/auth/login', null, { email: U.email.toUpperCase(), password: U.password });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ token: expect.any(String), expiresAt: expect.any(String), user: { id: U.id, displayName: 'User' } });
    const lifetime = Date.parse(ok.body.expiresAt) - Date.now();
    expect(lifetime).toBeGreaterThan(24 * 3600_000 - 60_000); // D8c: 24 h
    expect(lifetime).toBeLessThanOrEqual(24 * 3600_000);
    expect(jwt.decode(ok.body.token)).toMatchObject({ typ: 'session', sub: U.id, jti: expect.any(String) });

    expect((await c.call('get', '/boards', ok.body.token)).status).toBe(200);
    expect((await c.call('post', '/auth/logout', ok.body.token)).status).toBe(204);
    expectError(await c.call('get', '/boards', ok.body.token), 401, 'UNAUTHENTICATED');
    expectError(await c.call('post', '/auth/logout', ok.body.token), 401, 'UNAUTHENTICATED');
    expect(await handshake(srv, ok.body.token)).toBe('UNAUTHENTICATED');
    // Another session of the same user is unaffected.
    expect((await c.call('get', '/boards', U.token)).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------------------------
describe('TC-105 password policy and storage (SEC-REQ-001)', () => {
  let srv;
  let c;
  beforeAll(async () => {
    srv = await startTestServer();
    c = client(srv);
  });
  afterAll(async () => {
    await srv.stop();
  });

  test('8–72 characters accepted, 7 and 73 rejected; salted bcrypt hashes; nothing in logs', async () => {
    const pws = { 7: pw(7), 8: pw(8), 72: pw(72), 73: pw(73) };
    const reg = (password) => c.call('post', '/auth/register', null, { email: email(), password, displayName: 'P' });
    expectError(await reg(pws[7]), 400, 'VALIDATION_FAILED');
    expectError(await reg(pws[73]), 400, 'VALIDATION_FAILED');
    expect((await reg(pws[8])).status).toBe(201);
    expect((await reg(pws[72])).status).toBe(201);

    const same = pw(16);
    const a = await reg(same);
    const b = await reg(same);
    const [ua, ub] = await Promise.all([User.findById(a.body.userId).lean(), User.findById(b.body.userId).lean()]);
    expect(ua.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(ua.passwordHash).not.toBe(ub.passwordHash);
    for (const u of [ua, ub]) {
      expect(Object.keys(u).sort()).toEqual(['__v', '_id', 'createdAt', 'displayName', 'email', 'passwordHash']);
      expect(JSON.stringify(u)).not.toContain(same);
    }
    const all = srv.logs.join('\n');
    for (const p of [...Object.values(pws), same]) expect(all.includes(p)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe('TC-106 tokens: missing, tampered, expired, logged out, wrong board (SEC-REQ-002)', () => {
  let srv;
  let c;
  const open = [];
  beforeAll(async () => {
    srv = await startTestServer();
    c = client(srv);
  });
  afterAll(async () => {
    for (const x of open) x.close();
    await srv.stop();
  });

  test('invalid session and guest tokens are rejected on REST and on the socket handshake', async () => {
    const U = await c.register('User');
    const B = await c.createBoard(U.token, 'B');
    const B4 = await c.createBoard(U.token, 'B4');
    const link = await c.link(U.token, B, 'editor');
    const GT = await c.guest(link.token, 'Guest');

    const [head, payload, sig] = U.token.split('.');
    const flip = (ch) => (ch === 'A' ? 'B' : 'A');
    const tampered = `${head}.${payload}.${flip(sig[0])}${sig.slice(1)}`;
    const forgedClaims = `${head}.${Buffer.from(JSON.stringify({ ...jwt.decode(U.token), sub: '0123456789abcdef01234567' })).toString('base64url')}.${sig}`;
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredSession = jwt.sign({ typ: 'session', jti: crypto.randomUUID(), sub: U.id, exp: nowSec - 10 }, TEST_JWT_SECRET, { algorithm: 'HS256' });
    const wrongSecret = jwt.sign({ typ: 'session', jti: crypto.randomUUID() }, 'x'.repeat(48), { subject: U.id, expiresIn: 600 });
    const algNone = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${payload}.`;
    const noType = jwt.sign({ jti: crypto.randomUUID() }, TEST_JWT_SECRET, { subject: U.id, expiresIn: 600 });
    const guestClaims = jwt.decode(GT.token);
    const expiredGuest = jwt.sign({ ...guestClaims, exp: nowSec - 10 }, TEST_JWT_SECRET, { algorithm: 'HS256' });
    const loggedOut = (await c.call('post', '/auth/login', null, { email: U.email, password: U.password })).body.token;
    expect((await c.call('post', '/auth/logout', loggedOut)).status).toBe(204);

    const invalid = { none: null, tampered, forgedClaims, expiredSession, wrongSecret, algNone, noType, loggedOut, garbage: 'abc.def.ghi' };
    for (const [name, token] of Object.entries(invalid)) {
      for (const path of ['/boards', `/boards/${B}`]) {
        const res = await c.call('get', path, token);
        expect({ name, path, status: res.status, code: res.body.error?.code }).toEqual({ name, path, status: 401, code: 'UNAUTHENTICATED' });
      }
      expect({ name, result: await handshake(srv, token) }).toEqual({ name, result: 'UNAUTHENTICATED' });
    }

    // Expired guest token.
    expectError(await c.call('get', `/boards/${B}`, expiredGuest), 401, 'UNAUTHENTICATED');
    expect(await handshake(srv, expiredGuest)).toBe('UNAUTHENTICATED');
    // Guest token used for another board: rejected, no board data.
    expectError(await c.call('get', `/boards/${B4}`, GT.token), 404, 'BOARD_NOT_FOUND');
    const g = connectSocket(srv.url, GT.token, { reconnection: false });
    await waitEvent(g, 'connect');
    const join = await emitAck(g, 'board:join', { boardId: B4 });
    expect(join).toMatchObject({ ok: false, error: { code: 'BOARD_NOT_FOUND' } });
    expect(join.state).toBeUndefined();
    g.close();

    // Controls.
    expect((await c.call('get', `/boards/${B}`, U.token)).status).toBe(200);
    expect((await c.call('get', `/boards/${B}`, GT.token)).status).toBe(200);
    expect(await handshake(srv, U.token)).toBe('connected');
    expect(await handshake(srv, GT.token)).toBe('connected');

    const rejected = srv.parsedLogs().filter((l) => l.event === 'auth.token_rejected');
    expect(rejected.length).toBeGreaterThanOrEqual(Object.keys(invalid).length);
    for (const r of rejected) expect(r).toMatchObject({ security: true, outcome: 'rejected', reason: 'UNAUTHENTICATED' });
    const all = srv.logs.join('\n');
    for (const t of [U.token, GT.token, tampered, loggedOut, link.token, U.password, U.email]) expect(all.includes(t)).toBe(false);
  });

  test('an open socket whose session is revoked or expires cannot submit operations', async () => {
    const U = await c.register('User');
    const B = await c.createBoard(U.token, 'B');
    const O = await scriptedClient(srv.url, U.token, B); // observer with a valid session
    open.push(O);
    let applied = 0;
    O.socket.on('op:applied', () => {
      applied += 1;
    });

    // Logout while a socket is open: the next operation is rejected.
    const second = (await c.call('post', '/auth/login', null, { email: U.email, password: U.password })).body.token;
    const s = await scriptedClient(srv.url, second, B);
    open.push(s);
    expect((await c.call('post', '/auth/logout', second)).status).toBe(204);
    expect(await s.submitAck('object:add', rect())).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });

    // Expiry on an open socket (step 5): the operation is rejected, or the server has already
    // closed the socket (expiry timer, every 1 s). Either way nothing is stored or broadcast.
    const exp = Math.floor(Date.now() / 1000) + 2;
    const short = jwt.sign({ typ: 'session', jti: crypto.randomUUID(), sub: U.id, exp }, TEST_JWT_SECRET, { algorithm: 'HS256' });
    const e = await scriptedClient(srv.url, short, B, { socket: { reconnection: false } });
    open.push(e);
    await waitFor(() => Date.now() >= exp * 1000, { timeout: 5000, message: 'token expiry' });
    const outcome = await new Promise((resolve) => {
      if (!e.socket.connected) resolve('disconnected');
      e.socket.once('disconnect', () => resolve('disconnected'));
      e.socket.emit('op:submit', { boardId: B, clientOpId: 'late', type: 'object:add', payload: rect() }, resolve);
    });
    if (typeof outcome === 'object') expect(outcome).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
    else expect(outcome).toBe('disconnected');
    await waitFor(() => !e.socket.connected, { timeout: 3000, message: 'expired socket closed' });
    await new Promise((r) => setTimeout(r, 200));
    expect(applied).toBe(0);
    expect(await BoardObject.countDocuments({ boardId: B })).toBe(0);
  }, 20000);
});

// ---------------------------------------------------------------------------------------------
describe('TC-108 rate limiting (SEC-REQ-006) and failed-login log entries (SEC-REQ-008)', () => {
  let srv;
  let c;
  const open = [];
  beforeAll(async () => {
    srv = await startTestServer();
    c = client(srv);
  });
  afterAll(async () => {
    for (const x of open) x.close();
    await srv.stop();
  });

  test('6th failed login is rate-limited, identically for registered and unknown addresses', async () => {
    const U = await c.register('User');
    const unknownEmail = email();
    const attempt = (addr, password) => c.call('post', '/auth/login', null, { email: addr, password });
    const strip = (res) => ({ status: res.status, code: res.body.error?.code, message: res.body.error?.message });

    const forU = [];
    const forUnknown = [];
    for (let i = 0; i < 6; i += 1) forU.push(strip(await attempt(U.email, 'wrong-password')));
    const correctAfter = strip(await attempt(U.email, U.password));
    for (let i = 0; i < 6; i += 1) forUnknown.push(strip(await attempt(unknownEmail, 'wrong-password')));

    const failed = { status: 401, code: 'UNAUTHENTICATED', message: 'Invalid e-mail or password.' };
    const limited = { status: 429, code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' };
    expect(forU).toEqual([failed, failed, failed, failed, failed, limited]);
    expect(correctAfter).toEqual(limited);
    expect(forUnknown).toEqual(forU);
    // The limiter is keyed by the lower-cased address.
    expect(strip(await attempt(U.email.toUpperCase(), U.password))).toEqual(limited);
    // Another account is not affected.
    const W = await c.register('Other');
    expect((await attempt(W.email, W.password)).status).toBe(200);

    const loginFailed = srv.parsedLogs().filter((l) => l.event === 'auth.login_failed');
    expect(loginFailed).toHaveLength(10);
    for (const l of loginFailed) {
      expect(l).toMatchObject({ actorType: 'anonymous', actorId: null, boardId: null, outcome: 'rejected', reason: 'UNAUTHENTICATED' });
      expect(l.timestamp).toMatch(/Z$/);
      expect(l.requestId).toEqual(expect.any(String));
    }
    expect(loginFailed.slice(0, 5).map((l) => l.subjectId)).toEqual(Array(5).fill(U.id));
    expect(loginFailed.slice(5).map((l) => l.subjectId)).toEqual(Array(5).fill(null));
    expect(srv.parsedLogs().filter((l) => l.event === 'auth.rate_limited').length).toBeGreaterThanOrEqual(3);
    const all = srv.logs.join('\n').toLowerCase();
    for (const s of [U.email, unknownEmail, U.password, 'wrong-password']) expect(all.includes(s.toLowerCase())).toBe(false);
  });

  test('a flooding connection is limited to 30 operations per second; others are unaffected', async () => {
    const O = await c.register('Owner');
    const B = await c.createBoard(O.token);
    const f = await scriptedClient(srv.url, O.token, B);
    const n = await scriptedClient(srv.url, O.token, B);
    open.push(f, n);
    const normal = [];
    const ticker = setInterval(() => normal.push(n.submitAck('object:add', rect())), 500);
    const acks = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        emitAck(f.socket, 'op:submit', { boardId: B, clientOpId: `f${i}`, type: 'object:add', payload: rect() }, 10000),
      ),
    );
    await new Promise((r) => setTimeout(r, 1100));
    clearInterval(ticker);
    const accepted = acks.filter((a) => a.ok).length;
    const limited = acks.filter((a) => a.error?.code === 'RATE_LIMITED').length;
    expect(accepted).toBe(30);
    expect(limited).toBe(70);
    const normalAcks = await Promise.all(normal);
    expect(normalAcks.length).toBeGreaterThanOrEqual(2);
    for (const a of normalAcks) expect(a.ok).toBe(true);
    expect(await BoardObject.countDocuments({ boardId: B })).toBe(30 + normalAcks.length);
  });
});
