// COMP-02 Client Sync Module rules (SAD §4.1.3) against a fake socket.
import { jest } from '@jest/globals';
import { SyncClient } from '../src/syncClient.js';
import { applyOperation, canonicalState, snapshotForm, translatedGeometry, updatableProps } from '../src/objects.js';

class FakeSocket {
  constructor() {
    this.connected = true;
    this.handlers = new Map();
    this.sent = [];
    this.joinState = { seq: 0, objects: [] };
  }

  on(event, fn) {
    this.handlers.set(event, fn);
  }

  off(event) {
    this.handlers.delete(event);
  }

  emit(event, payload, ack) {
    this.sent.push({ event, payload, ack });
    if (event === 'board:join') ack({ ok: true, role: 'editor', state: this.joinState, participants: [] });
  }

  fire(event, data) {
    this.handlers.get(event)?.(data);
  }

  disconnect() {
    this.connected = false;
    this.fire('disconnect', 'io client disconnect');
  }

  connect() {
    this.connected = true;
    this.fire('connect');
  }
}

const r = (id, x = 0) => ({ id, kind: 'rect', x, y: 0, w: 1, h: 1, color: '#000000', strokeWidth: 1 });
const evt = (seq, type, payload) => ({ boardId: 'b', seq, clientOpId: `o${seq}`, actor: { id: 'u' }, type, payload });

async function readyClient(opts) {
  const socket = new FakeSocket();
  const sync = new SyncClient(socket, 'b', opts);
  await sync.start();
  return { socket, sync };
}

afterEach(() => jest.useRealTimers());

test('applies events strictly in seq order, buffering out-of-order ones and ignoring duplicates', async () => {
  const { socket, sync } = await readyClient();
  socket.fire('op:applied', evt(2, 'object:update', { id: 'a', x: 5 }));
  expect(sync.lastSeq).toBe(0);
  socket.fire('op:applied', evt(1, 'object:add', r('a')));
  expect(sync.lastSeq).toBe(2);
  expect(sync.confirmed.get('a').x).toBe(5);
  socket.fire('op:applied', evt(1, 'object:add', r('a', 99)));
  expect(sync.confirmed.get('a').x).toBe(5);
  expect(sync.appliedSeqs).toEqual([1, 2]);
});

test('a gap not closed within 1 s triggers a resynchronising join', async () => {
  jest.useFakeTimers();
  const { socket, sync } = await readyClient();
  socket.fire('op:applied', evt(3, 'object:add', r('c')));
  socket.joinState = { seq: 3, objects: [r('a'), r('b'), r('c')] };
  expect(socket.sent.filter((s) => s.event === 'board:join')).toHaveLength(1);
  jest.advanceTimersByTime(1000);
  expect(socket.sent.filter((s) => s.event === 'board:join')).toHaveLength(2);
  expect(sync.lastSeq).toBe(3);
  expect(canonicalState(sync.confirmed).map((o) => o.id)).toEqual(['a', 'b', 'c']);
});

test('more than 100 buffered events trigger an immediate resynchronisation', async () => {
  const { socket } = await readyClient();
  for (let s = 2; s <= 102; s += 1) socket.fire('op:applied', evt(s, 'object:add', r(`x${s}`)));
  expect(socket.sent.filter((s) => s.event === 'board:join')).toHaveLength(2);
});

test('optimistic view, acknowledgement and rejection rollback', async () => {
  const { socket, sync } = await readyClient();
  const id1 = sync.submit('object:add', r('a'));
  const id2 = sync.submit('object:add', r('bad'));
  expect([...sync.getView().keys()]).toEqual(['a', 'bad']);
  const [first, second] = socket.sent.filter((s) => s.event === 'op:submit');
  const events = [];
  sync.subscribe((k, d) => events.push([k, d?.entry?.clientOpId ?? d?.error?.code]));
  second.ack({ ok: false, clientOpId: id2, error: { code: 'VALIDATION_FAILED' } });
  expect([...sync.getView().keys()]).toEqual(['a']);
  first.ack({ ok: true, clientOpId: id1, seq: 1 });
  expect(sync.pending).toHaveLength(0);
  expect(sync.confirmed.has('a')).toBe(true);
  expect(events).toEqual(expect.arrayContaining([['rejected', id2], ['ack', id1]]));
});

