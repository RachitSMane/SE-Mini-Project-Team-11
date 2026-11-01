// COMP-06 real-time collaboration (API-01) with scripted clients built on the COMP-02 sync module.
// STP (server side, scripted clients): TC-001 to TC-008, TC-010, TC-107.
import crypto from 'node:crypto';
import { canonicalState, LIMITS } from '@wb/shared/objects';
import {
  connectSocket,
  emitAck,
  rect,
  scriptedClient,
  startTestServer,
  stroke,
  text,
  waitEvent,
  waitFor,
} from '../helpers/harness.js';
import { apiClient, freshJoin, logEvents, onceKind } from '../helpers/api.js';
import { Board, BoardObject, Version } from '../../src/db/models.js';

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

async function join(token, boardId, opts) {
  const sc = await scriptedClient(srv.url, token, boardId, opts);
  open.push(sc);
  return sc;
}

/** Owner O, Editor E and Viewer V joined to a new board. */
async function setup() {
  const O = await c.register('Owner');
  const E = await c.register('Editor');
  const V = await c.register('Viewer');
  const boardId = await c.createBoard(O.token);
  await c.addMember(O.token, boardId, E.token, 'editor');
  await c.addMember(O.token, boardId, V.token, 'viewer');
  const [o, e, v] = [await join(O.token, boardId), await join(E.token, boardId), await join(V.token, boardId)];
  return { O, E, V, boardId, o, e, v };
}

async function converged(boardId, token, clients) {
  const fresh = await freshJoin(srv.url, token, boardId);
  try {
    await waitFor(() => clients.every((x) => x.sync.lastSeq === fresh.lastSeq), { message: `clients at seq ${fresh.lastSeq}` });
    for (const x of clients) expect(x.sync.exportState()).toEqual({ lastSeq: fresh.lastSeq, objects: fresh.objects });
    return fresh;
  } finally {
    fresh.close();
  }
}

/** Keeps a round at >= 50 ms so that one connection stays below 30 operations/s (SEC-REQ-006). */
async function paced(fn) {
  const [result] = await Promise.all([fn(), new Promise((r) => setTimeout(r, 50))]);
  return result;
}

function expectContiguous(seqs) {
  for (let i = 1; i < seqs.length; i += 1) expect(seqs[i]).toBe(seqs[i - 1] + 1);
}

// ---------------------------------------------------------------------------------------------
test('TC-001/002/003/004: add, update, move, restyle and delete are sequenced, persisted and broadcast', async () => {
  const { O, boardId, o, e, v } = await setup();
  const s = stroke(50, { color: '#D32F2F', strokeWidth: 8 });
  const shapes = [rect(), rect({ kind: 'ellipse' }), { id: 'line1', kind: 'line', x1: 0, y1: 0, x2: 200, y2: 50, color: '#000000', strokeWidth: 2 }];
  const t = text('Sprint plan');
  for (const obj of [s, stroke(3, { strokeWidth: 1 }), stroke(3, { strokeWidth: 20 }), ...shapes, t]) {
    expect(await e.submitAck('object:add', obj)).toMatchObject({ ok: true, seq: expect.any(Number) });
  }
  expect((await e.submitAck('object:update', { id: t.id, text: 'Sprint plan v2' })).ok).toBe(true);
  expect((await e.submitAck('object:add', text('x'.repeat(500)))).ok).toBe(true);
  // Move (complete new geometry), restyle, delete (FR-005); eraser = delete of whole objects (FR-006).
  const r = shapes[0];
  expect((await e.submitAck('object:update', { id: r.id, x: r.x + 100 })).ok).toBe(true);
  expect((await e.submitAck('object:update', { id: r.id, color: '#43A047', strokeWidth: 4 })).ok).toBe(true);
  expect((await e.submitAck('object:delete', { id: r.id })).ok).toBe(true);
  expect((await e.submitAck('object:delete', { id: t.id })).ok).toBe(true);

  const fresh = await converged(boardId, O.token, [o, e, v]);
  const byId = new Map(fresh.objects.map((x) => [x.id, x]));
  expect(byId.get(s.id)).toEqual(s);
  expect(byId.has(r.id)).toBe(false);
  expect(byId.has(t.id)).toBe(false);
  expect(byId.get(shapes[1].id)).toEqual(shapes[1]);
  for (const x of [o, e, v]) expectContiguous(x.sync.appliedSeqs);
  // Persisted (FR-027): database objects equal the live state.
  const docs = await BoardObject.find({ boardId }).lean();
  expect(docs.map((d) => d.objectId).sort()).toEqual(fresh.objects.map((x) => x.id).sort());
  expect((await Board.findById(boardId).lean()).seq).toBe(fresh.lastSeq);
});

