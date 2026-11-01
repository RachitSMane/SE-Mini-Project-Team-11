// COMP-02 Client Sync Module (SAD §4.1.3, §4.1.4).
// Keeps `confirmed` (server state up to lastSeq), `pending` (own unacknowledged operations) and
// `buffer` (out-of-order events). Used unchanged by the browser client and by the scripted
// clients of the integration tests and the latency harness, as required by SRS §5 (D7b).
import { applyOperation, canonicalState, KINDS, OP_TYPES } from './objects.js';

export const SYNC_DEFAULTS = Object.freeze({
  ackTimeoutMs: 10_000, // D6b
  gapTimeoutMs: 1_000, // D6b
  maxBuffer: 100, // D6b
  // Socket.IO never retries a connection that the server closed ('io server disconnect'); the
  // sync module then reconnects once itself after this delay (same as reconnectionDelay, D6b).
  reconnectOnServerDisconnect: true,
  serverReconnectDelayMs: 500,
});

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isSeq = (v, min) => Number.isSafeInteger(v) && v >= min;

/**
 * Structural check of an incoming sequenced event (`op:applied`, API-01). Returns null when the
 * event is well formed, otherwise a short reason. The server validates every operation before it
 * is sequenced; this guards the client state against malformed or foreign events.
 */
export function sequencedEventProblem(evt, boardId) {
  if (!isPlainObject(evt)) return 'not an object';
  if (evt.boardId !== boardId) return 'other board';
  if (!isSeq(evt.seq, 1)) return 'invalid seq';
  if (!OP_TYPES.includes(evt.type)) return 'unknown type';
  if (!isPlainObject(evt.payload)) return 'invalid payload';
  if (evt.type !== 'board:clear' && typeof evt.payload.id !== 'string') return 'missing object id';
  if (evt.type === 'object:add' && !KINDS.includes(evt.payload.kind)) return 'unknown kind';
  return null;
}

/** Structural check of a full board state (join acknowledgement, `board:state`). */
export function stateProblem(state) {
  if (!isPlainObject(state)) return 'not an object';
  if (!isSeq(state.seq, 0)) return 'invalid seq';
  if (!Array.isArray(state.objects)) return 'objects is not an array';
  const ids = new Set();
  for (const o of state.objects) {
    if (!isPlainObject(o) || typeof o.id !== 'string' || !KINDS.includes(o.kind)) return 'invalid object';
    if (ids.has(o.id)) return 'duplicate object id';
    ids.add(o.id);
  }
  return null;
}

let opCounter = 0;
function newClientOpId() {
  opCounter += 1;
  const rand = Math.random().toString(36).slice(2, 10);
  return `c${Date.now().toString(36)}${opCounter.toString(36)}${rand}`;
}

export class SyncClient {
  /**
   * @param {object} socket  socket.io-client socket of namespace /board (or a compatible object)
   * @param {string} boardId
   * @param {object} [opts]
   */
  constructor(socket, boardId, opts = {}) {
    this.socket = socket;
    this.boardId = boardId;
    this.opts = { ...SYNC_DEFAULTS, ...opts };
    this.confirmed = new Map();
    this.lastSeq = 0;
    this.pending = [];
    this.buffer = new Map();
    this.appliedSeqs = [];
    this.keepAppliedLog = opts.keepAppliedLog ?? true;
    this.status = socket.connected ? 'joining' : 'connecting';
    this.role = null;
    this.participants = [];
    this.listeners = new Set();
    this.gapTimer = null;
    this.reconnectTimer = null;
    this.diverged = false;
    this.viewCache = null;
    this.hasJoinedOnce = false;
    this.closed = false;
    this.handlers = {
      connect: () => {
        this.clearReconnectTimer();
        this.join({ reconnect: this.hasJoinedOnce });
      },
      disconnect: (reason) => this.onDisconnect(reason),
      'op:applied': (evt) => this.receiveRemote(evt),
      'board:state': (evt) => this.receiveState(evt),
      'presence:update': (evt) => this.receivePresence(evt),
      'role:changed': (evt) => this.receiveRole(evt),
      'access:revoked': (evt) => this.receiveRevoked(evt),
      'version:created': (evt) => this.emitEvent('version:created', evt),
      'version:restored': (evt) => this.emitEvent('version:restored', evt),
    };
    for (const [event, handler] of Object.entries(this.handlers)) socket.on(event, handler);
  }

  /** Subscribe to state changes and notices. Returns an unsubscribe function. */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitEvent(kind, data) {
    for (const l of this.listeners) l(kind, data, this);
  }

  changed() {
    this.viewCache = null;
    this.emitEvent('change', null);
  }

  /** Start: join immediately if connected, otherwise on the first `connect` event. */
  start() {
    if (this.socket.connected) return this.join({ reconnect: false });
    return new Promise((resolve) => {
      const unsub = this.subscribe((kind) => {
        if (kind === 'ready' || kind === 'join-failed') {
          unsub();
          resolve();
        }
      });
    });
  }

