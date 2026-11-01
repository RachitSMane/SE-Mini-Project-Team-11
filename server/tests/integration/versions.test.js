// COMP-07 Version History Service through API-03 and API-01.
// STP: TC-012 (FR-030 to FR-032), TC-013 (FR-033, FR-034; functional part and timing record),
// TC-014 (FR-035).
import crypto from 'node:crypto';
import { rect, scriptedClient, startTestServer, waitFor } from '../helpers/harness.js';
import { apiClient, expectError, freshJoin, onceKind, securityEvents } from '../helpers/api.js';
import { Board, Version } from '../../src/db/models.js';

const key = () => crypto.randomUUID();
const versionsOf = async (boardId) =>
  (await Version.find({ boardId }, { number: 1, trigger: 1, restoredFrom: 1, boardSeq: 1 }).sort({ number: 1 }).lean()).map((v) => ({
    number: v.number,
    trigger: v.trigger,
    restoredFrom: v.restoredFrom,
    boardSeq: v.boardSeq,
  }));

async function setupBoard(srv, c, open) {
  const O = await c.register('Owner');
  const E = await c.register('Editor');
  const V = await c.register('Viewer');
  const boardId = await c.createBoard(O.token);
  await c.addMember(O.token, boardId, E.token, 'editor');
  await c.addMember(O.token, boardId, V.token, 'viewer');
  const joinAll = async () => {
    const clients = [await scriptedClient(srv.url, O.token, boardId), await scriptedClient(srv.url, E.token, boardId), await scriptedClient(srv.url, V.token, boardId)];
    open.push(...clients);
    return clients;
  };
  return { O, E, V, boardId, joinAll };
}

// ---------------------------------------------------------------------------------------------
describe('TC-012 periodic versions with VERSION_INTERVAL_MS = 1000', () => {
  let srv;
  let c;
  const open = [];
  beforeAll(async () => {
    srv = await startTestServer({ VERSION_INTERVAL_MS: '1000' });
    c = apiClient(srv);
  });
  afterAll(async () => {
    for (const x of open) x.close();
    await srv.stop();
  });

  test('one periodic version per changed interval; none while unchanged', async () => {
    const { boardId, joinAll } = await setupBoard(srv, c, open);
    const [, e] = await joinAll();
    expect((await e.submitAck('object:add', rect())).ok).toBe(true);
    await waitFor(async () => (await Version.countDocuments({ boardId })) === 1, { timeout: 3000, message: 'periodic version' });
    expect(await versionsOf(boardId)).toEqual([{ number: 1, trigger: 'periodic', restoredFrom: null, boardSeq: 1 }]);
    await new Promise((r) => setTimeout(r, 2500)); // two more intervals without changes
    expect(await Version.countDocuments({ boardId })).toBe(1);
    expect((await e.submitAck('object:add', rect())).ok).toBe(true);
    await waitFor(async () => (await Version.countDocuments({ boardId })) === 2, { timeout: 3000, message: 'second periodic version' });
    expect((await versionsOf(boardId))[1]).toMatchObject({ number: 2, trigger: 'periodic', boardSeq: 2 });
  }, 20000);
});