test('TC-001/002/107: invalid operations are rejected with VALIDATION_FAILED and change nothing', async () => {
  const { O, boardId, o, e } = await setup();
  const base = rect();
  expect((await e.submitAck('object:add', base)).ok).toBe(true);
  await waitFor(() => o.sync.confirmed.has(base.id)); // broadcast may arrive after the submitter's ack
  let applied = 0;
  o.socket.on('op:applied', () => {
    applied += 1;
  });
  const before = await freshJoin(srv.url, O.token, boardId);
  before.close();
  const { kind, ...noKind } = rect();
  const invalid = [
    ['object:add', noKind],
    ['object:add', { ...rect(), kind: 'triangle' }],
    ['object:add', { ...rect(), color: 'red' }],
    ['object:add', { ...rect(), strokeWidth: 0 }],
    ['object:add', { ...rect(), strokeWidth: 21 }],
    ['object:add', { ...rect(), strokeWidth: 2.5 }],
    ['object:add', text('x'.repeat(501))],
    ['object:add', text('')],
    ['object:add', { ...rect(), x: 'ten' }],
    ['object:add', { ...rect(), x: LIMITS.MAX_COORD + 1 }],
    ['object:add', { ...rect(), w: -1 }],
    ['object:add', { ...rect(), extra: 1 }],
    ['object:add', { ...rect(), id: 'bad id!' }],
    ['object:add', { ...base }], // duplicate id
    ['object:add', stroke(LIMITS.MAX_POINTS + 1)],
    ['object:add', { ...stroke(2), points: [[1, 2, 3]] }],
    ['object:update', { id: base.id }],
    ['object:update', { id: base.id, kind: 'ellipse' }],
    ['object:update', { id: base.id, points: [[0, 0]] }],
    ['object:update', { id: base.id, strokeWidth: 50 }],
    ['object:delete', { id: base.id, extra: true }],
    ['board:clear', { force: true }],
  ];
  for (const [type, payload] of invalid) {
    const ack = await e.submitAck(type, payload);
    expect({ type, payload, code: ack.error?.code }).toEqual({ type, payload, code: type === 'board:clear' ? 'FORBIDDEN' : 'VALIDATION_FAILED' });
  }
  // Envelope-level problems (raw messages).
  const raw = [
    { boardId, clientOpId: 'x1', type: 'object:explode', payload: {} },
    { boardId, clientOpId: 'x2', type: 'object:add' },
    { boardId, clientOpId: 'x3', type: 'object:add', payload: rect(), role: 'owner' },
    'just a string',
  ];
  for (const msg of raw) expect(await emitAck(e.socket, 'op:submit', msg)).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
  expect(await e.submitAck('object:update', { id: 'missing', x: 1 })).toMatchObject({ ok: false, error: { code: 'OBJECT_NOT_FOUND' } });
  expect(await e.submitAck('object:delete', { id: 'missing' })).toMatchObject({ ok: false, error: { code: 'OBJECT_NOT_FOUND' } });

  await new Promise((r) => setTimeout(r, 200));
  expect(applied).toBe(0);
  const after = await freshJoin(srv.url, O.token, boardId);
  after.close();
  expect({ lastSeq: after.lastSeq, objects: after.objects }).toEqual({ lastSeq: before.lastSeq, objects: before.objects });
  // Rejected operations are removed from the optimistic view (TC-010).
  expect(e.sync.pending).toHaveLength(0);
  expect(canonicalState(e.sync.getView())).toEqual(after.objects);
});