test('reconnection replaces state and discards unconfirmed operations with a notice', async () => {
  const { socket, sync } = await readyClient();
  sync.submit('object:add', r('lost'));
  const notices = [];
  sync.subscribe((k, d) => k === 'notice' && notices.push(d.code));
  socket.disconnect();
  expect(sync.status).toBe('disconnected');
  expect(sync.submit('object:add', r('offline'))).toBeNull(); // editing disabled while disconnected
  socket.joinState = { seq: 7, objects: [r('server')] };
  socket.connect();
  expect(sync.status).toBe('ready');
  expect(sync.pending).toHaveLength(0);
  expect(sync.exportState()).toEqual({ lastSeq: 7, objects: [r('server')] });
  expect(notices).toEqual(['UNCONFIRMED_DISCARDED']);
});

test('board:state after a restore replaces confirmed state and keeps pending operations', async () => {
  const { socket, sync } = await readyClient();
  sync.submit('object:add', r('mine'));
  socket.fire('board:state', { boardId: 'b', seq: 40, objects: [r('restored')] });
  expect(sync.lastSeq).toBe(40);
  expect([...sync.getView().keys()].sort()).toEqual(['mine', 'restored']);
  sync.close(); // 'mine' is never acknowledged: clear its real 10 s acknowledgement timer
});

test('role change and revocation', async () => {
  const { socket, sync } = await readyClient();
  socket.fire('role:changed', { boardId: 'b', role: 'viewer' });
  expect(sync.role).toBe('viewer');
  socket.fire('role:changed', { boardId: 'other', role: 'owner' });
  expect(sync.role).toBe('viewer');
  socket.fire('access:revoked', { boardId: 'b', reason: 'MEMBER_REMOVED' });
  expect(sync.status).toBe('revoked');
  expect(sync.submit('object:add', r('x'))).toBeNull();
});

describe('objects.js', () => {
  test('applyOperation implements add, per-property update, delete and clear', () => {
    const m = new Map();
    applyOperation(m, 'object:add', r('a'));
    applyOperation(m, 'object:update', { id: 'a', x: 3 });
    expect(m.get('a')).toEqual({ ...r('a'), x: 3 });
    expect(applyOperation(m, 'object:update', { id: 'zz', x: 1 })).toBe(false);
    applyOperation(m, 'object:add', r('b'));
    applyOperation(m, 'object:delete', { id: 'a' });
    expect([...m.keys()]).toEqual(['b']);
    applyOperation(m, 'board:clear', {});
    expect(m.size).toBe(0);
    expect(() => applyOperation(m, 'nope', {})).toThrow();
  });

  test('snapshotForm drops foreign properties; canonicalState sorts by id', () => {
    expect(snapshotForm({ ...r('a'), role: 'owner', extra: 1 })).toEqual(r('a'));
    const m = new Map([['b', r('b')], ['a', r('a')]]);
    expect(canonicalState(m).map((o) => o.id)).toEqual(['a', 'b']);
  });

  test('translatedGeometry moves every kind and rounds to 0.1', () => {
    expect(translatedGeometry(r('a', 1), 0.04, 2)).toEqual({ x: 1, y: 2 });
    expect(translatedGeometry({ kind: 'line', x1: 0, y1: 0, x2: 1, y2: 1 }, 1, 1)).toEqual({ x1: 1, y1: 1, x2: 2, y2: 2 });
    expect(translatedGeometry({ kind: 'stroke', points: [[0, 0], [1, 1]] }, 10, 0)).toEqual({ points: [[10, 0], [11, 1]] });
    expect(updatableProps('text')).toEqual(['x', 'y', 'text', 'color', 'strokeWidth']);
  });
});
