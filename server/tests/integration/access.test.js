// COMP-05 Board & Access Service through API-02 and API-01: boards, share links, members,
// ownership transfer and the FR-051 / SAD §3.9.3 authorisation rules (403 vs 404).
// STP: TC-016, TC-017, TC-018, TC-023, TC-101, TC-102, TC-103, TC-104 (link tokens).
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  connectSocket,
  emitAck,
  rect,
  scriptedClient,
  startTestServer,
  waitEvent,
  waitFor,
} from '../helpers/harness.js';
import { apiClient as client, expectError, expectNoSecrets, onceKind, securityEvents } from '../helpers/api.js';
import { hashLinkToken } from '../../src/access/accessService.js';
import { Board, BoardObject, Membership, ShareLink, Version } from '../../src/db/models.js';

/** Server-side state of a board, used to prove that rejected calls changed nothing. */
async function boardState(boardId) {
  const board = await Board.findById(boardId).lean();
  const id = new mongoose.Types.ObjectId(String(boardId));
  return {
    board: board && { ownerId: String(board.ownerId), title: board.title, seq: board.seq },
    members: (await Membership.find({ boardId: id }).lean()).map((m) => `${m.userId}:${m.role}`).sort(),
    links: (await ShareLink.find({ boardId: id }).lean()).map((l) => `${l._id}:${l.revokedAt ? 'revoked' : 'active'}`).sort(),
    versions: (await Version.find({ boardId: id }, { number: 1 }).lean()).map((v) => v.number).sort(),
    objects: (await BoardObject.find({ boardId: id }, { objectId: 1 }).lean()).map((o) => o.objectId).sort(),
  };
}

/** Board with one object and one version, so that restore and version endpoints have targets. */
async function boardWithVersion(srv, owner, title = 'Board') {
  const c = client(srv);
  const boardId = await c.createBoard(owner.token, title);
  const o = await scriptedClient(srv.url, owner.token, boardId);
  expect((await o.submitAck('object:add', rect())).ok).toBe(true);
  const v = await srv.services.versions.triggerAutomatic(boardId, 'periodic');
  expect(v).toMatchObject({ created: true, number: 1 });
  return { boardId, ownerClient: o };
}

const ROLE_LESS_ID = '0123456789abcdef01234567';