test('TC-107: <script> text is stored and broadcast literally', async () => {
  const { boardId, o, e } = await setup();
  const markup = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const t = text(markup);
  expect((await e.submitAck('object:add', t)).ok).toBe(true);
  await waitFor(() => o.sync.confirmed.has(t.id));
  expect(o.sync.confirmed.get(t.id).text).toBe(markup);
  expect((await BoardObject.findOne({ boardId, objectId: t.id }).lean()).text).toBe(markup);
});

test('TC-107: a 65,537-byte packet is refused by the message limit; 65,536 bytes is delivered', async () => {
  const { O, boardId, o } = await setup();
  const before = (await Board.findById(boardId).lean()).seq;
  // Engine.IO frame of an emit with acknowledgement id 0 on a fresh socket: 42/board,0[...]
  const frameBytes = (msg) => Buffer.byteLength(`42/board,0${JSON.stringify(['op:submit', msg])}`);
  const padded = (target) => {
    const msg = { boardId, clientOpId: 'big', type: 'object:add', payload: rect(), pad: '' };
    msg.pad = 'a'.repeat(target - frameBytes(msg));
    expect(frameBytes(msg)).toBe(target);
    return msg;
  };
  const send = async (msg) => {
    const s = connectSocket(srv.url, O.token, { reconnection: false });
    await waitEvent(s, 'connect');
    const result = await new Promise((resolve) => {
      s.once('disconnect', (reason) => resolve({ disconnected: reason }));
      s.emit('op:submit', msg, (ack) => resolve({ ack }));
    });
    s.close();
    return result;
  };
  const over = await send(padded(65_537));
  expect(over.disconnected).toBeDefined();
  const at = await send(padded(65_536));
  expect(at.ack).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } }); // delivered; rejected only by schema
  // Control: a valid stroke close to the limit is accepted.
  const big = stroke(LIMITS.MAX_POINTS, {});
  big.points = big.points.map(([x], i) => [x + 0.5, -123456.7 + i]);
  const msg = { boardId, clientOpId: 'ctl', type: 'object:add', payload: big };
  expect(frameBytes(msg)).toBeLessThanOrEqual(65_536);
  expect(frameBytes(msg)).toBeGreaterThan(30_000);
  expect((await o.submitAck('object:add', big)).ok).toBe(true);
  expect((await Board.findById(boardId).lean()).seq).toBe(before + 1);
});

test('TC-005: clear is Owner-only, keeps a before-clear version, obeys the no-change rule, empty clear is a no-op', async () => {
  const { O, boardId, o, e, v } = await setup();
  for (let i = 0; i < 5; i += 1) expect((await e.submitAck('object:add', rect())).ok).toBe(true);
  const seqBefore = (await Board.findById(boardId).lean()).seq;
  // 1. Editor clear rejected.
  expect(await e.submitAck('board:clear', {})).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  expect(await BoardObject.countDocuments({ boardId })).toBe(5);
  // 3. Owner clears changed content: a before-clear version holds the pre-clear objects.
  const preClear = o.sync.exportState().objects;
  const ack = await o.submitAck('board:clear', {});
  expect(ack).toMatchObject({ ok: true, seq: seqBefore + 1 });
  await converged(boardId, O.token, [o, e, v]);
  expect(o.sync.exportState().objects).toEqual([]);
  const versions = (await c.call('get', `/boards/${boardId}/versions`, O.token)).body;
  expect(versions[0]).toMatchObject({ number: 1, trigger: 'before_clear', createdBy: O.id });
  expect((await c.call('get', `/boards/${boardId}/versions/1`, O.token)).body.objects).toEqual(preClear);
  // 5. Three objects, a periodic version, then clear: no extra before-clear version.
  for (let i = 0; i < 3; i += 1) expect((await e.submitAck('object:add', rect())).ok).toBe(true);
  expect(await srv.services.versions.triggerAutomatic(boardId, 'periodic')).toMatchObject({ created: true, number: 2 });
  expect((await o.submitAck('board:clear', {})).ok).toBe(true);
  const list = (await c.call('get', `/boards/${boardId}/versions`, O.token)).body;
  expect(list.map((x) => [x.number, x.trigger])).toEqual([[2, 'periodic'], [1, 'before_clear']]);
  expect((await c.call('get', `/boards/${boardId}/versions/2`, O.token)).body.objects).toHaveLength(3);
  // 7. Clearing an empty board: no-op, no sequence number, no version, no broadcast.
  const seq = (await Board.findById(boardId).lean()).seq;
  let applied = 0;
  e.socket.on('op:applied', () => {
    applied += 1;
  });
  expect(await o.submitAck('board:clear', {})).toEqual({ ok: true, clientOpId: expect.any(String), seq: null, noop: true });
  await new Promise((r) => setTimeout(r, 150));
  expect(applied).toBe(0);
  expect((await Board.findById(boardId).lean()).seq).toBe(seq);
  expect(await Version.countDocuments({ boardId })).toBe(2);
});

