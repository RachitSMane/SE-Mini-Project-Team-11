// TC-104 (log part) — security event records and secret-free logs (SEC-REQ-008, D13b, SAD §4.4).
// One server at LOG_LEVEL=debug runs every listed event type; then every security entry is checked
// field by field and the whole log is searched for secrets and board content.
import crypto from 'node:crypto';
import { rect, scriptedClient, startTestServer, text, waitFor } from '../helpers/harness.js';
import { apiClient } from '../helpers/api.js';

let srv;
const open = [];
afterAll(async () => {
  for (const x of open) x.close();
  await srv?.stop();
});

const REQUIRED = ['timestamp', 'level', 'event', 'security', 'requestId', 'actorType', 'actorId', 'boardId', 'subjectId', 'outcome', 'reason'];
const ALLOWED = new Set([...REQUIRED, 'socketId', 'details']);

test('TC-104: every listed event type is logged with the required fields and no secret appears anywhere', async () => {
  srv = await startTestServer({ LOG_LEVEL: 'debug' });
  const c = apiClient(srv);
  const secrets = [];
  const O = await c.register('Owner');
  const E = await c.register('Editor');
  const V = await c.register('Viewer');
  secrets.push(O.password, E.password, V.password, O.token, E.token, V.token, O.email, E.email, V.email);
  const boardId = await c.createBoard(O.token, 'Audit');
  const l1 = await c.addMember(O.token, boardId, E.token, 'editor');
  const l2 = await c.addMember(O.token, boardId, V.token, 'viewer');
  const gl = await c.link(O.token, boardId, 'viewer');
  const G = await c.guest(gl.token, 'Guest');
  secrets.push(l1.token, l2.token, gl.token, G.token);

  // Board content with a known text string.
  const boardText = `Confidential-${crypto.randomBytes(6).toString('hex')}`;
  const o = await scriptedClient(srv.url, O.token, boardId);
  open.push(o);
  expect((await o.submitAck('object:add', text(boardText))).ok).toBe(true);
  expect((await o.submitAck('object:add', rect())).ok).toBe(true);
  secrets.push(boardText);
  await srv.services.versions.triggerAutomatic(boardId, 'periodic');

  // auth.login_failed: unregistered e-mail and registered e-mail with wrong password; then rate limit.
  const unknownEmail = `nobody_${crypto.randomBytes(4).toString('hex')}@example.test`;
  const wrongPassword = `Wrong-${crypto.randomBytes(6).toString('hex')}`;
  secrets.push(unknownEmail, wrongPassword);
  expect((await c.call('post', '/auth/login', null, { email: unknownEmail, password: wrongPassword })).status).toBe(401);
  expect((await c.call('post', '/auth/login', null, { email: V.email, password: wrongPassword })).status).toBe(401);
  for (let i = 0; i < 5; i += 1) await c.call('post', '/auth/login', null, { email: unknownEmail, password: wrongPassword });
  // auth.token_rejected (REST and socket handshake) with a tampered token.
  const tampered = `${O.token.slice(0, -2)}xx`;
  secrets.push(tampered);
  expect((await c.call('get', '/boards', tampered)).status).toBe(401);
  // authz.denied over REST and Socket.IO.
  expect((await c.call('post', `/boards/${boardId}/links`, E.token, { role: 'viewer' })).status).toBe(403);
  const v = await scriptedClient(srv.url, V.token, boardId);
  open.push(v);
  expect((await v.submitAck('object:add', rect())).ok).toBe(false);
  // link.created (above) and link.revoked; guest disconnected.
  expect((await c.call('delete', `/boards/${boardId}/links/${gl.linkId}`, O.token)).status).toBe(204);
  // member.role_changed, member.removed, version.restored, board.ownership_transferred, board.deleted.
  expect((await c.call('patch', `/boards/${boardId}/members/${V.id}`, O.token, { role: 'editor' })).status).toBe(200);
  expect((await c.call('post', `/boards/${boardId}/versions/1/restore`, O.token, undefined, { 'Idempotency-Key': crypto.randomUUID() })).status).toBe(201);
  expect((await c.call('delete', `/boards/${boardId}/members/${V.id}`, O.token)).status).toBe(204);
  expect((await c.call('post', `/boards/${boardId}/transfer-ownership`, O.token, { newOwnerId: E.id, confirm: true })).status).toBe(200);
  expect((await c.call('delete', `/boards/${boardId}`, E.token)).status).toBe(204);
  await waitFor(() => srv.parsedLogs().some((l) => l.event === 'board.deleted'));

  const logs = srv.parsedLogs();
  const security = logs.filter((l) => l.security);
  const byEvent = (e) => security.filter((l) => l.event === e);
  for (const e of ['auth.login_failed', 'auth.rate_limited', 'auth.token_rejected', 'authz.denied', 'link.created', 'link.revoked', 'member.role_changed', 'member.removed', 'board.ownership_transferred', 'version.restored', 'board.deleted']) {
    expect({ e, n: byEvent(e).length > 0 }).toEqual({ e, n: true });
  }
  // Field rules for every security entry.
  for (const l of security) {
    for (const k of REQUIRED) expect({ event: l.event, k, present: k in l }).toEqual({ event: l.event, k, present: true });
    for (const k of Object.keys(l)) expect({ event: l.event, k, allowed: ALLOWED.has(k) }).toEqual({ event: l.event, k, allowed: true });
    expect(l.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(typeof l.requestId === 'string' && l.requestId.length > 0).toBe(true);
    expect(['success', 'rejected']).toContain(l.outcome);
    if (l.outcome === 'success') expect(l.reason).toBeNull();
    else expect(l.reason).toMatch(/^[A-Z_]+$/);
    expect(['user', 'guest', 'anonymous']).toContain(l.actorType);
    if (l.actorType === 'anonymous') expect(l.actorId).toBeNull();
  }
  // Failed logins: anonymous, no board, reason UNAUTHENTICATED; subjectId only for the registered e-mail.
  const failed = byEvent('auth.login_failed');
  expect(failed.map((l) => l.subjectId)).toEqual([null, V.id, null, null, null, null].slice(0, failed.length));
  for (const l of failed) expect(l).toMatchObject({ actorType: 'anonymous', actorId: null, boardId: null, reason: 'UNAUTHENTICATED' });
  // Subjects and actors of the account events.
  expect(byEvent('member.role_changed')[0]).toMatchObject({ actorId: O.id, subjectId: V.id, boardId });
  expect(byEvent('member.removed')[0]).toMatchObject({ actorId: O.id, subjectId: V.id, boardId });
  expect(byEvent('board.ownership_transferred')[0]).toMatchObject({ actorId: O.id, subjectId: E.id, boardId });
  expect(byEvent('board.deleted')[0]).toMatchObject({ actorId: E.id, boardId });
  expect(byEvent('authz.denied').some((l) => l.actorId === V.id && l.socketId)).toBe(true);

  // Secret and content search over every line (security and non-security, debug level).
  const all = srv.logs.join('\n');
  const lower = all.toLowerCase();
  for (const s of secrets) expect({ found: lower.includes(s.toLowerCase()), s: s.slice(0, 12) }).toEqual({ found: false, s: s.slice(0, 12) });
  expect(all).not.toMatch(/Bearer\s/);
  expect(all).not.toMatch(/"(password|passwordHash|token|authorization|email)"\s*:/i);
});
