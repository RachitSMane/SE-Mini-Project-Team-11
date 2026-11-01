// COMP-02 Client Sync Module: connection lifecycle (issue #18) and state consistency /
// validation of incoming synchronisation events (issue #24), against a fake socket.
import { jest } from '@jest/globals';
import { SyncClient, sequencedEventProblem, stateProblem } from '../src/syncClient.js';

/** Fake socket that keeps every listener (so duplicate registrations would be visible). */
class ListenerSocket {
  constructor() {
    this.connected = true;
    this.listeners = new Map();
    this.sent = [];
    this.joinState = { seq: 0, objects: [] };
    this.joinAck = null; // override the join acknowledgement
    this.connectCalls = 0;
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  off(event, fn) {
    const list = this.listeners.get(event) || [];
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }

  count(event) {
    return (this.listeners.get(event) || []).length;
  }

  emit(event, payload, ack) {
    this.sent.push({ event, payload, ack });
    if (event === 'board:join') ack(this.joinAck || { ok: true, role: 'editor', state: this.joinState, participants: [] });
  }

  fire(event, data) {
    for (const fn of [...(this.listeners.get(event) || [])]) fn(data);
  }

  joins() {
    return this.sent.filter((s) => s.event === 'board:join').length;
  }

  /** Server-side close: Socket.IO reports 'io server disconnect' and does not reconnect by itself. */
  serverDisconnect() {
    this.connected = false;
    this.fire('disconnect', 'io server disconnect');
  }

  disconnect() {
    this.connected = false;
    this.fire('disconnect', 'io client disconnect');
  }

  connect() {
    this.connectCalls += 1;
    this.connected = true;
    this.fire('connect');
  }
}

const r = (id, x = 0) => ({ id, kind: 'rect', x, y: 0, w: 1, h: 1, color: '#000000', strokeWidth: 1 });
const evt = (seq, type, payload, boardId = 'b') => ({ boardId, seq, clientOpId: `o${seq}`, actor: { id: 'u' }, type, payload });

async function readyClient(opts) {
  const socket = new ListenerSocket();
  const sync = new SyncClient(socket, 'b', opts);
  await sync.start();
  const events = [];
  sync.subscribe((kind, data) => events.push({ kind, data }));
  return { socket, sync, events };
}

afterEach(() => jest.useRealTimers());

describe('connection lifecycle (#18)', () => {
  test('close() removes every listener; a new client on the same socket handles each event once', async () => {
    const { socket, sync } = await readyClient();
    const registered = [...socket.listeners.keys()];
    expect(registered).toEqual(expect.arrayContaining(['connect', 'disconnect', 'op:applied', 'board:state']));
    for (const e of registered) expect(socket.count(e)).toBe(1);
    sync.close();
    for (const e of registered) expect(socket.count(e)).toBe(0);

    const second = new SyncClient(socket, 'b');
    await second.start();
    for (const e of registered) expect(socket.count(e)).toBe(1);
    socket.fire('op:applied', evt(1, 'object:add', r('a')));
    expect(second.appliedSeqs).toEqual([1]);
    expect(sync.appliedSeqs).toEqual([]); // the closed client no longer reacts
    second.close();
  });

  test('a server-initiated disconnect is followed by one reconnection and a fresh join', async () => {
    jest.useFakeTimers();
    const { socket, sync, events } = await readyClient();
    socket.joinState = { seq: 4, objects: [r('a')] };
    socket.serverDisconnect();
    expect(sync.status).toBe('disconnected');
    expect(socket.connectCalls).toBe(0);
    jest.advanceTimersByTime(499);
    expect(socket.connectCalls).toBe(0);
    jest.advanceTimersByTime(1);
    expect(socket.connectCalls).toBe(1);
    expect(events.map((e) => e.kind)).toContain('reconnecting');
    expect(sync.status).toBe('ready');
    expect(sync.exportState()).toEqual({ lastSeq: 4, objects: [r('a')] });
    expect(socket.joins()).toBe(2);
  });

  test('no manual reconnection after a client-side disconnect, after close(), or when disabled', async () => {
    jest.useFakeTimers();
    const a = await readyClient();
    a.socket.disconnect(); // 'io client disconnect': the application closed it on purpose
    jest.advanceTimersByTime(5000);
    expect(a.socket.connectCalls).toBe(0);

    const b = await readyClient();
    b.socket.serverDisconnect();
    b.sync.close(); // e.g. the board page unmounts before the retry
    jest.advanceTimersByTime(5000);
    expect(b.socket.connectCalls).toBe(0);

    const c = await readyClient({ reconnectOnServerDisconnect: false });
    c.socket.serverDisconnect();
    jest.advanceTimersByTime(5000);
    expect(c.socket.connectCalls).toBe(0);
  });

  test('a revoked client is not reconnected when the server then closes the socket', async () => {
    jest.useFakeTimers();
    const { socket, sync } = await readyClient();
    socket.fire('access:revoked', { boardId: 'b', reason: 'MEMBER_REMOVED' });
    socket.serverDisconnect();
    jest.advanceTimersByTime(5000);
    expect(socket.connectCalls).toBe(0);
    expect(sync.status).toBe('revoked');
  });

  test('a reconnection that happens before the retry timer cancels it (no double connect)', async () => {
    jest.useFakeTimers();
    const { socket, sync } = await readyClient();
    socket.serverDisconnect();
    socket.connect(); // reconnected by other means (e.g. ack-timeout recovery)
    jest.advanceTimersByTime(5000);
    expect(socket.connectCalls).toBe(1);
    expect(sync.status).toBe('ready');
  });

  test('repeated disconnect/reconnect cycles keep one listener per event and converge', async () => {
    const { socket, sync } = await readyClient();
    for (let i = 1; i <= 5; i += 1) {
      socket.disconnect();
      socket.joinState = { seq: i, objects: [r(`o${i}`)] };
      socket.connect();
      expect(sync.status).toBe('ready');
      expect(sync.exportState()).toEqual({ lastSeq: i, objects: [r(`o${i}`)] });
    }
    for (const e of socket.listeners.keys()) expect(socket.count(e)).toBe(1);
  });

  test('a join acknowledgement arriving after close() does not revive the client', async () => {
    const socket = new ListenerSocket();
    let deferred;
    socket.emit = (event, payload, ack) => {
      if (event === 'board:join') deferred = ack;
    };
    const sync = new SyncClient(socket, 'b');
    sync.start();
    sync.close();
    deferred({ ok: true, role: 'editor', state: { seq: 3, objects: [] }, participants: [] });
    expect(sync.status).not.toBe('ready');
    expect(sync.lastSeq).toBe(0);
  });
});

describe('validation of incoming synchronisation events (#24)', () => {
  test('op:applied for another board is ignored silently', async () => {
    const { socket, sync, events } = await readyClient();
    socket.fire('op:applied', evt(1, 'object:add', r('foreign'), 'other'));
    expect(sync.lastSeq).toBe(0);
    expect(sync.confirmed.size).toBe(0);
    expect(events.filter((e) => e.kind === 'invalid-event')).toHaveLength(0);
  });

  test.each([
    ['not an object', null],
    ['invalid seq', { ...evt(1, 'object:add', r('a')), seq: '1' }],
    ['invalid seq', { ...evt(1, 'object:add', r('a')), seq: 0 }],
    ['invalid seq', { ...evt(1, 'object:add', r('a')), seq: 1.5 }],
    ['unknown type', evt(1, 'object:explode', r('a'))],
    ['invalid payload', evt(1, 'object:add', null)],
    ['invalid payload', evt(1, 'object:add', [r('a')])],
    ['missing object id', evt(1, 'object:update', { x: 4 })],
    ['unknown kind', evt(1, 'object:add', { ...r('a'), kind: 'triangle' })],
  ])('a malformed op:applied (%s) is ignored and reported', async (reason, bad) => {
    const { socket, sync, events } = await readyClient();
    socket.fire('op:applied', bad);
    expect(sync.lastSeq).toBe(0);
    expect(sync.confirmed.size).toBe(0);
    expect(events.find((e) => e.kind === 'invalid-event').data).toMatchObject({ event: 'op:applied', reason });
  });

  test('an ignored malformed event leaves a gap that is repaired from the server', async () => {
    jest.useFakeTimers();
    const { socket, sync } = await readyClient();
    socket.fire('op:applied', { ...evt(1, 'object:add', r('a')), payload: null }); // dropped
    socket.fire('op:applied', evt(2, 'object:add', r('b'))); // buffered: seq 1 missing
    expect(sync.lastSeq).toBe(0);
    socket.joinState = { seq: 2, objects: [r('a'), r('b')] };
    jest.advanceTimersByTime(1000);
    expect(socket.joins()).toBe(2);
    expect(sync.exportState()).toEqual({ lastSeq: 2, objects: [r('a'), r('b')] });
  });

  test('duplicate and stale events (seq <= lastSeq) are never applied twice', async () => {
    const { socket, sync } = await readyClient();
    socket.fire('op:applied', evt(1, 'object:add', r('a', 1)));
    socket.fire('op:applied', evt(2, 'object:update', { id: 'a', x: 2 }));
    socket.fire('op:applied', evt(2, 'object:update', { id: 'a', x: 99 })); // duplicate seq
    socket.fire('op:applied', evt(1, 'object:delete', { id: 'a' })); // stale
    expect(sync.confirmed.get('a').x).toBe(2);
    expect(sync.appliedSeqs).toEqual([1, 2]);
  });

  test('an update for an object this client does not have marks divergence and resynchronises', async () => {
    const { socket, sync, events } = await readyClient();
    socket.joinState = { seq: 1, objects: [r('ghost', 7)] };
    socket.fire('op:applied', evt(1, 'object:update', { id: 'ghost', x: 7 }));
    expect(events.find((e) => e.kind === 'resync').data).toEqual({ reason: 'diverged' });
    expect(socket.joins()).toBe(2);
    expect(sync.exportState()).toEqual({ lastSeq: 1, objects: [r('ghost', 7)] });
  });

  test('an add for an id that already exists locally marks divergence and resynchronises', async () => {
    const { socket, sync, events } = await readyClient();
    socket.fire('op:applied', evt(1, 'object:add', r('a')));
    socket.joinState = { seq: 2, objects: [r('a', 5)] };
    socket.fire('op:applied', evt(2, 'object:add', r('a', 5)));
    expect(events.filter((e) => e.kind === 'resync').map((e) => e.data.reason)).toEqual(['diverged']);
    expect(sync.exportState()).toEqual({ lastSeq: 2, objects: [r('a', 5)] });
  });

  test('a delete for a missing object marks divergence and resynchronises', async () => {
    const { socket, events } = await readyClient();
    socket.fire('op:applied', evt(1, 'object:delete', { id: 'nope' }));
    expect(events.filter((e) => e.kind === 'resync').map((e) => e.data.reason)).toEqual(['diverged']);
  });

  test('a malformed board:state is never installed; the client fetches the state again', async () => {
    const { socket, sync, events } = await readyClient();
    socket.fire('op:applied', evt(1, 'object:add', r('a')));
    socket.joinState = { seq: 9, objects: [r('restored')] };
    socket.fire('board:state', { boardId: 'b', seq: -1, objects: [] });
    expect(events.find((e) => e.kind === 'invalid-event').data).toMatchObject({ event: 'board:state', reason: 'invalid seq' });
    expect(events.find((e) => e.kind === 'resync').data).toEqual({ reason: 'invalid-state' });
    expect(sync.exportState()).toEqual({ lastSeq: 9, objects: [r('restored')] });
  });

  test('a join acknowledgement with a malformed state is a join failure, not an installed state', async () => {
    const socket = new ListenerSocket();
    socket.joinAck = { ok: true, role: 'editor', state: { seq: 3, objects: [r('a'), r('a')] }, participants: [] };
    const sync = new SyncClient(socket, 'b');
    const failures = [];
    sync.subscribe((kind, data) => kind === 'join-failed' && failures.push(data));
    await sync.start();
    expect(sync.status).toBe('error');
    expect(sync.lastSeq).toBe(0);
    expect(failures[0]).toMatchObject({ code: 'INTERNAL' });
    expect(failures[0].message).toMatch(/duplicate object id/);
  });

  test('sequencedEventProblem and stateProblem accept well-formed input', () => {
    expect(sequencedEventProblem(evt(1, 'object:add', r('a')), 'b')).toBeNull();
    expect(sequencedEventProblem(evt(5, 'board:clear', {}), 'b')).toBeNull();
    expect(sequencedEventProblem(evt(5, 'object:delete', { id: 'a' }), 'b')).toBeNull();
    expect(stateProblem({ seq: 0, objects: [] })).toBeNull();
    expect(stateProblem({ seq: 3, objects: [r('a'), r('b')] })).toBeNull();
    expect(stateProblem({ seq: 3 })).toBe('objects is not an array');
    expect(stateProblem({ seq: 3, objects: [{ id: 'x', kind: 'blob' }] })).toBe('invalid object');
  });
});
