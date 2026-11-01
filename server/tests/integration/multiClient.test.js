// Real-time synchronisation across multiple simultaneous clients (issue #22), connection
// lifecycle against the real server (issue #18) and server-side consistency / validation of
// synchronisation input (issue #24). Every client is a scripted Socket.IO client running the same
// COMP-02 sync module as the browser; convergence is checked against a fresh join (the server's
// authoritative state) and against MongoDB.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  connectSocket,
  emitAck,
  rect,
  scriptedClient,
  startTestServer,
  stroke,
  TEST_JWT_SECRET,
  text,
  waitEvent,
  waitFor,
} from '../helpers/harness.js';
import { apiClient, freshJoin, onceKind } from '../helpers/api.js';
import { Board, BoardObject } from '../../src/db/models.js';

let srv;
let c;
let open = [];
// A fresh server (and database) per test: every test is independent, and the share-link resolve
// limit (30 per minute per IP, API-02) is not exhausted by the five-client set-up.
beforeEach(async () => {
  srv = await startTestServer();
  c = apiClient(srv);
});
afterEach(async () => {
  for (const x of open) x.close();
  open = [];
  await srv.stop();
});

async function join(token, boardId, opts) {
  const sc = await scriptedClient(srv.url, token, boardId, opts);
  open.push(sc);
  return sc;
}

/** Owner, two Editors, a Viewer and a guest Editor (share link) joined to one new board. */
async function team() {
  const O = await c.register('Owner');
  const E1 = await c.register('Editor One');
  const E2 = await c.register('Editor Two');
  const V = await c.register('Viewer');
  const boardId = await c.createBoard(O.token, 'Multi-client board');
  await c.addMember(O.token, boardId, E1.token, 'editor');
  await c.addMember(O.token, boardId, E2.token, 'editor');
  await c.addMember(O.token, boardId, V.token, 'viewer');
  const link = await c.link(O.token, boardId, 'editor');
  const G = await c.guest(link.token, 'Guest Editor');
  const clients = {
    o: await join(O.token, boardId),
    e1: await join(E1.token, boardId),
    e2: await join(E2.token, boardId),
    v: await join(V.token, boardId),
    g: await join(G.token, boardId),
  };
  return { O, E1, E2, V, G, boardId, clients, all: Object.values(clients) };
}

/** Every client reaches the server's seq and holds exactly the server's state (and MongoDB's). */
async function expectConverged(boardId, token, clients) {
  const fresh = await freshJoin(srv.url, token, boardId);
  try {
    await waitFor(() => clients.every((x) => x.sync.lastSeq === fresh.lastSeq && x.sync.pending.length === 0), {
      timeout: 10_000,
      message: `all clients at seq ${fresh.lastSeq}`,
    });
    for (const x of clients) expect(x.sync.exportState()).toEqual({ lastSeq: fresh.lastSeq, objects: fresh.objects });
    const board = await Board.findById(boardId).lean();
    expect(board.seq).toBe(fresh.lastSeq);
    expect(await BoardObject.countDocuments({ boardId })).toBe(fresh.objects.length);
    return fresh;
  } finally {
    fresh.close();
  }
}

function expectContiguous(seqs) {
  for (let i = 1; i < seqs.length; i += 1) expect(seqs[i]).toBe(seqs[i - 1] + 1);
}

/** Counts raw op:applied events delivered to a client's socket. */
function countApplied(sc) {
  const seen = [];
  sc.socket.on('op:applied', (evt) => seen.push(evt));
  return seen;
}