test('TC-006: concurrent edits to different objects converge (50 rounds)', async () => {
  const O = await c.register('Owner');
  const E1 = await c.register('E1');
  const E2 = await c.register('E2');
  const boardId = await c.createBoard(O.token);
  await c.addMember(O.token, boardId, E1.token, 'editor');
  await c.addMember(O.token, boardId, E2.token, 'editor');
  const c1 = await join(E1.token, boardId);
  const c2 = await join(E2.token, boardId);
  const X = rect();
  const Y = rect();
  await c1.submitAck('object:add', X);
  await c2.submitAck('object:add', Y);
  const colours = ['#1E88E5', '#FB8C00', '#43A047', '#8E24AA'];
  for (let round = 0; round < 50; round += 1) {
    const [a1, a2] = await paced(() =>
      Promise.all([
        c1.submitAck('object:update', { id: X.id, x: 10 + round }),
        c2.submitAck('object:update', { id: Y.id, color: colours[round % 4] }),
      ]),
    );
    expect(a1.ok && a2.ok).toBe(true);
    const fresh = await converged(boardId, O.token, [c1, c2]);
    const byId = new Map(fresh.objects.map((x) => [x.id, x]));
    expect(byId.get(X.id).x).toBe(10 + round);
    expect(byId.get(Y.id).color).toBe(colours[round % 4]);
  }
  expect(c1.sync.appliedSeqs).toEqual(c2.sync.appliedSeqs);
  expectContiguous(c1.sync.appliedSeqs);
}, 60000);

test('TC-007: same property — higher sequence number wins; different properties merge; delete vs update', async () => {
  const { O, boardId, o: c3, e: c1 } = await setup();
  const E2 = await c.register('E2');
  await c.addMember(O.token, boardId, E2.token, 'editor');
  const c2 = await join(E2.token, boardId);
  const Z = rect();
  await c1.submitAck('object:add', Z);
  for (let round = 0; round < 50; round += 1) {
    const [a1, a2] = await paced(() =>
      Promise.all([
        c1.submitAck('object:update', { id: Z.id, color: '#1E88E5' }),
        c2.submitAck('object:update', { id: Z.id, color: '#FB8C00' }),
      ]),
    );
    expect(a1.ok && a2.ok).toBe(true);
    const winner = a1.seq > a2.seq ? '#1E88E5' : '#FB8C00';
    const fresh = await converged(boardId, O.token, [c1, c2, c3]);
    expect(fresh.objects.find((x) => x.id === Z.id).color).toBe(winner);
  }
  await Promise.all([c1.submitAck('object:update', { id: Z.id, x: 300 }), c2.submitAck('object:update', { id: Z.id, strokeWidth: 6 })]);
  const merged = (await converged(boardId, O.token, [c1, c2, c3])).objects.find((x) => x.id === Z.id);
  expect(merged).toMatchObject({ x: 300, strokeWidth: 6 });

  const [del, upd] = await Promise.all([c1.submitAck('object:delete', { id: Z.id }), c2.submitAck('object:update', { id: Z.id, y: 1 })]);
  expect(del.ok).toBe(true);
  if (!upd.ok) expect(upd.error.code).toBe('OBJECT_NOT_FOUND');
  else expect(upd.seq).toBeLessThan(del.seq);
  const final = await converged(boardId, O.token, [c1, c2, c3]);
  expect(final.objects.find((x) => x.id === Z.id)).toBeUndefined();
}, 60000);

