// Persistence and crash recovery with the server as a child process (SAD §3.6, §4.1.6).
// STP: TC-011 (FR-027), TC-025 (FR-007 clear faults), TC-024 (FR-033 restore faults).
// Data: TC-024 restores TB-STD (D7a: 300 strokes, 50 shapes, 20 texts) as specified. TC-025 uses
// the specified minimum of 50 objects for the first clears and 5 objects for the later steps; TC-011
// uses its specified 30 operations.
import crypto from 'node:crypto';
import { jest } from '@jest/globals';
import { canonicalState } from '@wb/shared/objects';
import { rect, restClient, scriptedClient, spawnServer, uniqueDbUrl, waitFor } from '../helpers/harness.js';
import { freePort } from '../../../scripts/mongod.js';
import { tbStd } from '../../../scripts/perf/env.js';
import { Board, BoardObject, Version, connectDb, disconnectDb } from '../../src/db/models.js';

jest.setTimeout(240000);

let procs = [];
const clients = [];
afterEach(async () => {
  for (const x of clients.splice(0)) x.close();
  for (const p of procs.splice(0)) await p.kill();
  await disconnectDb();
});

/** One database and one fixed port per test, so that scripted clients reconnect after restarts. */
async function environment() {
  const mongoUrl = uniqueDbUrl('rec');
  const port = await freePort();
  await connectDb(mongoUrl);
  const boot = async (fault = '') => {
    const s = await spawnServer({ mongoUrl, port, env: fault ? { FAULT_INJECT: fault } : {} });
    procs.push(s);
    return s;
  };
  return { mongoUrl, port, url: `http://127.0.0.1:${port}`, boot };
}

async function dbState(boardId) {
  const board = await Board.findById(boardId).lean();
  const objects = canonicalState(
    new Map((await BoardObject.find({ boardId }).lean()).map((d) => [d.objectId, { id: d.objectId, ...pick(d) }])),
  );
  const versions = await Version.find({ boardId }).sort({ number: 1 }).lean();
  return { seq: board.seq, pendingOp: board.pendingOp ?? null, objects, versions };
}

function pick(d) {
  const out = {};
  for (const k of ['kind', 'points', 'x', 'y', 'w', 'h', 'x1', 'y1', 'x2', 'y2', 'text', 'color', 'strokeWidth']) if (d[k] != null) out[k] = d[k];
  return out;
}

async function connect(url, token, boardId) {
  const sc = await scriptedClient(url, token, boardId);
  clients.push(sc);
  return sc;
}

/** Adds n objects, below the 30 operations/s limit. */
async function fill(sc, n) {
  for (let i = 0; i < n; i += 1) {
    expect((await sc.submitAck('object:add', rect({ x: i }))).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 35));
  }
}

/** Submit without awaiting: records the acknowledgement or rejection if one ever arrives. */
function track(sc, type, payload) {
  const out = { ack: null, error: null };
  const id = sc.sync.submit(type, payload);
  const unsub = sc.sync.subscribe((k, d) => {
    if ((k === 'ack' || k === 'rejected') && d.entry.clientOpId === id) {
      if (k === 'ack') out.ack = d.ack;
      else out.error = d.error;
      unsub();
    }
  });
  return out;
}

function countApplied(sc) {
  const counter = { n: 0 };
  sc.socket.on('op:applied', () => {
    counter.n += 1;
  });
  return counter;
}

const ready = (sc, seq) => waitFor(() => sc.sync.status === 'ready' && (seq === undefined || sc.sync.lastSeq === seq), { timeout: 15000, message: 'client resynchronised' });
const hasEvent = (proc, event) => proc.logs().some((l) => l.event === event);

// ---------------------------------------------------------------------------------------------
test('TC-011: every acknowledged change survives a kill and restart; seq continues', async () => {
  const env = await environment();
  const s1 = await env.boot();
  expect(s1.ready).toBe(true);
  const rest = restClient(env.url);
  const O = await rest.register('Owner');
  const boardId = await rest.createBoard(O.token);
  const o = await connect(env.url, O.token, boardId);
  for (let i = 0; i < 30; i += 1) {
    const op = i % 3 === 0 || i < 3 ? ['object:add', rect({ id: `o${i}` })] : ['object:update', { id: `o${i - (i % 3)}`, x: i }];
    expect((await o.submitAck(...op)).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 35));
  }
  const acked = o.sync.exportState();
  expect(acked.lastSeq).toBe(30);
  o.close();
  await s1.kill();
  const s2 = await env.boot();
  expect(s2.ready).toBe(true);
  const again = await connect(env.url, O.token, boardId);
  expect(again.sync.exportState()).toEqual(acked);
  expect(await again.submitAck('object:add', rect())).toMatchObject({ ok: true, seq: 31 });
});

