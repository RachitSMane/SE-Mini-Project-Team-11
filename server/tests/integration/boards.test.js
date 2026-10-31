// Issue #13 / #19: board management and persistence through the REST API (API-02) and the
// database: create, retrieve, rename, delete; invalid and missing board requests; persistence
// of board data across a server restart; and the common REST error contract (SAD §4.3).
// Complements access.test.js (TC-016 title boundaries, cascade delete, 404 for unknown IDs),
// which is not repeated here.
import { rect, scriptedClient, startTestServer, text, waitEvent } from '../helpers/harness.js';
import { apiClient, expectError, freshJoin, logEvents } from '../helpers/api.js';
import { Board } from '../../src/db/models.js';

const ROLE_LESS_ID = '0123456789abcdef01234567';

describe('board rename (issue #13)', () => {
  let srv;
  let c;
  const open = [];
  beforeAll(async () => {
    srv = await startTestServer();
    c = apiClient(srv);
  });
  afterAll(async () => {
    for (const x of open) x.close();
    await srv.stop();
  });

  test('the Owner renames a board; the title is trimmed, stored and returned everywhere', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token, 'Draft');
    const before = await Board.findById(boardId).lean();
    await new Promise((r) => setTimeout(r, 5)); // updatedAt must move forward

    const res = await c.call('patch', `/boards/${boardId}`, O.token, { title: '  Sprint planning  ' });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['id', 'role', 'title', 'updatedAt']);
    expect(res.body).toMatchObject({ id: boardId, title: 'Sprint planning', role: 'owner' });

    const stored = await Board.findById(boardId).lean();
    expect(stored.title).toBe('Sprint planning');
    expect(stored.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    expect(stored.seq).toBe(before.seq); // renaming is not a board operation
    expect(String(stored.ownerId)).toBe(O.id);

    expect((await c.call('get', `/boards/${boardId}`, O.token)).body.title).toBe('Sprint planning');
    const list = await c.call('get', '/boards', O.token);
    expect(list.body.find((b) => b.id === boardId)).toMatchObject({ title: 'Sprint planning', role: 'owner' });
    // Most recently changed first on the dashboard.
    await c.createBoard(O.token, 'Older');
    await c.call('patch', `/boards/${boardId}`, O.token, { title: 'Sprint planning v2' });
    expect((await c.call('get', '/boards', O.token)).body[0].id).toBe(boardId);
    expect(logEvents(srv, 'board.renamed').some((l) => l.boardId === boardId && l.actorId === O.id)).toBe(true);
  });

  test('title rules are the same as for creation: 1–100 characters, not blank, no extra fields', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token, 'Keep');
    expect((await c.call('patch', `/boards/${boardId}`, O.token, { title: 'x'.repeat(100) })).status).toBe(200);
    expect((await c.call('patch', `/boards/${boardId}`, O.token, { title: 'a' })).status).toBe(200);
    for (const body of [{ title: '' }, { title: '   ' }, { title: 'x'.repeat(101) }, {}, { title: 7 }, { title: null }, { title: 'ok', ownerId: O.id }, []]) {
      expectError(await c.call('patch', `/boards/${boardId}`, O.token, body), 400, 'VALIDATION_FAILED');
    }
    expect((await Board.findById(boardId).lean()).title).toBe('a');
  });

  test('only the Owner may rename: 403 for Editor, Viewer and guest; 404 without a role; 401 without a token', async () => {
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const V = await c.register('Viewer');
    const X = await c.register('NoRole');
    const boardId = await c.createBoard(O.token, 'Original');
    await c.addMember(O.token, boardId, E.token, 'editor');
    await c.addMember(O.token, boardId, V.token, 'viewer');
    const G = await c.guest((await c.link(O.token, boardId, 'editor')).token, 'Guest');
    for (const who of [E, V, G]) expectError(await c.call('patch', `/boards/${boardId}`, who.token, { title: 'Hijack' }), 403, 'FORBIDDEN');
    expectError(await c.call('patch', `/boards/${boardId}`, X.token, { title: 'Hijack' }), 404, 'BOARD_NOT_FOUND');
    expectError(await c.call('patch', `/boards/${boardId}`, null, { title: 'Hijack' }), 401, 'UNAUTHENTICATED');
    expectError(await c.call('patch', `/boards/${boardId}`, 'not-a-token', { title: 'Hijack' }), 401, 'UNAUTHENTICATED');
    expect((await Board.findById(boardId).lean()).title).toBe('Original');
  });

  test('missing, malformed and deleted boards are 404', async () => {
    const O = await c.register('Owner');
    for (const id of [ROLE_LESS_ID, 'not-an-id', '$where']) {
      expectError(await c.call('patch', `/boards/${id}`, O.token, { title: 'x' }), 404, 'BOARD_NOT_FOUND');
    }
    const boardId = await c.createBoard(O.token, 'Doomed');
    expect((await c.call('delete', `/boards/${boardId}`, O.token)).status).toBe(204);
    expectError(await c.call('patch', `/boards/${boardId}`, O.token, { title: 'x' }), 404, 'BOARD_NOT_FOUND');
    expectError(await c.call('get', `/boards/${boardId}`, O.token), 404, 'BOARD_NOT_FOUND');
    expectError(await c.call('delete', `/boards/${boardId}`, O.token), 404, 'BOARD_NOT_FOUND');
    expect(await Board.exists({ _id: boardId })).toBeNull();
  });

  test('participants with the board open are told the new title; content is untouched', async () => {
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const boardId = await c.createBoard(O.token, 'Live');
    await c.addMember(O.token, boardId, E.token, 'editor');
    const e = await scriptedClient(srv.url, E.token, boardId);
    open.push(e);
    expect((await e.submitAck('object:add', rect())).ok).toBe(true);
    const before = e.sync.exportState();
    const renamed = waitEvent(e.socket, 'board:renamed');
    expect((await c.call('patch', `/boards/${boardId}`, O.token, { title: 'Live v2' })).status).toBe(200);
    expect(await renamed).toEqual({ boardId, title: 'Live v2' });
    expect(e.sync.exportState()).toEqual(before);
  });
});