// ---------------------------------------------------------------------------------------------
describe('synchronisation across five simultaneous clients', () => {
  test('create, move, restyle and delete by different clients reach every other client without reloading', async () => {
    const { O, boardId, clients, all } = await team();
    const received = Object.fromEntries(Object.entries(clients).map(([k, sc]) => [k, countApplied(sc)]));

    const shape = rect();
    const note = text('Agenda');
    const line = stroke(30);
    expect((await clients.e1.submitAck('object:add', shape)).ok).toBe(true); // create
    expect((await clients.g.submitAck('object:add', note)).ok).toBe(true); // guest editor creates
    expect((await clients.o.submitAck('object:add', line)).ok).toBe(true);
    expect((await clients.e2.submitAck('object:update', { id: shape.id, x: 400, y: 250 })).ok).toBe(true); // move
    expect((await clients.e1.submitAck('object:update', { id: note.id, color: '#D32F2F', text: 'Agenda v2' })).ok).toBe(true); // restyle/edit
    expect((await clients.g.submitAck('object:delete', { id: line.id })).ok).toBe(true); // delete

    const fresh = await expectConverged(boardId, O.token, all);
    const byId = new Map(fresh.objects.map((x) => [x.id, x]));
    expect(byId.get(shape.id)).toMatchObject({ x: 400, y: 250 });
    expect(byId.get(note.id)).toMatchObject({ color: '#D32F2F', text: 'Agenda v2' });
    expect(byId.has(line.id)).toBe(false);

    // Each client received exactly the operations of the others (its own arrive as acknowledgements).
    const submitted = { e1: 2, g: 2, o: 1, e2: 1, v: 0 };
    for (const [k, n] of Object.entries(submitted)) expect(received[k]).toHaveLength(6 - n);
    // Every client applied the same sequence in the same order.
    for (const x of all) expect(x.sync.appliedSeqs).toEqual(clients.o.sync.appliedSeqs);
  });

  test('the Viewer receives every change but its own edits are refused and never broadcast', async () => {
    const { O, boardId, clients, all } = await team();
    const seenByOwner = countApplied(clients.o);
    const ack = await clients.v.submitAck('object:add', rect());
    expect(ack).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    await clients.e1.submitAck('object:add', rect());
    await expectConverged(boardId, O.token, all);
    expect(seenByOwner).toHaveLength(1);
  });

  test('simultaneous bursts from three editors are sequenced once, without gaps, identically everywhere', async () => {
    const { O, boardId, clients, all } = await team();
    const writers = [clients.e1, clients.e2, clients.g];
    const PER_CLIENT = 15; // below the 30 operations/s limit of one connection (SEC-REQ-006)
    const acks = await Promise.all(
      writers.flatMap((w) => Array.from({ length: PER_CLIENT }, (_, i) => w.submitAck('object:add', rect({ x: i })))),
    );
    expect(acks.every((a) => a.ok)).toBe(true);
    const seqs = acks.map((a) => a.seq).sort((a, b) => a - b);
    expect(new Set(seqs).size).toBe(seqs.length); // unique
    expectContiguous(seqs); // no gaps

    const fresh = await expectConverged(boardId, O.token, all);
    expect(fresh.objects).toHaveLength(writers.length * PER_CLIENT);
    for (const x of all) {
      expect(x.sync.appliedSeqs).toEqual(clients.v.sync.appliedSeqs);
      expectContiguous(x.sync.appliedSeqs);
    }
  });

  test('simultaneous edits of the same object: the highest sequence number wins on every client', async () => {
    const { O, boardId, clients, all } = await team();
    const Z = rect();
    await clients.o.submitAck('object:add', Z);
    const writers = [clients.e1, clients.e2, clients.g];
    const colours = ['#1E88E5', '#FB8C00', '#43A047'];
    for (let round = 0; round < 10; round += 1) {
      const acks = await Promise.all(writers.map((w, i) => w.submitAck('object:update', { id: Z.id, color: colours[i], x: round * 10 + i })));
      expect(acks.every((a) => a.ok)).toBe(true);
      const winner = acks.indexOf(acks.reduce((best, a) => (a.seq > best.seq ? a : best)));
      const fresh = await expectConverged(boardId, O.token, all);
      expect(fresh.objects.find((x) => x.id === Z.id)).toMatchObject({ color: colours[winner], x: round * 10 + winner });
      await new Promise((res) => setTimeout(res, 40));
    }
  }, 60_000);

  test('a delete racing with updates leaves no client holding the deleted object', async () => {
    const { O, boardId, clients, all } = await team();
    const Z = rect();
    await clients.e1.submitAck('object:add', Z);
    const [u1, del, u2] = await Promise.all([
      clients.e2.submitAck('object:update', { id: Z.id, x: 1 }),
      clients.e1.submitAck('object:delete', { id: Z.id }),
      clients.g.submitAck('object:update', { id: Z.id, y: 2 }),
    ]);
    expect(del.ok).toBe(true);
    for (const u of [u1, u2]) {
      // Either sequenced before the delete, or refused because the object is gone.
      if (u.ok) expect(u.seq).toBeLessThan(del.seq);
      else expect(u.error.code).toBe('OBJECT_NOT_FOUND');
    }
    const fresh = await expectConverged(boardId, O.token, all);
    expect(fresh.objects.find((x) => x.id === Z.id)).toBeUndefined();
  });

  test('a client joining in the middle of a burst ends with the same state as everyone else', async () => {
    const { O, boardId, clients, all } = await team();
    const L = await c.register('Late');
    await c.addMember(O.token, boardId, L.token, 'viewer');
    const burst = Promise.all(Array.from({ length: 20 }, (_, i) => clients.e1.submitAck('object:add', rect({ x: i }))));
    const late = await join(L.token, boardId); // joins while operations are being sequenced
    expect((await burst).every((a) => a.ok)).toBe(true);
    await expectConverged(boardId, O.token, [...all, late]);
  });

  test('a board clear by the Owner empties the board on every client', async () => {
    const { O, boardId, clients, all } = await team();
    for (let i = 0; i < 5; i += 1) await clients.e2.submitAck('object:add', rect());
    expect((await clients.o.submitAck('board:clear', {})).ok).toBe(true);
    const fresh = await expectConverged(boardId, O.token, all);
    expect(fresh.objects).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('connection and disconnection scenarios', () => {
  test('presence: other clients see a participant leave and come back', async () => {
    const { boardId, clients, E2, O } = await team();
    const names = (sc) => sc.sync.participants.map((p) => p.displayName).sort();
    expect(names(clients.o)).toEqual(['Editor One', 'Editor Two', 'Guest Editor', 'Owner', 'Viewer']);
    clients.e2.close();
    await waitFor(() => !names(clients.o).includes('Editor Two'), { message: 'presence after leave' });
    const back = await join(E2.token, boardId);
    await waitFor(() => names(clients.o).includes('Editor Two'), { message: 'presence after rejoin' });
    await expectConverged(boardId, O.token, [clients.o, back]);
  });

  test('a dropped connection reconnects automatically and catches up with changes made meanwhile', async () => {
    const { O, boardId, clients, all } = await team();
    const { e2 } = clients;
    const disconnected = onceKind(e2, 'disconnected');
    e2.socket.io.engine.transport.ws.close(); // network drop: the WebSocket closes unexpectedly
    expect(await disconnected).toBe('transport close');
    expect(e2.sync.submit('object:add', rect())).toBeNull(); // editing disabled while disconnected

    // Changes by others during the outage.
    const moved = rect();
    await clients.e1.submitAck('object:add', moved);
    await clients.g.submitAck('object:update', { id: moved.id, x: 999 });

    await waitFor(() => e2.sync.status === 'ready', { timeout: 10_000, message: 'automatic reconnection' });
    const fresh = await expectConverged(boardId, O.token, all);
    expect(fresh.objects.find((x) => x.id === moved.id).x).toBe(999);

    // The reconnected client can edit again and others receive it.
    const after = rect();
    expect((await e2.submitAck('object:add', after)).ok).toBe(true);
    await expectConverged(boardId, O.token, all);
  });

  test('repeated drop/reconnect cycles do not duplicate listeners or events', async () => {
    const { O, boardId, clients, all } = await team();
    const { e2 } = clients;
    for (let i = 0; i < 3; i += 1) {
      const dropped = onceKind(e2, 'disconnected');
      e2.socket.io.engine.transport.ws.close();
      await dropped;
      await waitFor(() => e2.sync.status === 'ready', { timeout: 10_000, message: `reconnection ${i + 1}` });
    }
    expect(e2.socket.listeners('op:applied')).toHaveLength(1);
    const received = countApplied(e2);
    await clients.e1.submitAck('object:add', rect());
    await expectConverged(boardId, O.token, all);
    expect(received).toHaveLength(1); // one event, not one per reconnection
    expect(e2.sync.appliedSeqs.filter((s, i, a) => a.indexOf(s) !== i)).toEqual([]); // no seq applied twice
  });

  test('a server-initiated disconnect is recovered by the sync module (Socket.IO alone would not retry)', async () => {
    const { O, boardId, clients, all } = await team();
    const { e1 } = clients;
    const reconnecting = onceKind(e1, 'reconnecting');
    const disconnected = onceKind(e1, 'disconnected');
    srv.io.of('/board').sockets.get(e1.socket.id).disconnect(true);
    expect(await disconnected).toBe('io server disconnect');
    await clients.e2.submitAck('object:add', rect()); // a change while e1 is away
    await reconnecting;
    await waitFor(() => e1.sync.status === 'ready', { timeout: 10_000, message: 'reconnection after server close' });
    await expectConverged(boardId, O.token, all);
    expect((await e1.submitAck('object:add', rect())).ok).toBe(true);
    await expectConverged(boardId, O.token, all);
  });

  test('a session that expires on an open socket ends in UNAUTHENTICATED instead of a silent retry loop', async () => {
    const U = await c.register('Expiring');
    const boardId = await c.createBoard(U.token);
    const exp = Math.floor(Date.now() / 1000) + 2;
    const short = jwt.sign({ typ: 'session', jti: crypto.randomUUID(), sub: U.id, exp }, TEST_JWT_SECRET, { algorithm: 'HS256' });
    const sc = await join(short, boardId);
    const unauthenticated = new Promise((resolve) => {
      sc.socket.on('connect_error', (err) => {
        if (err?.data?.code === 'UNAUTHENTICATED') {
          sc.close(); // what the browser does: stop retrying and ask for a new login
          resolve(err.data.code);
        }
      });
    });
    expect(await onceKind(sc, 'disconnected')).toBe('io server disconnect'); // closed by the expiry check
    expect(await unauthenticated).toBe('UNAUTHENTICATED'); // the one retry is refused at the handshake
    expect(sc.socket.connected).toBe(false);
  }, 20_000);
});

// ---------------------------------------------------------------------------------------------
describe('server-side consistency and validation of synchronisation input', () => {
  async function rawJoined(token, boardId) {
    const s = connectSocket(srv.url, token, { reconnection: false });
    await waitEvent(s, 'connect');
    const ack = await emitAck(s, 'board:join', { boardId });
    expect(ack.ok).toBe(true);
    open.push({ close: () => s.close() });
    return s;
  }
  const op = (boardId, type, payload, clientOpId = crypto.randomUUID().slice(0, 32)) => ({ boardId, clientOpId, type, payload });

  test('a duplicated submission is applied at most once and never corrupts other clients', async () => {
    const { O, E1, boardId, clients, all } = await team();
    const s = await rawJoined(E1.token, boardId);
    const seenByOwner = countApplied(clients.o);

    const obj = rect();
    const add = op(boardId, 'object:add', obj);
    const [first, again] = [await emitAck(s, 'op:submit', add), await emitAck(s, 'op:submit', add)];
    expect(first).toMatchObject({ ok: true, clientOpId: add.clientOpId });
    expect(again).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } }); // id already exists

    const upd = op(boardId, 'object:update', { id: obj.id, x: 77 });
    const [u1, u2] = [await emitAck(s, 'op:submit', upd), await emitAck(s, 'op:submit', upd)];
    expect(u1.ok && u2.ok).toBe(true); // an update carries complete values: repeating it is idempotent

    const del = op(boardId, 'object:delete', { id: obj.id });
    const [d1, d2] = [await emitAck(s, 'op:submit', del), await emitAck(s, 'op:submit', del)];
    expect(d1.ok).toBe(true);
    expect(d2).toMatchObject({ ok: false, error: { code: 'OBJECT_NOT_FOUND' } });

    await expectConverged(boardId, O.token, all);
    // Only the accepted operations were broadcast: 1 add + 2 updates + 1 delete.
    expect(seenByOwner.map((e) => e.type)).toEqual(['object:add', 'object:update', 'object:update', 'object:delete']);
    expect(await BoardObject.countDocuments({ boardId })).toBe(0);
  });

  test.each([
    ['a forged sequence number', (b) => ({ ...op(b, 'object:add', rect()), seq: 1 })],
    ['an unknown operation type', (b) => op(b, 'object:move', { id: 'x' })],
    ['a non-object payload', (b) => ({ ...op(b, 'object:add', rect()), payload: 'rect' })],
    ['a missing clientOpId', (b) => { const m = op(b, 'object:add', rect()); delete m.clientOpId; return m; }],
    ['an object with an invalid colour', (b) => op(b, 'object:add', rect({ color: 'red' }))],
    ['an object with extra properties', (b) => op(b, 'object:add', { ...rect(), owner: 'me' })],
    ['a clear with a payload', (b) => op(b, 'board:clear', { all: true })],
  ])('%s is rejected and changes nothing for anyone', async (_name, make) => {
    const { O, boardId, clients, all } = await team();
    const s = await rawJoined(O.token, boardId);
    await clients.e1.submitAck('object:add', rect());
    const before = await Board.findById(boardId).lean();
    const seenByEditor = countApplied(clients.e2);
    const ack = await emitAck(s, 'op:submit', make(boardId));
    expect(ack).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    await new Promise((res) => setTimeout(res, 100));
    expect(seenByEditor).toHaveLength(0);
    expect((await Board.findById(boardId).lean()).seq).toBe(before.seq);
    await expectConverged(boardId, O.token, all);
  });

  test('an update that would change an object kind, or targets a missing object, is refused', async () => {
    const { O, boardId, clients, all } = await team();
    const R = rect();
    await clients.e1.submitAck('object:add', R);
    expect(await clients.e2.submitAck('object:update', { id: R.id, kind: 'ellipse' })).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    expect(await clients.e2.submitAck('object:update', { id: R.id, x1: 5 })).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    expect(await clients.e2.submitAck('object:update', { id: 'missing_1', x: 5 })).toMatchObject({ ok: false, error: { code: 'OBJECT_NOT_FOUND' } });
    const fresh = await expectConverged(boardId, O.token, all);
    expect(fresh.objects.find((x) => x.id === R.id).kind).toBe('rect');
  });

  test('joining the same board twice on one connection neither duplicates presence nor events', async () => {
    const { O, boardId, clients, all } = await team();
    const { e1 } = clients;
    const again = await emitAck(e1.socket, 'board:join', { boardId });
    expect(again.ok).toBe(true);
    expect(again.participants.filter((p) => p.displayName === 'Editor One')).toHaveLength(1);
    const received = countApplied(e1);
    await clients.e2.submitAck('object:add', rect());
    await expectConverged(boardId, O.token, all);
    expect(received).toHaveLength(1);
  });

  test('an operation for a board the connection has not joined is refused and not broadcast there', async () => {
    const { O, boardId, clients } = await team();
    const other = await c.createBoard(O.token, 'Other board');
    const seen = countApplied(clients.e1);
    const ack = await emitAck(clients.o.socket, 'op:submit', op(other, 'object:add', rect()));
    expect(ack).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    await new Promise((res) => setTimeout(res, 100));
    expect(seen).toHaveLength(0);
    expect(await BoardObject.countDocuments({ boardId: other })).toBe(0);
    expect(await BoardObject.countDocuments({ boardId })).toBe(0);
  });
});