// ---------------------------------------------------------------------------------------------
test('TC-025: clear with version-write failure, crashes at every point, DB errors and failed recovery', async () => {
  const env = await environment();
  let s = await env.boot();
  const rest = restClient(env.url);
  const O = await rest.register('Owner');
  const V = await rest.register('Observer');
  const boardId = await rest.createBoard(O.token);
  await rest.addMember(O.token, boardId, V.token, 'editor');
  let o = await connect(env.url, O.token, boardId);
  let v = await connect(env.url, V.token, boardId);
  await fill(o, 50);
  const restart = async (fault = '') => {
    await s.kill();
    s = await env.boot(fault);
    return s;
  };

  // 1. version_write_error: clear rejected, nothing changes.
  await restart('version_write_error');
  await ready(o);
  await ready(v);
  let before = await dbState(boardId);
  let vApplied = countApplied(v);
  expect(await o.submitAck('board:clear', {})).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
  expect(await dbState(boardId)).toEqual(before);
  expect(vApplied.n).toBe(0);
  expect(hasEvent(s, 'op.clear_failed')).toBe(true);

  // 2. after_preclear_version: crash before the commit -> content kept, nothing rolled forward.
  await restart('after_preclear_version');
  await ready(o);
  before = await dbState(boardId);
  let t = track(o, 'board:clear', {});
  expect(await s.exited).toBe(86);
  s = await env.boot();
  await ready(o, before.seq);
  let after = await dbState(boardId);
  expect({ seq: after.seq, pendingOp: after.pendingOp, objects: after.objects }).toEqual({ seq: before.seq, pendingOp: null, objects: before.objects });
  expect(after.versions.at(-1).objects).toEqual(before.objects); // the extra before-clear version equals the content
  expect(hasEvent(s, 'board.clear_rolled_forward')).toBe(false);
  expect(t.ack).toBeNull();

  // 3. after_pending_clear: crash right after the commit -> rolled forward on restart.
  await restart('after_pending_clear');
  await ready(o);
  await ready(v);
  before = await dbState(boardId);
  vApplied = countApplied(v);
  t = track(o, 'board:clear', {});
  expect(await s.exited).toBe(86);
  expect(t.ack).toBeNull();
  expect(vApplied.n).toBe(0);
  s = await env.boot();
  after = await dbState(boardId);
  expect({ seq: after.seq, pendingOp: after.pendingOp, objects: after.objects }).toEqual({ seq: before.seq + 1, pendingOp: null, objects: [] });
  expect(after.versions.at(-1).objects).toEqual(before.objects);
  expect(hasEvent(s, 'board.clear_rolled_forward')).toBe(true);
  await ready(o, before.seq + 1);
  await ready(v, before.seq + 1);
  expect(o.sync.exportState().objects).toEqual([]);

  // 4. during_object_delete: partial delete, crash, two restarts.
  await fill(o, 50);
  await restart('during_object_delete');
  await ready(o);
  before = await dbState(boardId);
  track(o, 'board:clear', {});
  expect(await s.exited).toBe(86);
  expect((await dbState(boardId)).objects.length).toBeLessThan(50);
  s = await env.boot();
  after = await dbState(boardId);
  expect({ seq: after.seq, pendingOp: after.pendingOp, objects: after.objects }).toEqual({ seq: before.seq + 1, pendingOp: null, objects: [] });
  expect(after.versions.at(-1)).toMatchObject({ trigger: 'before_clear', objects: before.objects });
  await restart();
  expect(await dbState(boardId)).toEqual(after);
  expect(hasEvent(s, 'board.clear_rolled_forward')).toBe(false);

  // 5. Clear of the empty board: no-op.
  await ready(o, after.seq);
  expect(await o.submitAck('board:clear', {})).toMatchObject({ ok: true, seq: null, noop: true });
  expect(await dbState(boardId)).toEqual(after);

  // 6. after_complete: crash after completion, before ack/broadcast.
  await fill(o, 5);
  await restart('after_complete');
  await ready(o);
  before = await dbState(boardId);
  const notice = new Promise((resolve) => {
    o.sync.subscribe((k, d) => k === 'notice' && resolve(d));
  });
  t = track(o, 'board:clear', {});
  expect(await s.exited).toBe(86);
  s = await env.boot();
  after = await dbState(boardId);
  expect({ seq: after.seq, pendingOp: after.pendingOp, objects: after.objects }).toEqual({ seq: before.seq + 1, pendingOp: null, objects: [] });
  expect(hasEvent(s, 'board.clear_rolled_forward')).toBe(false);
  await ready(o, before.seq + 1);
  expect(t.ack).toBeNull();
  expect(await notice).toMatchObject({ code: 'UNCONFIRMED_DISCARDED' });

  // 7. db_error_after_commit: no success, recovery.required, later operations INTERNAL; restart completes.
  await fill(o, 5);
  await restart('db_error_after_commit');
  await ready(o);
  await ready(v);
  before = await dbState(boardId);
  expect(await o.submitAck('board:clear', {})).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
  expect(hasEvent(s, 'recovery.required')).toBe(true);
  expect(await v.submitAck('object:add', rect())).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
  await restart();
  after = await dbState(boardId);
  expect({ seq: after.seq, pendingOp: after.pendingOp, objects: after.objects }).toEqual({ seq: before.seq + 1, pendingOp: null, objects: [] });
  expect(hasEvent(s, 'board.clear_rolled_forward')).toBe(true);

  // 8. Failed start-up recovery: exit non-zero without accepting connections; then complete.
  await ready(o);
  await fill(o, 5);
  await restart('after_pending_clear');
  await ready(o);
  before = await dbState(boardId);
  track(o, 'board:clear', {});
  expect(await s.exited).toBe(86);
  s = await env.boot('recovery_db_error');
  expect(s.ready).toBe(false);
  expect(await s.exited).not.toBe(0);
  expect(hasEvent(s, 'recovery.required')).toBe(true);
  expect((await dbState(boardId)).pendingOp).not.toBeNull();
  s = await env.boot();
  after = await dbState(boardId);
  expect({ seq: after.seq, pendingOp: after.pendingOp, objects: after.objects }).toEqual({ seq: before.seq + 1, pendingOp: null, objects: [] });
});