  /** Emit board:join and replace confirmed state (initial join, gap repair or reconnection). */
  join({ reconnect = false, gapRepair = false } = {}) {
    if (this.closed) return Promise.resolve();
    if (!gapRepair) {
      this.status = 'joining';
      this.changed();
    }
    return new Promise((resolve) => {
      this.socket.emit('board:join', { boardId: this.boardId }, (ack) => {
        if (this.closed) {
          resolve(ack);
          return;
        }
        const problem = ack?.ok ? stateProblem(ack.state) : null;
        if (!ack || !ack.ok || problem) {
          this.status = 'error';
          const error = problem ? { code: 'INTERNAL', message: `Invalid board state received (${problem}).` } : ack?.error;
          this.emitEvent('join-failed', error || { code: 'INTERNAL', message: 'Join failed' });
          this.changed();
          resolve(ack);
          return;
        }
        this.replaceConfirmed(ack.state);
        this.role = ack.role;
        this.participants = ack.participants || [];
        const discarded = reconnect && !gapRepair && this.pending.length > 0;
        if (reconnect && !gapRepair) this.discardPending();
        this.hasJoinedOnce = true;
        this.status = 'ready';
        this.changed();
        if (discarded) {
          this.emitEvent('notice', {
            code: 'UNCONFIRMED_DISCARDED',
            message: 'Recent unconfirmed changes may not have been saved.',
          });
        }
        this.emitEvent('ready', { reconnect, gapRepair });
        resolve(ack);
      });
    });
  }

  replaceConfirmed(state) {
    this.confirmed = new Map(state.objects.map((o) => [o.id, o]));
    this.lastSeq = state.seq;
    this.buffer.clear();
    this.clearGapTimer();
    this.diverged = false;
  }

  discardPending() {
    for (const p of this.pending) clearTimeout(p.timer);
    this.pending = [];
  }

  /** Submit an operation optimistically. Returns the clientOpId, or null if editing is unavailable. */
  submit(type, payload) {
    if (this.status !== 'ready' || this.closed) return null;
    const clientOpId = newClientOpId();
    const entry = { clientOpId, type, payload, submittedAt: now() };
    entry.timer = setTimeout(() => this.onAckTimeout(entry), this.opts.ackTimeoutMs);
    this.pending.push(entry);
    this.changed();
    this.emitEvent('submitted', entry);
    this.socket.emit('op:submit', { boardId: this.boardId, clientOpId, type, payload }, (ack) =>
      this.receiveAck(entry, ack),
    );
    return clientOpId;
  }

  receiveAck(entry, ack) {
    clearTimeout(entry.timer);
    if (!this.pending.includes(entry)) return; // discarded by a resynchronisation
    if (ack && ack.ok) {
      if (ack.seq === null || ack.noop) {
        this.removePending(entry);
        this.changed();
        this.emitEvent('ack', { entry, ack });
        return;
      }
      this.emitEvent('ack', { entry, ack });
      this.receiveSequenced({
        seq: ack.seq,
        type: entry.type,
        payload: entry.payload,
        clientOpId: entry.clientOpId,
        own: true,
        entry,
      });
      return;
    }
    // Rejection: remove the local effect and tell the user (FR-026).
    this.removePending(entry);
    this.changed();
    this.emitEvent('rejected', { entry, error: ack?.error || { code: 'INTERNAL', message: 'Rejected' } });
  }

  removePending(entry) {
    const i = this.pending.indexOf(entry);
    if (i >= 0) this.pending.splice(i, 1);
  }

  /**
   * `op:applied` from another participant. Events for another board are ignored; malformed
   * events are ignored and reported ('invalid-event'). If an ignored event was the next one in
   * sequence, the resulting gap is repaired by the usual gap timer (rule 4).
   */
  receiveRemote(evt) {
    const problem = sequencedEventProblem(evt, this.boardId);
    if (problem) {
      if (problem !== 'other board') this.emitEvent('invalid-event', { event: 'op:applied', reason: problem, seq: evt?.seq });
      return;
    }
    this.receiveSequenced({ ...evt, own: false });
  }