// ---------------------------------------------------------------------------------------------
describe('TC-016 boards: create, list, delete (FR-042 to FR-044)', () => {
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

  test('title boundaries, Owner role and dashboards', async () => {
    const O = await c.register('Owner');
    const M = await c.register('Member');
    const b1 = await c.createBoard(O.token, 'B1');
    await c.addMember(O.token, b1, M.token, 'editor');

    const b2 = await c.call('post', '/boards', O.token, { title: 'x'.repeat(100) });
    expect(b2.status).toBe(201);
    expect(b2.body).toMatchObject({ title: 'x'.repeat(100), role: 'owner' });
    const b3 = await c.call('post', '/boards', O.token, { title: 'a' });
    expect(b3.status).toBe(201);
    for (const body of [{ title: '' }, { title: 'x'.repeat(101) }, { title: '   ' }, {}, { title: 'ok', ownerId: M.id }, { title: 7 }]) {
      expectError(await c.call('post', '/boards', O.token, body), 400, 'VALIDATION_FAILED');
    }
    expectError(await c.call('post', '/boards', null, { title: 'x' }), 401, 'UNAUTHENTICATED');

    const oList = await c.call('get', '/boards', O.token);
    expect(oList.status).toBe(200);
    expect(oList.body.map((b) => [b.id, b.role]).sort()).toEqual(
      [[b1, 'owner'], [b2.body.id, 'owner'], [b3.body.id, 'owner']].sort(),
    );
    for (const b of oList.body) expect(Object.keys(b).sort()).toEqual(['id', 'role', 'title', 'updatedAt']);
    const mList = await c.call('get', '/boards', M.token);
    expect(mList.body.map((b) => [b.id, b.role])).toEqual([[b1, 'editor']]);

    const got = await c.call('get', `/boards/${b1}`, M.token);
    expect(got.status).toBe(200);
    expect(got.body).toMatchObject({ id: b1, title: 'B1', ownerId: O.id, role: 'editor' });
  });

  test('Owner deletes a board: cascade, participants notified and disconnected, links dead', async () => {
    const O = await c.register('Owner');
    const M = await c.register('Member');
    const boardId = await c.createBoard(O.token, 'Doomed');
    const link = await c.addMember(O.token, boardId, M.token, 'editor');
    const m = await scriptedClient(srv.url, M.token, boardId);
    open.push(m);
    expect((await m.submitAck('object:add', rect())).ok).toBe(true);
    await srv.services.versions.triggerAutomatic(boardId, 'periodic');
    const before = await boardState(boardId);
    expect(before.objects).toHaveLength(1);
    expect(before.versions).toEqual([1]);

    // Non-Owner delete is rejected first (FR-044).
    expectError(await c.call('delete', `/boards/${boardId}`, M.token), 403, 'FORBIDDEN');
    expect(await boardState(boardId)).toEqual(before);

    const revoked = onceKind(m, 'revoked');
    const res = await c.call('delete', `/boards/${boardId}`, O.token);
    expect(res.status).toBe(204);
    expect(await revoked).toMatchObject({ boardId, reason: 'BOARD_DELETED' });
    await waitFor(() => !m.socket.connected, { message: 'member disconnected' });

    expect(await boardState(boardId)).toEqual({ board: null, members: [], links: [], versions: [], objects: [] });
    expect((await c.call('get', '/boards', O.token)).body.map((b) => b.id)).not.toContain(boardId);
    expect((await c.call('get', '/boards', M.token)).body.map((b) => b.id)).not.toContain(boardId);
    expectError(await c.call('post', '/links/resolve', null, { token: link.token, displayName: 'Late' }), 404, 'LINK_NOT_FOUND');
    expectError(await c.call('get', `/boards/${boardId}`, O.token), 404, 'BOARD_NOT_FOUND');
    expectError(await c.call('delete', `/boards/${boardId}`, O.token), 404, 'BOARD_NOT_FOUND');

    const deleted = securityEvents(srv, 'board.deleted');
    expect(deleted.at(-1)).toMatchObject({ actorType: 'user', actorId: O.id, boardId, outcome: 'success', reason: null });
  });

  test('unknown and malformed board IDs are 404 without board data', async () => {
    const O = await c.register('Owner');
    for (const id of [ROLE_LESS_ID, 'not-an-id', '$where']) {
      expectError(await c.call('get', `/boards/${id}`, O.token), 404, 'BOARD_NOT_FOUND');
      expectError(await c.call('get', `/boards/${id}/members`, O.token), 404, 'BOARD_NOT_FOUND');
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('TC-017 share links, joining and presence (FR-045, FR-046, FR-052)', () => {
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

  test('Owner creates links; full URL shown once; list and database hold no tokens', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token);
    const t0 = Date.now();
    const ed = await c.call('post', `/boards/${boardId}/links`, O.token, { role: 'editor', expiresIn: '24h' });
    expect(ed.status).toBe(201);
    expect(Object.keys(ed.body).sort()).toEqual(['expiresAt', 'linkId', 'role', 'url']);
    expect(ed.body.url).toMatch(/^http:\/\/localhost:5173\/join#[A-Za-z0-9_-]{43}$/);
    expect(Math.abs(Date.parse(ed.body.expiresAt) - (t0 + 86_400_000))).toBeLessThan(10_000);
    const vw = await c.call('post', `/boards/${boardId}/links`, O.token, { role: 'viewer' });
    expect(vw.status).toBe(201);
    expect(Math.abs(Date.parse(vw.body.expiresAt) - (t0 + 7 * 86_400_000))).toBeLessThan(10_000); // default 7 d
    const h1 = await c.call('post', `/boards/${boardId}/links`, O.token, { role: 'viewer', expiresIn: '1h' });
    expect(Math.abs(Date.parse(h1.body.expiresAt) - (t0 + 3_600_000))).toBeLessThan(10_000);

    for (const body of [{ role: 'owner' }, { role: 'editor', expiresIn: '2h' }, {}, { role: 'viewer', boardId }]) {
      expectError(await c.call('post', `/boards/${boardId}/links`, O.token, body), 400, 'VALIDATION_FAILED');
    }

    const list = await c.call('get', `/boards/${boardId}/links`, O.token);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(3);
    for (const l of list.body) expect(Object.keys(l).sort()).toEqual(['createdAt', 'expiresAt', 'linkId', 'role']);
    const tokens = [ed, vw, h1].map((r) => r.body.url.split('#')[1]);
    for (const t of tokens) expect(JSON.stringify(list.body)).not.toContain(t);

    const stored = await ShareLink.find({ boardId }).lean();
    expect(stored.map((l) => l.tokenHash).sort()).toEqual(tokens.map(hashLinkToken).sort());
    for (const t of tokens) expect(JSON.stringify(stored)).not.toContain(t);
    expect(securityEvents(srv, 'link.created').filter((e) => e.boardId === boardId)).toHaveLength(3);
  });

  test('registered user becomes a member; an equal or higher role is kept', async () => {
    const O = await c.register('Owner');
    const R = await c.register('Registered');
    const boardId = await c.createBoard(O.token);
    const ed = await c.link(O.token, boardId, 'editor');
    const vw = await c.link(O.token, boardId, 'viewer');

    const r1 = await c.call('post', '/links/resolve', R.token, { token: ed.token });
    expect(r1.status).toBe(200);
    expect(r1.body).toEqual({ boardId, role: 'editor' });
    const r2 = await c.call('post', '/links/resolve', R.token, { token: vw.token });
    expect(r2.body).toEqual({ boardId, role: 'editor' }); // not downgraded
    const owner = await c.call('post', '/links/resolve', O.token, { token: vw.token });
    expect(owner.body).toEqual({ boardId, role: 'owner' });

    const members = await c.call('get', `/boards/${boardId}/members`, R.token);
    expect(members.body).toEqual([
      { userId: O.id, displayName: 'Owner', role: 'owner' },
      { userId: R.id, displayName: 'Registered', role: 'editor' },
    ]);
    expect((await c.call('get', '/boards', R.token)).body.map((b) => [b.id, b.role])).toEqual([[boardId, 'editor']]);

    // A Viewer member opening an Editor link is upgraded (lower role, FR-046).
    const V = await c.register('Viewer');
    await c.call('post', '/links/resolve', V.token, { token: vw.token });
    const up = await c.call('post', '/links/resolve', V.token, { token: ed.token });
    expect(up.body).toEqual({ boardId, role: 'editor' });
  });

  test('guest join: name validation, board-bound token, presence with (guest) flag', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token);
    const vw = await c.link(O.token, boardId, 'viewer');
    for (const displayName of [undefined, '', '   ', 'x'.repeat(31)]) {
      const body = displayName === undefined ? { token: vw.token } : { token: vw.token, displayName };
      expectError(await c.call('post', '/links/resolve', null, body), 400, 'VALIDATION_FAILED');
    }
    expectError(await c.call('post', '/links/resolve', null, { token: 'x'.repeat(43), displayName: 'A' }), 404, 'LINK_NOT_FOUND');

    const o = await scriptedClient(srv.url, O.token, boardId);
    open.push(o);
    const res = await c.call('post', '/links/resolve', null, { token: vw.token, displayName: 'Asha' });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['boardId', 'expiresAt', 'guestToken', 'role']);
    expect(res.body).toMatchObject({ boardId, role: 'viewer' });
    const guestToken = res.body.guestToken;

    const g = await scriptedClient(srv.url, guestToken, boardId);
    open.push(g);
    expect(g.sync.role).toBe('viewer');
    expect(g.sync.participants).toEqual(
      expect.arrayContaining([expect.objectContaining({ displayName: 'Asha', role: 'viewer', guest: true })]),
    );
    await waitFor(() => o.sync.participants.some((p) => p.displayName === 'Asha' && p.guest), { message: 'presence' });

    // The guest has the link's permissions only, on this board only.
    expectError(await c.call('get', '/boards', guestToken), 403, 'FORBIDDEN');
    expect((await c.call('get', `/boards/${boardId}`, guestToken)).body).toMatchObject({ id: boardId, role: 'viewer' });
    expect((await c.call('get', `/boards/${boardId}/members`, guestToken)).status).toBe(200);
    const denied = await g.submitAck('object:add', rect());
    expect(denied).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });

    g.close();
    await waitFor(() => !o.sync.participants.some((p) => p.guest), { message: 'guest left' });
  });
});