// ---------------------------------------------------------------------------------------------
test('TC-024: restore failure before commit, interrupted restores, idempotent retries', async () => {
  const env = await environment();
  let s = await env.boot();
  const rest = restClient(env.url);
  const O = await rest.register('Owner');
  const V = await rest.register('Observer');
  const boardId = await rest.createBoard(O.token);
  await rest.addMember(O.token, boardId, V.token, 'editor');
  let o = await connect(env.url, O.token, boardId);
  const v = await connect(env.url, V.token, boardId);
  for (const obj of tbStd(24, 'n')) {
    // TB-STD as version n, added below the 30 operations/s limit
    expect((await o.submitAck('object:add', obj)).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 35));
  }
  o.close();
  v.close();
  await waitFor(async () => (await Version.countDocuments({ boardId })) === 1, { message: 'version n (last_left)' }); // n = 1
  o = await connect(env.url, O.token, boardId);
  await fill(o, 5);
  o.close();
  await waitFor(async () => (await Version.countDocuments({ boardId })) === 2, { message: 'version m (last_left)' }); // m = 2
  o = await connect(env.url, O.token, boardId);
  await o.submitAck('object:delete', { id: o.sync.exportState().objects[0].id });
  const n = (await Version.findOne({ boardId, number: 1 }).lean()).objects;

  const restore = (num, k) =>
    rest
      .agent()
      .post(`/api/v1/boards/${boardId}/versions/${num}/restore`)
      .set('Authorization', `Bearer ${O.token}`)
      .set('Idempotency-Key', k)
      .then((r) => ({ status: r.status, body: r.body }))
      .catch((err) => ({ status: 'no-response', error: err.code || err.message }));
  const restart = async (fault = '') => {
    await s.kill();
    s = await env.boot(fault);
  };
  const restoreVersionsFor = async (k) => Version.find({ boardId, requestId: k.toLowerCase() }).lean();
  const expectRestoredTo = async (k) => {
    const st = await dbState(boardId);
    expect(st.pendingOp).toBeNull();
    expect(st.objects).toEqual(n);
    const rv = await restoreVersionsFor(k);
    expect(rv).toHaveLength(1);
    expect(rv[0]).toMatchObject({ trigger: 'restore', restoredFrom: 1, boardSeq: st.seq });
    return { st, version: rv[0] };
  };
  const K = Array.from({ length: 8 }, () => crypto.randomUUID());

  // 1. commit_write_error: 500, nothing changed, no board:state; retry after clearing the fault.
  await restart('commit_write_error');
  const watcher = await connect(env.url, V.token, boardId);
  let stateEvents = 0;
  watcher.socket.on('board:state', () => {
    stateEvents += 1;
  });
  let before = await dbState(boardId);
  const r1 = await restore(1, K[0]);
  expect(r1.status).toBe(500);
  expect(r1.body.error.code).toBe('INTERNAL');
  expect(await dbState(boardId)).toEqual(before);
  expect(stateEvents).toBe(0);
  expect(hasEvent(s, 'version.restore_failed')).toBe(true);
  await restart();
  const r1b = await restore(1, K[0]);
  expect(r1b.status).toBe(201);
  await expectRestoredTo(K[0]);

  // 2–4. Crashes after the commit are rolled forward on restart.
  for (const [i, fault] of [[1, 'after_pending_restore'], [2, 'after_version_insert'], [3, 'during_object_replace']]) {
    await o.submitAck('object:add', rect()).catch(() => null);
    await restart(fault);
    await ready(watcher);
    stateEvents = 0;
    const r = await restore(1, K[i]);
    expect(r.status).toBe('no-response');
    expect(await s.exited).toBe(86);
    expect(stateEvents).toBe(0);
    await env.boot().then((p) => {
      s = p;
    });
    const { st } = await expectRestoredTo(K[i]);
    expect(hasEvent(s, 'version.restore_rolled_forward')).toBe(true);
    if (fault === 'during_object_replace') {
      await restart();
      expect(await dbState(boardId)).toEqual(st);
      expect(hasEvent(s, 'version.restore_rolled_forward')).toBe(false);
    }
    await ready(watcher, st.seq);
  }

  // 5. Retry with K4 returns the completed result; K4 for version m is 409.
  const k4 = (await restoreVersionsFor(K[3]))[0];
  const r5 = await restore(1, K[3]);
  expect(r5).toEqual({ status: 201, body: { newVersion: k4.number, restoredFrom: 1, seq: k4.boardSeq } });
  const count5 = await Version.countDocuments({ boardId });
  expect((await restore(2, K[3])).body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  expect(await Version.countDocuments({ boardId })).toBe(count5);

  // 6. after_complete: nothing to roll forward; retry returns the recorded result.
  await ready(o);
  await o.submitAck('object:add', rect());
  await restart('after_complete');
  const r6 = await restore(1, K[4]);
  expect(r6.status).toBe('no-response');
  expect(await s.exited).toBe(86);
  s = await env.boot();
  expect(hasEvent(s, 'version.restore_rolled_forward')).toBe(false);
  const { version: v6 } = await expectRestoredTo(K[4]);
  const count6 = await Version.countDocuments({ boardId });
  expect(await restore(1, K[4])).toEqual({ status: 201, body: { newVersion: v6.number, restoredFrom: 1, seq: v6.boardSeq } });
  expect(await Version.countDocuments({ boardId })).toBe(count6);

  // 7. db_error_after_commit: 500, recovery.required, V's operation INTERNAL; restart completes.
  await ready(o);
  await o.submitAck('object:add', rect());
  await restart('db_error_after_commit');
  await ready(watcher);
  const r7 = await restore(1, K[5]);
  expect(r7.status).toBe(500);
  expect(hasEvent(s, 'recovery.required')).toBe(true);
  expect(await watcher.submitAck('object:add', rect())).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
  await restart();
  expect(hasEvent(s, 'version.restore_rolled_forward')).toBe(true);
  const { version: v7 } = await expectRestoredTo(K[5]);
  expect(await restore(1, K[5])).toEqual({ status: 201, body: { newVersion: v7.number, restoredFrom: 1, seq: v7.boardSeq } });
});