// ---------------------------------------------------------------------------------------------
describe('TC-012/TC-013/TC-014 with the periodic timer disabled (deterministic triggers)', () => {
  let srv;
  let c;
  const open = [];
  beforeAll(async () => {
    srv = await startTestServer({ VERSION_INTERVAL_MS: '0' });
    c = apiClient(srv);
  });
  afterAll(async () => {
    for (const x of open) x.close();
    await srv.stop();
  });

  test('TC-012: last-participant version, no-change rule, list and read-only preview', async () => {
    const { O, V, boardId, joinAll } = await setupBoard(srv, c, open);
    let [o, e, v] = await joinAll();
    expect((await e.submitAck('object:add', rect())).ok).toBe(true);
    expect(await srv.services.versions.triggerAutomatic(boardId, 'periodic')).toEqual({ created: true, number: 1 });
    expect(await srv.services.versions.triggerAutomatic(boardId, 'periodic')).toEqual({ created: false, number: 1 });

    // 3. Change, everyone leaves -> exactly one last_left version.
    expect((await e.submitAck('object:add', rect())).ok).toBe(true);
    for (const x of [o, e, v]) x.close();
    await waitFor(async () => (await Version.countDocuments({ boardId })) === 2, { message: 'last_left version' });
    expect((await versionsOf(boardId))[1]).toMatchObject({ number: 2, trigger: 'last_left' });
    // 4. Rejoin and leave without changes -> no version.
    [o, e, v] = await joinAll();
    for (const x of [o, e, v]) x.close();
    await new Promise((r) => setTimeout(r, 300));
    expect(await Version.countDocuments({ boardId })).toBe(2);

    // 5. Viewer lists versions, newest first, with the API-03 fields.
    const list = await c.call('get', `/boards/${boardId}/versions`, V.token);
    expect(list.status).toBe(200);
    expect(list.body.map((x) => [x.number, x.trigger])).toEqual([[2, 'last_left'], [1, 'periodic']]);
    for (const x of list.body) {
      expect(Object.keys(x).sort()).toEqual(['createdAt', 'createdBy', 'number', 'restoredFrom', 'trigger']);
      expect(Date.parse(x.createdAt)).not.toBeNaN();
    }
    expect((await c.call('get', `/boards/${boardId}/versions?limit=1`, V.token)).body.map((x) => x.number)).toEqual([2]);
    expect((await c.call('get', `/boards/${boardId}/versions?before=2`, V.token)).body.map((x) => x.number)).toEqual([1]);
    for (const q of ['limit=0', 'limit=51', 'limit=abc', 'before=-1', 'before=1e3']) {
      expectError(await c.call('get', `/boards/${boardId}/versions?${q}`, V.token), 400, 'VALIDATION_FAILED');
    }

    // 6. Preview is read-only and unaffected by live changes.
    [o, e, v] = await joinAll();
    const preview = await c.call('get', `/boards/${boardId}/versions/1`, V.token);
    expect(preview.status).toBe(200);
    expect(Object.keys(preview.body).sort()).toEqual(['createdAt', 'number', 'objects', 'restoredFrom', 'trigger']);
    expect(preview.body.objects).toHaveLength(1);
    expect((await e.submitAck('object:add', rect())).ok).toBe(true);
    expect((await c.call('get', `/boards/${boardId}/versions/1`, V.token)).body).toEqual(preview.body);
    expect(v.sync.exportState().objects.length).toBeGreaterThanOrEqual(2);
    expectError(await c.call('get', `/boards/${boardId}/versions/99`, V.token), 404, 'VERSION_NOT_FOUND');
    expectError(await c.call('get', `/boards/${boardId}/versions/abc`, V.token), 400, 'VALIDATION_FAILED');
    // There is no endpoint that creates, edits or deletes a version (SEC-OBJ-002).
    for (const [m, p] of [['post', `/boards/${boardId}/versions`], ['delete', `/boards/${boardId}/versions/1`], ['patch', `/boards/${boardId}/versions/1`]]) {
      expect((await c.call(m, p, O.token, {})).status).toBe(404);
    }
  });

  test('TC-013: restore replaces every participant\'s board and records a new version', async () => {
    const { O, boardId, joinAll } = await setupBoard(srv, c, open);
    const [o, e, v] = await joinAll();
    const n1 = [rect(), rect()];
    for (const x of n1) await e.submitAck('object:add', x);
    await srv.services.versions.triggerAutomatic(boardId, 'periodic'); // version 1 = n
    const n = o.sync.exportState().objects;
    await e.submitAck('object:delete', { id: n1[0].id });
    await e.submitAck('object:add', rect());
    await srv.services.versions.triggerAutomatic(boardId, 'periodic'); // version 2
    const before = await versionsOf(boardId);

    const states = [o, e, v].map((x) => onceKind(x, 'state-replaced'));
    const restoredEvt = onceKind(v, 'version:restored');
    const t0 = performance.now();
    const k = key();
    const res = await c.call('post', `/boards/${boardId}/versions/1/restore`, O.token, undefined, { 'Idempotency-Key': k });
    await Promise.all(states);
    const restoreMs = performance.now() - t0;
    expect(res.status).toBe(201);
    const seq = (await Board.findById(boardId).lean()).seq;
    expect(res.body).toEqual({ newVersion: 3, restoredFrom: 1, seq });
    for (const x of [o, e, v]) expect(x.sync.exportState()).toEqual({ lastSeq: seq, objects: n });
    expect(await restoredEvt).toMatchObject({ boardId, restoredFrom: 1, newVersion: 3, actor: { id: O.id } });
    expect(restoreMs).toBeLessThan(3000); // NFR-005 target; recorded, not a load test
    const after = await versionsOf(boardId);
    expect(after.slice(0, 2)).toEqual(before);
    expect(after[2]).toEqual({ number: 3, trigger: 'restore', restoredFrom: 1, boardSeq: seq });
    const fresh = await freshJoin(srv.url, O.token, boardId);
    fresh.close();
    expect(fresh.objects).toEqual(n);

    // Retry with the same key: recorded result, nothing restored again.
    const retry = await c.call('post', `/boards/${boardId}/versions/1/restore`, O.token, undefined, { 'Idempotency-Key': k.toUpperCase() });
    expect(retry.status).toBe(201);
    expect(retry.body).toEqual(res.body);
    expect(await Version.countDocuments({ boardId })).toBe(3);
    // Same key for another version.
    const reused = await c.call('post', `/boards/${boardId}/versions/2/restore`, O.token, undefined, { 'Idempotency-Key': k });
    expectError(reused, 409, 'IDEMPOTENCY_KEY_REUSED');
    expect(reused.body.error.message).toBe('This Idempotency-Key was already used to restore version 1');
    // Restoring content identical to the board still creates a version (step 5).
    const again = await c.call('post', `/boards/${boardId}/versions/3/restore`, O.token, undefined, { 'Idempotency-Key': key() });
    expect(again.body).toMatchObject({ newVersion: 4, restoredFrom: 3 });
    // Errors.
    expectError(await c.call('post', `/boards/${boardId}/versions/1/restore`, O.token), 400, 'VALIDATION_FAILED');
    expectError(await c.call('post', `/boards/${boardId}/versions/1/restore`, O.token, undefined, { 'Idempotency-Key': 'not-a-uuid' }), 400, 'VALIDATION_FAILED');
    expectError(await c.call('post', `/boards/${boardId}/versions/99/restore`, O.token, undefined, { 'Idempotency-Key': key() }), 404, 'VERSION_NOT_FOUND');
    expect(await Version.countDocuments({ boardId })).toBe(4);
    expect(securityEvents(srv, 'version.restored').filter((x) => x.boardId === boardId)).toHaveLength(2);
  });

  test('TC-024 step 8 (no faults): concurrent restores are serialised, each with its own version', async () => {
    const { O, boardId, joinAll } = await setupBoard(srv, c, open);
    const [o, e] = await joinAll();
    await e.submitAck('object:add', rect());
    await srv.services.versions.triggerAutomatic(boardId, 'periodic');
    await e.submitAck('object:add', rect());
    await srv.services.versions.triggerAutomatic(boardId, 'periodic');
    const ops = [];
    const restore = (n) => c.call('post', `/boards/${boardId}/versions/${n}/restore`, O.token, undefined, { 'Idempotency-Key': key() });
    const [r1, r2] = await Promise.all([restore(1), restore(2), (async () => {
      for (let i = 0; i < 5; i += 1) ops.push(await e.submitAck('object:add', rect()));
    })()]);
    expect([r1.status, r2.status]).toEqual([201, 201]);
    expect([r1.body.newVersion, r2.body.newVersion].sort()).toEqual([3, 4]);
    expect(r1.body.seq).not.toBe(r2.body.seq);
    for (const a of ops) expect(a.ok).toBe(true);
    const fresh = await freshJoin(srv.url, O.token, boardId);
    fresh.close();
    await waitFor(() => o.sync.lastSeq === fresh.lastSeq);
    expect(o.sync.exportState().objects).toEqual(fresh.objects);
  });

  test('TC-014: the 20 newest versions are retained, usable, and older ones are VERSION_NOT_FOUND', async () => {
    const { O, boardId, joinAll } = await setupBoard(srv, c, open);
    const [, e] = await joinAll();
    for (let i = 0; i < 25; i += 1) {
      await e.submitAck('object:add', rect());
      expect((await srv.services.versions.triggerAutomatic(boardId, 'periodic')).created).toBe(true);
    }
    const all = (await c.call('get', `/boards/${boardId}/versions?limit=50`, O.token)).body.map((x) => x.number);
    expect(all).toEqual(Array.from({ length: 20 }, (_, i) => 25 - i));
    expect((await c.call('get', `/boards/${boardId}/versions/6`, O.token)).body.objects).toHaveLength(6);
    const r = await c.call('post', `/boards/${boardId}/versions/6/restore`, O.token, undefined, { 'Idempotency-Key': key() });
    expect(r.body).toMatchObject({ newVersion: 26, restoredFrom: 6 });
    expectError(await c.call('get', `/boards/${boardId}/versions/1`, O.token), 404, 'VERSION_NOT_FOUND');
    expectError(await c.call('post', `/boards/${boardId}/versions/1/restore`, O.token, undefined, { 'Idempotency-Key': key() }), 404, 'VERSION_NOT_FOUND');
    const kept = (await c.call('get', `/boards/${boardId}/versions?limit=50`, O.token)).body.map((x) => x.number);
    expect(kept).toEqual(Array.from({ length: 20 }, (_, i) => 26 - i));
  }, 60000);
});