test('TC-008: a late joiner receives the full state and the participant list', async () => {
  const { O, boardId, o, e } = await setup();
  for (let i = 0; i < 10; i += 1) {
    await o.submitAck('object:add', stroke(20));
    await e.submitAck('object:add', rect());
  }
  const E2 = await c.register('Late');
  await c.addMember(O.token, boardId, E2.token, 'editor');
  const e2 = await join(E2.token, boardId);
  await waitFor(() => e2.sync.lastSeq === o.sync.lastSeq);
  expect(e2.sync.exportState()).toEqual(o.sync.exportState());
  expect(e2.sync.lastSeq).toBeGreaterThanOrEqual(20);
  const names = e2.sync.participants.map((p) => p.displayName);
  expect(names).toEqual(expect.arrayContaining(['Owner', 'Editor', 'Viewer', 'Late']));
});

test('TC-010: a rejected optimistic operation is rolled back and never reaches others', async () => {
  const { o, e } = await setup();
  let seen = false;
  o.socket.on('op:applied', (evt) => {
    if (evt.payload?.strokeWidth === 50) seen = true;
  });
  const bad = rect({ strokeWidth: 50 });
  const rejected = onceKind(e, 'rejected');
  const id = e.sync.submit('object:add', bad);
  expect(id).toEqual(expect.any(String));
  expect(e.sync.getView().has(bad.id)).toBe(true); // rendered optimistically
  const t0 = performance.now();
  const r = await rejected;
  expect(r.error.code).toBe('VALIDATION_FAILED');
  expect(e.sync.getView().has(bad.id)).toBe(false);
  expect(performance.now() - t0).toBeLessThan(1000);
  await new Promise((res) => setTimeout(res, 150));
  expect(seen).toBe(false);
});

test('submitting without joining the board is rejected', async () => {
  const O = await c.register('Owner');
  const boardId = await c.createBoard(O.token);
  const s = connectSocket(srv.url, O.token, { reconnection: false });
  await waitEvent(s, 'connect');
  const ack = await emitAck(s, 'op:submit', { boardId, clientOpId: crypto.randomUUID().slice(0, 30), type: 'object:add', payload: rect() });
  expect(ack).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
  s.close();
  expect(logEvents(srv, 'op.rejected').length).toBeGreaterThan(0);
});

test('FR-025: a silently lost connection is detected by the heartbeat within 20 s and recovers', async () => {
  const { o } = await setup();
  const disconnected = onceKind(o, 'disconnected');
  const t0 = Date.now();
  // Simulated dead network: the client stops receiving every packet (data and server pings).
  o.socket.io.engine.transport.removeAllListeners('packet');
  expect(await disconnected).toBe('ping timeout');
  const detectedMs = Date.now() - t0;
  expect(detectedMs).toBeLessThanOrEqual(20_500); // pingInterval 10 s + pingTimeout 10 s (defaults: 20–45 s)
  expect(o.sync.submit('object:add', rect())).toBeNull(); // editing disabled while disconnected
  await waitFor(() => o.sync.status === 'ready', { timeout: 10_000, message: 'automatic reconnection' });
  expect((await o.submitAck('object:add', rect())).ok).toBe(true);
}, 40_000);