  /** Rules 2–4 of SAD §4.1.3. */
  receiveSequenced(evt) {
    if (this.status !== 'ready' && !evt.own) {
      // Events arriving before the join acknowledgement are covered by the joined state.
      if (this.status === 'joining') return;
    }
    if (evt.seq <= this.lastSeq) {
      if (evt.own && evt.entry) this.removePending(evt.entry);
      this.changed();
      return;
    }
    if (evt.seq === this.lastSeq + 1) {
      this.applySequenced(evt);
      while (this.buffer.has(this.lastSeq + 1)) {
        const next = this.buffer.get(this.lastSeq + 1);
        this.buffer.delete(this.lastSeq + 1);
        this.applySequenced(next);
      }
      if (this.buffer.size === 0) this.clearGapTimer();
      this.changed();
      if (this.diverged) this.resync('diverged');
      return;
    }
    this.buffer.set(evt.seq, evt);
    if (this.buffer.size > this.opts.maxBuffer) {
      this.resync('buffer');
    } else if (!this.gapTimer) {
      this.gapTimer = setTimeout(() => this.resync('gap'), this.opts.gapTimeoutMs);
    }
  }

  applySequenced(evt) {
    // The server only sequences an add for a new id and an update or delete for an existing
    // object. If that does not hold locally, this copy has diverged from the server's state:
    // apply what can be applied, then replace the state with a resynchronising join.
    const { type, payload } = evt;
    if (type === 'object:add' && this.confirmed.has(payload.id)) this.diverged = true;
    if (!applyOperation(this.confirmed, type, payload)) this.diverged = true;
    this.lastSeq = evt.seq;
    if (this.keepAppliedLog) this.appliedSeqs.push(evt.seq);
    if (evt.own && evt.entry) this.removePending(evt.entry);
    this.emitEvent('applied', evt);
  }

  clearGapTimer() {
    if (this.gapTimer) clearTimeout(this.gapTimer);
    this.gapTimer = null;
  }

  resync(reason) {
    this.clearGapTimer();
    this.diverged = false;
    this.emitEvent('resync', { reason });
    return this.join({ reconnect: false, gapRepair: true });
  }

  /** board:state after a restore (FR-034): replace confirmed, keep pending. */
  receiveState(evt) {
    if (!isPlainObject(evt) || evt.boardId !== this.boardId) return;
    const problem = stateProblem(evt);
    if (problem) {
      // Never install a malformed state; fetch the authoritative one instead.
      this.emitEvent('invalid-event', { event: 'board:state', reason: problem });
      if (this.status === 'ready') this.resync('invalid-state');
      return;
    }
    this.replaceConfirmed(evt);
    this.changed();
    this.emitEvent('state-replaced', evt);
  }

  receivePresence(evt) {
    if (evt.boardId !== this.boardId) return;
    this.participants = evt.participants;
    this.emitEvent('presence', evt.participants);
  }

  receiveRole(evt) {
    if (evt.boardId !== this.boardId) return;
    this.role = evt.role;
    this.changed();
    this.emitEvent('role', evt.role);
  }

  receiveRevoked(evt) {
    if (evt.boardId !== this.boardId) return;
    this.status = 'revoked';
    this.closed = true;
    this.discardPending();
    this.changed();
    this.emitEvent('revoked', evt);
  }

  onAckTimeout(entry) {
    if (!this.pending.includes(entry)) return;
    // No acknowledgement within 10 s: treat the connection as unhealthy (rule 6).
    this.emitEvent('ack-timeout', entry);
    this.socket.disconnect();
    if (!this.closed) setTimeout(() => this.socket.connect(), 0);
  }

  onDisconnect(reason) {
    this.clearGapTimer();
    if (this.closed) return;
    this.status = 'disconnected';
    for (const p of this.pending) clearTimeout(p.timer);
    this.changed();
    this.emitEvent('disconnected', reason);
    // Access revocations close the client first (access:revoked), so a server-initiated close that
    // gets here is typically an expired token. Socket.IO does not retry these; reconnect once:
    // either the connection is accepted again, or the handshake fails with UNAUTHENTICATED
    // (connect_error), which the application turns into a new login or a return to the guest page.
    if (reason === 'io server disconnect' && this.opts.reconnectOnServerDisconnect) this.scheduleReconnect();
  }

  scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed && !this.socket.connected) {
        this.emitEvent('reconnecting', { reason: 'io server disconnect' });
        this.socket.connect();
      }
    }, this.opts.serverReconnectDelayMs);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  /** Rendered view: confirmed state with pending operations applied on top (optimistic). */
  getView() {
    if (this.viewCache) return this.viewCache;
    if (this.pending.length === 0) {
      this.viewCache = this.confirmed;
      return this.viewCache;
    }
    const view = new Map(this.confirmed);
    for (const p of this.pending) applyOperation(view, p.type, p.payload);
    this.viewCache = view;
    return view;
  }

  /** Test hook data (SAD §4.1.6 exportState). */
  exportState() {
    return { lastSeq: this.lastSeq, objects: canonicalState(this.confirmed) };
  }

  /** Stops the client and removes every socket listener it registered (no duplicates on re-use). */
  close() {
    this.closed = true;
    this.clearGapTimer();
    this.clearReconnectTimer();
    this.discardPending();
    for (const [event, handler] of Object.entries(this.handlers)) this.socket.off(event, handler);
  }
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