// ---------------------------------------------------------------------------------------------
describe('TC-018 ownership transfer (FR-050, API-02)', () => {
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

  test('rejected transfers change nothing; a valid transfer swaps roles everywhere', async () => {
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const V = await c.register('Viewer');
    const X = await c.register('Outsider');
    const { boardId, ownerClient: o } = await boardWithVersion(srv, O);
    open.push(o);
    await c.addMember(O.token, boardId, E.token, 'editor');
    await c.addMember(O.token, boardId, V.token, 'viewer');
    const gl = await c.link(O.token, boardId, 'editor');
    const G = await c.guest(gl.token, 'Gus');
    const e = await scriptedClient(srv.url, E.token, boardId);
    open.push(e);
    const path = `/boards/${boardId}/transfer-ownership`;
    const before = await boardState(boardId);

    expectError(await c.call('post', path, E.token, { newOwnerId: V.id, confirm: true }), 403, 'FORBIDDEN'); // 1
    expectError(await c.call('post', path, G.token, { newOwnerId: E.id, confirm: true }), 403, 'FORBIDDEN'); // 2
    for (const body of [{ newOwnerId: E.id }, { newOwnerId: E.id, confirm: false }, { newOwnerId: E.id, confirm: 'true' }, { newOwnerId: E.id, confirm: true, role: 'owner' }]) {
      expectError(await c.call('post', path, O.token, body), 400, 'VALIDATION_FAILED'); // 3
    }
    for (const newOwnerId of [O.id, X.id, G.guestId, ROLE_LESS_ID]) {
      expectError(await c.call('post', path, O.token, { newOwnerId, confirm: true }), 400, 'INVALID_TARGET'); // 4
    }
    expectError(await c.call('post', `/boards/${ROLE_LESS_ID}/transfer-ownership`, O.token, { newOwnerId: E.id, confirm: true }), 404, 'BOARD_NOT_FOUND'); // 5
    expectError(await c.call('post', path, X.token, { newOwnerId: E.id, confirm: true }), 404, 'BOARD_NOT_FOUND');
    expectError(await c.call('post', path, null, { newOwnerId: E.id, confirm: true }), 401, 'UNAUTHENTICATED');
    expect(await boardState(boardId)).toEqual(before);

    // 6. Valid transfer.
    const res = await c.call('post', path, O.token, { newOwnerId: E.id, confirm: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ boardId, ownerId: E.id, previousOwner: { userId: O.id, role: 'editor' } });

    // 7. Open views update without reload; dashboards and member list show the new roles.
    await waitFor(() => e.sync.role === 'owner' && o.sync.role === 'editor', { message: 'role:changed' });
    expect((await c.call('get', '/boards', E.token)).body.find((b) => b.id === boardId).role).toBe('owner');
    expect((await c.call('get', '/boards', O.token)).body.find((b) => b.id === boardId).role).toBe('editor');
    const members = (await c.call('get', `/boards/${boardId}/members`, V.token)).body;
    expect(members[0]).toEqual({ userId: E.id, displayName: 'Editor', role: 'owner' });
    expect(members.slice(1)).toHaveLength(2);
    expect(members.slice(1)).toEqual(
      expect.arrayContaining([
        { userId: O.id, displayName: 'Owner', role: 'editor' },
        { userId: V.id, displayName: 'Viewer', role: 'viewer' },
      ]),
    );
    expect(await Membership.exists({ boardId, userId: E.id })).toBeNull();

    // 8. The former Owner has Editor rights only, on REST and on the socket opened as Owner.
    const after = await boardState(boardId);
    expectError(await c.call('post', `/boards/${boardId}/links`, O.token, { role: 'viewer' }), 403, 'FORBIDDEN');
    expectError(await c.call('post', `/boards/${boardId}/versions/1/restore`, O.token, undefined, { 'Idempotency-Key': crypto.randomUUID() }), 403, 'FORBIDDEN');
    expectError(await c.call('patch', `/boards/${boardId}/members/${V.id}`, O.token, { role: 'editor' }), 403, 'FORBIDDEN');
    expectError(await c.call('post', path, O.token, { newOwnerId: E.id, confirm: true }), 403, 'FORBIDDEN');
    expect(await o.submitAck('board:clear', {})).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(await boardState(boardId)).toEqual(after);
    expect((await o.submitAck('object:add', rect())).ok).toBe(true); // still an Editor

    // 9–10. The new Owner has every Owner permission.
    expect((await c.call('post', `/boards/${boardId}/links`, E.token, { role: 'viewer' })).status).toBe(201);
    expect((await c.call('post', `/boards/${boardId}/versions/1/restore`, E.token, undefined, { 'Idempotency-Key': crypto.randomUUID() })).status).toBe(201);
    expect((await c.call('patch', `/boards/${boardId}/members/${V.id}`, E.token, { role: 'editor' })).body).toEqual({ userId: V.id, role: 'editor' });
    expect((await c.call('delete', `/boards/${boardId}`, E.token)).status).toBe(204);

    const ev = securityEvents(srv, 'board.ownership_transferred');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ actorId: O.id, subjectId: E.id, boardId, outcome: 'success', reason: null });
    expectNoSecrets(srv, [O.token, E.token, G.token, gl.token, O.password, O.email, E.email]);
  });

  test('two concurrent transfers: exactly one succeeds, the other gets 403', async () => {
    const O = await c.register('Owner');
    const A = await c.register('A');
    const B = await c.register('B');
    const boardId = await c.createBoard(O.token);
    await c.addMember(O.token, boardId, A.token, 'editor');
    await c.addMember(O.token, boardId, B.token, 'viewer');
    const path = `/boards/${boardId}/transfer-ownership`;
    const [ra, rb] = await Promise.all([
      c.call('post', path, O.token, { newOwnerId: A.id, confirm: true }),
      c.call('post', path, O.token, { newOwnerId: B.id, confirm: true }),
    ]);
    expect([ra.status, rb.status].sort()).toEqual([200, 403]);
    const winner = ra.status === 200 ? A : B;
    const loser = winner === A ? B : A;
    const state = await boardState(boardId);
    expect(state.board.ownerId).toBe(winner.id);
    expect(state.members).toEqual([`${O.id}:editor`, `${loser.id}:${loser === A ? 'editor' : 'viewer'}`].sort());
  });
});

