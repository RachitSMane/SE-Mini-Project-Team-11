// COMP-02 Client Sync Module (SAD §4.1.3, §4.1.4).
// Keeps `confirmed` (server state up to lastSeq), `pending` (own unacknowledged operations) and
// `buffer` (out-of-order events). Used unchanged by the browser client and by the scripted
// clients of the integration tests and the latency harness, as required by SRS §5 (D7b).
import { applyOperation, canonicalState } from './objects.js';

export const SYNC_DEFAULTS = Object.freeze({
  ackTimeoutMs: 10_000, // D6b
  gapTimeoutMs: 1_000, // D6b
  maxBuffer: 100, // D6b
});

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
    this.viewCache = null;
    this.hasJoinedOnce = false;
    this.closed = false;
    this.handlers = {
      connect: () => this.join({ reconnect: this.hasJoinedOnce }),
      disconnect: (reason) => this.onDisconnect(reason),
      'op:applied': (evt) => this.receiveSequenced({ ...evt, own: false }),
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
        if (!ack || !ack.ok) {
          this.status = 'error';
          this.emitEvent('join-failed', ack?.error || { code: 'INTERNAL', message: 'Join failed' });
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
    applyOperation(this.confirmed, evt.type, evt.payload);
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
    this.emitEvent('resync', { reason });
    return this.join({ reconnect: false, gapRepair: true });
  }

  /** board:state after a restore (FR-034): replace confirmed, keep pending. */
  receiveState(evt) {
    if (evt.boardId !== this.boardId) return;
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

  close() {
    this.closed = true;
    this.clearGapTimer();
    this.discardPending();
    for (const [event, handler] of Object.entries(this.handlers)) this.socket.off(event, handler);
  }
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