describe('board persistence (issue #13: "board changes persist after refreshing")', () => {
  let srv;
  afterAll(async () => {
    await srv?.stop();
  });

  test('title, membership and content survive a server restart and are returned to a new session', async () => {
    srv = await startTestServer();
    const mongoUrl = srv.mongoUrl;
    let c = apiClient(srv);
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const boardId = await c.createBoard(O.token, 'Persistent');
    await c.addMember(O.token, boardId, E.token, 'editor');
    await c.call('patch', `/boards/${boardId}`, O.token, { title: 'Persistent (renamed)' });
    const o = await scriptedClient(srv.url, O.token, boardId);
    const r = rect({ id: 'persist-rect' });
    const t = text('Kept after restart', { id: 'persist-text' });
    expect((await o.submitAck('object:add', r)).ok).toBe(true);
    expect((await o.submitAck('object:add', t)).ok).toBe(true);
    expect((await o.submitAck('object:update', { id: 'persist-rect', x: 222.5 })).ok).toBe(true);
    expect((await o.submitAck('object:delete', { id: 'persist-text' })).ok).toBe(true);
    const expected = o.sync.exportState();
    o.close();
    await srv.stop();

    // Same database, new server process state (empty caches).
    srv = await startTestServer({ MONGO_URL: mongoUrl });
    c = apiClient(srv);
    expect((await c.call('get', `/boards/${boardId}`, O.token)).body).toMatchObject({ title: 'Persistent (renamed)', role: 'owner', ownerId: O.id });
    expect((await c.call('get', '/boards', E.token)).body).toEqual([expect.objectContaining({ id: boardId, title: 'Persistent (renamed)', role: 'editor' })]);
    const joined = await freshJoin(srv.url, E.token, boardId);
    try {
      expect({ lastSeq: joined.lastSeq, objects: joined.objects }).toEqual(expected);
      expect(joined.objects).toEqual([expect.objectContaining({ id: 'persist-rect', x: 222.5 })]);
      expect(joined.role).toBe('editor');
    } finally {
      joined.close();
    }
  });
});

describe('REST error contract (SAD §4.3)', () => {
  let srv;
  let c;
  beforeAll(async () => {
    srv = await startTestServer();
    c = apiClient(srv);
  });
  afterAll(async () => {
    await srv.stop();
  });

  test('health check reports the database', async () => {
    const res = await srv.http().get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  test('every error is the common error object whose requestId matches the X-Request-Id header', async () => {
    const res = await c.call('get', '/boards', null);
    expectError(res, 401, 'UNAUTHENTICATED');
    expect(res.headers['x-request-id']).toBe(res.body.error.requestId);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('unknown API routes are 404 NOT_FOUND', async () => {
    const O = await c.register('Owner');
    expectError(await c.call('get', '/does-not-exist', O.token), 404, 'NOT_FOUND');
    expectError(await c.call('put', '/boards', O.token, { title: 'x' }), 404, 'NOT_FOUND');
  });

  test('malformed JSON and bodies over 64 KiB are 400 VALIDATION_FAILED, never 500', async () => {
    const O = await c.register('Owner');
    const bad = await srv.http().post('/api/v1/boards').set('Authorization', `Bearer ${O.token}`).set('Content-Type', 'application/json').send('{"title":');
    expectError(bad, 400, 'VALIDATION_FAILED');
    expect(bad.body.error.message).toMatch(/not valid JSON/);
    const big = await c.call('post', '/boards', O.token, { title: 'x', pad: 'y'.repeat(70_000) });
    expectError(big, 400, 'VALIDATION_FAILED');
    expect(big.body.error.message).toMatch(/64 KiB/);
    expect(logEvents(srv, 'http.internal_error')).toHaveLength(0);
  });

  test('internal details never reach the client', async () => {
    const O = await c.register('Owner');
    const res = await c.call('get', `/boards/${ROLE_LESS_ID}`, O.token);
    expect(JSON.stringify(res.body)).not.toMatch(/mongo|stack|at \w+ \(/i);
  });
});