// ---------------------------------------------------------------------------------------------
describe('TC-023 member role change and removal (FR-049)', () => {
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

  test('role change applies to the open view and next operation; removal disconnects', async () => {
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const M = await c.register('Removed');
    const boardId = await c.createBoard(O.token);
    await c.addMember(O.token, boardId, E.token, 'editor');
    await c.addMember(O.token, boardId, M.token, 'editor');
    const e = await scriptedClient(srv.url, E.token, boardId);
    const m = await scriptedClient(srv.url, M.token, boardId);
    open.push(e, m);

    // 1. Editor -> Viewer.
    const down = await c.call('patch', `/boards/${boardId}/members/${E.id}`, O.token, { role: 'viewer' });
    expect(down.status).toBe(200);
    expect(down.body).toEqual({ userId: E.id, role: 'viewer' });
    await waitFor(() => e.sync.role === 'viewer', { message: 'role:changed viewer' });
    expect(await e.submitAck('object:add', rect())).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });

    // 2. Back to Editor.
    await c.call('patch', `/boards/${boardId}/members/${E.id}`, O.token, { role: 'editor' });
    await waitFor(() => e.sync.role === 'editor', { message: 'role:changed editor' });
    expect((await e.submitAck('object:add', rect())).ok).toBe(true);

    // 3–4. Remove M.
    const revoked = onceKind(m, 'revoked');
    expect((await c.call('delete', `/boards/${boardId}/members/${M.id}`, O.token)).status).toBe(204);
    expect(await revoked).toMatchObject({ boardId, reason: 'MEMBER_REMOVED' });
    await waitFor(() => !m.socket.connected, { message: 'removed member disconnected' });
    expect((await c.call('get', '/boards', M.token)).body).toEqual([]);
    expectError(await c.call('get', `/boards/${boardId}`, M.token), 404, 'BOARD_NOT_FOUND');

    // 5. An Editor cannot manage members.
    expectError(await c.call('patch', `/boards/${boardId}/members/${O.id}`, E.token, { role: 'viewer' }), 403, 'FORBIDDEN');
    expectError(await c.call('patch', `/boards/${boardId}/members/${E.id}`, E.token, { role: 'editor' }), 403, 'FORBIDDEN');
    expectError(await c.call('delete', `/boards/${boardId}/members/${E.id}`, E.token), 403, 'FORBIDDEN');

    const changes = securityEvents(srv, 'member.role_changed').filter((x) => x.boardId === boardId);
    expect(changes[0]).toMatchObject({ actorId: O.id, subjectId: E.id, details: { fromRole: 'editor', toRole: 'viewer' } });
    expect(securityEvents(srv, 'member.removed').at(-1)).toMatchObject({ actorId: O.id, subjectId: M.id, boardId });
  });

  test('invalid targets and bodies', async () => {
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const X = await c.register('Outsider');
    const boardId = await c.createBoard(O.token);
    await c.addMember(O.token, boardId, E.token, 'editor');
    const base = `/boards/${boardId}/members`;
    for (const role of ['owner', 'admin', undefined]) {
      expectError(await c.call('patch', `${base}/${E.id}`, O.token, role ? { role } : {}), 400, 'VALIDATION_FAILED');
    }
    expectError(await c.call('patch', `${base}/${O.id}`, O.token, { role: 'viewer' }), 404, 'MEMBER_NOT_FOUND');
    expectError(await c.call('patch', `${base}/${X.id}`, O.token, { role: 'viewer' }), 404, 'MEMBER_NOT_FOUND');
    expectError(await c.call('patch', `${base}/garbage`, O.token, { role: 'viewer' }), 404, 'MEMBER_NOT_FOUND');
    expectError(await c.call('delete', `${base}/${X.id}`, O.token), 404, 'MEMBER_NOT_FOUND');
    expectError(await c.call('delete', `${base}/${O.id}`, O.token), 404, 'MEMBER_NOT_FOUND');
  });

  test('a leftover membership row of the Owner (interrupted transfer) is never changed or removed', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token);
    // State after a crash between steps 3 and 4 of the transfer (API-02).
    await Membership.create({ boardId, userId: O.id, role: 'viewer' });
    const o = await scriptedClient(srv.url, O.token, boardId);
    open.push(o);
    expect(o.sync.role).toBe('owner');
    expectError(await c.call('delete', `/boards/${boardId}/members/${O.id}`, O.token), 404, 'MEMBER_NOT_FOUND');
    expectError(await c.call('patch', `/boards/${boardId}/members/${O.id}`, O.token, { role: 'editor' }), 404, 'MEMBER_NOT_FOUND');
    expect(o.socket.connected).toBe(true);
    expect((await c.call('get', '/boards', O.token)).body).toEqual([expect.objectContaining({ id: boardId, role: 'owner' })]);
    expect((await c.call('get', `/boards/${boardId}/members`, O.token)).body).toEqual([{ userId: O.id, displayName: 'Owner', role: 'owner' }]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('TC-102 REST authorisation matrix: 403 for a too-low role, 404 for no role', () => {
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

  test('every Owner-only and Viewer endpoint for every role', async () => {
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const V = await c.register('Viewer');
    const X = await c.register('NoRole');
    const { boardId: B, ownerClient } = await boardWithVersion(srv, O, 'B');
    open.push(ownerClient);
    const B3 = await c.createBoard(O.token, 'B3');
    await c.addMember(O.token, B, E.token, 'editor');
    await c.addMember(O.token, B, V.token, 'viewer');
    const G = await c.guest((await c.link(O.token, B, 'editor')).token, 'Guest');
    const spare = await c.link(O.token, B, 'viewer');

    const restoreHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() });
    const ownerOnly = (b) => [
      ['delete', `/boards/${b}`],
      ['post', `/boards/${b}/links`, { role: 'viewer' }],
      ['get', `/boards/${b}/links`],
      ['delete', `/boards/${b}/links/${spare.linkId}`],
      ['patch', `/boards/${b}/members/${V.id}`, { role: 'editor' }],
      ['delete', `/boards/${b}/members/${V.id}`],
      ['post', `/boards/${b}/transfer-ownership`, { newOwnerId: V.id, confirm: true }],
      ['post', `/boards/${b}/versions/1/restore`, undefined, true],
    ];
    const viewerEndpoints = (b) => [
      ['get', `/boards/${b}`],
      ['get', `/boards/${b}/members`],
      ['get', `/boards/${b}/versions`],
      ['get', `/boards/${b}/versions/1`],
    ];
    const run = (token, [method, path, body, restore]) => c.call(method, path, token, body, restore ? restoreHeaders() : {});

    const before = await boardState(B);
    const before3 = await boardState(B3);
    const deniedBefore = securityEvents(srv, 'authz.denied').length;
    let attempts = 0;

    // Step 1: Editor, Viewer and guest on Owner-only endpoints -> 403.
    for (const who of [E, V, G]) {
      for (const ep of ownerOnly(B)) {
        expectError(await run(who.token, ep), 403, 'FORBIDDEN');
        attempts += 1;
      }
    }
    // Step 2: a registered user with no role -> 404 everywhere.
    for (const ep of [...ownerOnly(B), ...viewerEndpoints(B)]) {
      expectError(await run(X.token, ep), 404, 'BOARD_NOT_FOUND');
      attempts += 1;
    }
    // Step 3: a guest token for another board -> 404.
    for (const ep of viewerEndpoints(B3)) {
      expectError(await run(G.token, ep), 404, 'BOARD_NOT_FOUND');
      attempts += 1;
    }
    // Step 5: nothing changed, no version created; every rejection logged.
    expect(await boardState(B)).toEqual(before);
    expect(await boardState(B3)).toEqual(before3);
    const denied = securityEvents(srv, 'authz.denied').slice(deniedBefore);
    expect(denied).toHaveLength(attempts);
    for (const d of denied) {
      expect(d.outcome).toBe('rejected');
      expect(['FORBIDDEN', 'BOARD_NOT_FOUND']).toContain(d.reason);
      expect(d.requestId).toEqual(expect.any(String));
    }

    // Step 4: controls.
    for (const who of [O, E, V, G]) {
      for (const ep of viewerEndpoints(B)) expect((await run(who.token, ep)).status).toBe(200);
    }
    const ok = async (ep, status) => expect((await run(O.token, ep)).status).toBe(status);
    const [del, createLink, listLinks, revoke, patch, remove, transfer, restore] = ownerOnly(B);
    await ok(listLinks, 200);
    await ok(createLink, 201);
    await ok(revoke, 204);
    await ok(patch, 200);
    await ok(restore, 201);
    await ok(remove, 204);
    await c.addMember(O.token, B, V.token, 'viewer');
    await ok(transfer, 200);
    expect((await run(V.token, del)).status).toBe(204); // the new Owner deletes
    expectNoSecrets(srv, [O.token, E.token, V.token, X.token, G.token, spare.token, O.password]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('TC-101 crafted real-time messages from unauthorised roles (SEC-REQ-003)', () => {
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

  test('Viewer and guest operations, role claims and foreign boards are rejected and not broadcast', async () => {
    const O = await c.register('Owner');
    const V = await c.register('Viewer');
    const C = await c.register('Observer');
    const Other = await c.register('Other');
    const B = await c.createBoard(O.token, 'B');
    const B2 = await c.createBoard(Other.token, 'B2');
    await c.addMember(O.token, B, V.token, 'viewer');
    await c.addMember(O.token, B, C.token, 'editor');
    const G = await c.guest((await c.link(O.token, B, 'viewer')).token, 'Guest');

    const obs = await scriptedClient(srv.url, C.token, B);
    const v = await scriptedClient(srv.url, V.token, B);
    const g = await scriptedClient(srv.url, G.token, B);
    open.push(obs, v, g);
    const target = rect();
    expect((await obs.submitAck('object:add', target)).ok).toBe(true);
    let applied = 0;
    obs.socket.on('op:applied', () => {
      applied += 1;
    });
    const b2Seq = (await Board.findById(B2).lean()).seq;
    const before = await boardState(B);
    const deniedBefore = securityEvents(srv, 'authz.denied').length;

    const op = (boardId, type, payload) => ({ boardId, clientOpId: crypto.randomUUID().slice(0, 32), type, payload });
    const attemptsOnB = [
      op(B, 'object:add', rect()),
      op(B, 'object:update', { id: target.id, x: 99 }),
      op(B, 'object:delete', { id: target.id }),
      op(B, 'board:clear', {}),
      op(B, 'object:add', { ...rect(), role: 'owner' }),
      op(B, 'object:update', { id: target.id, x: 5, role: 'owner' }),
    ];
    let count = 0;
    for (const sc of [v, g]) {
      for (const msg of attemptsOnB) {
        const ack = await emitAck(sc.socket, 'op:submit', msg);
        expect(ack).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
        count += 1;
      }
      const foreign = await emitAck(sc.socket, 'op:submit', op(B2, 'object:add', rect()));
      expect(foreign).toMatchObject({ ok: false, error: { code: 'BOARD_NOT_FOUND' } });
      const join = await emitAck(sc.socket, 'board:join', { boardId: B2 });
      expect(join).toMatchObject({ ok: false, error: { code: 'BOARD_NOT_FOUND' } });
      expect(join.state).toBeUndefined();
      count += 2;
    }
    expect(count).toBeGreaterThanOrEqual(12);
    await new Promise((r) => setTimeout(r, 300));
    expect(applied).toBe(0);
    expect(await boardState(B)).toEqual(before);
    expect((await Board.findById(B2).lean()).seq).toBe(b2Seq);
    expect(await BoardObject.countDocuments({ boardId: B2 })).toBe(0);
    expect(securityEvents(srv, 'authz.denied').slice(deniedBefore)).toHaveLength(count);
  });
});

// ---------------------------------------------------------------------------------------------
describe('TC-103 share-link revocation (FR-047, SEC-REQ-004)', () => {
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

  test('revoked link: guest disconnected within 5 s, link rejected, members keep access', async () => {
    const O = await c.register('Owner');
    const R = await c.register('Registered');
    const boardId = await c.createBoard(O.token);
    const L1 = await c.link(O.token, boardId, 'editor');
    const G1 = await c.guest(L1.token, 'G1');
    await c.call('post', '/links/resolve', R.token, { token: L1.token });
    const g1 = await scriptedClient(srv.url, G1.token, boardId);
    open.push(g1);

    const revoked = onceKind(g1, 'revoked');
    const t0 = Date.now();
    expect((await c.call('delete', `/boards/${boardId}/links/${L1.linkId}`, O.token)).status).toBe(204);
    expect(await revoked).toMatchObject({ boardId, reason: 'LINK_REVOKED' });
    await waitFor(() => !g1.socket.connected, { message: 'guest disconnected' });
    expect(Date.now() - t0).toBeLessThan(5000);

    expectError(await c.call('post', '/links/resolve', null, { token: L1.token, displayName: 'New' }), 410, 'LINK_REVOKED');
    expectError(await c.call('post', '/links/resolve', R.token, { token: L1.token }), 410, 'LINK_REVOKED');
    expect((await c.call('get', `/boards/${boardId}`, R.token)).body.role).toBe('editor');
    expect((await c.call('get', `/boards/${boardId}/links`, O.token)).body).toEqual([]);
    expectError(await c.call('delete', `/boards/${boardId}/links/${L1.linkId}`, O.token), 404, 'LINK_NOT_FOUND');

    // Old guest token: no board data over REST, reconnection refused.
    expectError(await c.call('get', `/boards/${boardId}`, G1.token), 410, 'LINK_REVOKED');
    const s = connectSocket(srv.url, G1.token, { reconnection: false });
    const err = await waitEvent(s, 'connect_error');
    expect(err.data).toEqual({ code: 'UNAUTHENTICATED' });
    s.close();

    const ev = securityEvents(srv, 'link.revoked').at(-1);
    expect(ev).toMatchObject({ actorId: O.id, boardId, outcome: 'success', details: { linkId: L1.linkId } });
  });

  test('a link of another board cannot be revoked through this board', async () => {
    const O = await c.register('Owner');
    const b1 = await c.createBoard(O.token, 'one');
    const b2 = await c.createBoard(O.token, 'two');
    const l2 = await c.link(O.token, b2, 'viewer');
    expectError(await c.call('delete', `/boards/${b1}/links/${l2.linkId}`, O.token), 404, 'LINK_NOT_FOUND');
    expectError(await c.call('delete', `/boards/${b1}/links/not-an-id`, O.token), 404, 'LINK_NOT_FOUND');
    expect(await ShareLink.exists({ _id: l2.linkId, revokedAt: null })).not.toBeNull();
  });
});

describe('TC-103 share-link expiry (FR-048) with LINK_EXPIRY_OVERRIDE_SEC', () => {
  let srv;
  let c;
  const open = [];
  beforeAll(async () => {
    srv = await startTestServer({ LINK_EXPIRY_OVERRIDE_SEC: '3' });
    c = client(srv);
  });
  afterAll(async () => {
    for (const x of open) x.close();
    await srv.stop();
  });

  test('guest disconnected within 5 s after expiry; expired link rejected', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token);
    const L2 = await c.link(O.token, boardId, 'viewer');
    const G2 = await c.guest(L2.token, 'G2');
    expect(G2.exp * 1000).toBeLessThanOrEqual(Date.parse(L2.expiresAt)); // guest token ends with the link
    const g2 = await scriptedClient(srv.url, G2.token, boardId);
    open.push(g2);
    const revoked = await onceKind(g2, 'revoked');
    expect(revoked).toMatchObject({ boardId, reason: 'LINK_EXPIRED' });
    await waitFor(() => !g2.socket.connected, { message: 'guest disconnected' });
    expect(Date.now() - Date.parse(L2.expiresAt)).toBeLessThan(5000);

    // The guest token (whole seconds) may end up to 1 s before the link itself expires.
    await waitFor(() => Date.now() > Date.parse(L2.expiresAt), { timeout: 2000, message: 'link expiry' });
    expectError(await c.call('post', '/links/resolve', null, { token: L2.token, displayName: 'Late' }), 410, 'LINK_EXPIRED');
    expect((await c.call('get', `/boards/${boardId}/links`, O.token)).body).toEqual([]);
    expect(securityEvents(srv, 'link.expired_disconnect').at(-1)).toMatchObject({ boardId, actorType: 'guest' });
  }, 20000);
});

// ---------------------------------------------------------------------------------------------
describe('TC-104 (part) share-link token strength and storage (SEC-REQ-004)', () => {
  let srv;
  let c;
  beforeAll(async () => {
    srv = await startTestServer();
    c = client(srv);
  });
  afterAll(async () => {
    await srv.stop();
  });

  test('1,000 tokens: 43 base64url characters, unique, stored only as SHA-256 hashes', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token);
    const tokens = [];
    for (let i = 0; i < 1000; i += 50) {
      const batch = await Promise.all(Array.from({ length: 50 }, () => c.link(O.token, boardId, 'viewer')));
      tokens.push(...batch.map((l) => l.token));
    }
    expect(tokens).toHaveLength(1000);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Set(tokens).size).toBe(1000);
    const stored = await ShareLink.find({ boardId }).lean();
    expect(stored).toHaveLength(1000);
    const hashes = new Set(stored.map((l) => l.tokenHash));
    for (const t of tokens) expect(hashes.has(hashLinkToken(t))).toBe(true);
    const dump = JSON.stringify(stored);
    for (const t of tokens.slice(0, 50)) expect(dump.includes(t)).toBe(false);
    expectNoSecrets(srv, tokens.slice(0, 50));
  }, 120000);
});
