// COMP-06 Real-time Collaboration Server (API-01): namespace /board, one room per board,
// connection authentication, per-connection rate limit, presence, access-change propagation.
import crypto from 'node:crypto';
import { LIMITS } from '@wb/shared/objects';
import { AppError, errorBody } from '../errors.js';
import { logger, metrics } from '../logger.js';
import { ACTIONS } from '../access/policy.js';
import { validateEnvelope, validateJoin } from '../validation.js';

const room = (boardId) => `board:${boardId}`;

/** Sliding one-second window: at most 30 operations in any second per connection (SEC-REQ-006). */
export class OpRateLimiter {
  constructor(max = LIMITS.OPS_PER_SECOND, windowMs = 1000, now = () => performance.now()) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.times = [];
  }

  allow() {
    const t = this.now();
    while (this.times.length && this.times[0] <= t - this.windowMs) this.times.shift();
    if (this.times.length >= this.max) return false;
    this.times.push(t);
    return true;
  }
}

export class RealtimeServer {
  constructor({ io, config, auth, access, engine, versions, store, queues }) {
    Object.assign(this, { io, config, auth, access, engine, versions, store, queues });
    this.nsp = io.of('/board');
    this.participants = new Map(); // boardId -> Map(socketId -> participant)
    this.timers = new Map(); // boardId -> periodic version timer
    access.realtime = this;
    versions.realtime = this;
    this.nsp.use((socket, next) => this.authenticate(socket, next));
    this.nsp.on('connection', (socket) => this.onConnection(socket));
    // Guest links that expire disconnect their guests within 5 s (FR-048); checked every second.
    this.expiryTimer = setInterval(() => this.checkExpiry(), 1000);
    this.expiryTimer.unref?.();
  }

  async authenticate(socket, next) {
    try {
      const actor = await this.auth.verifyToken(socket.handshake.auth?.token);
      // A guest token is only as valid as its link: refuse the connection once the link is
      // revoked or expired or the board is gone (FR-047, FR-048, TC-103 step 6).
      if (actor.type === 'guest' && !(await this.access.resolveRole(actor, actor.boardId)).role) {
        throw new AppError('UNAUTHENTICATED');
      }
      socket.data.actor = actor;
      next();
    } catch {
      logger.security({
        event: 'auth.token_rejected',
        requestId: crypto.randomUUID(),
        socketId: socket.id,
        outcome: 'rejected',
        reason: 'UNAUTHENTICATED',
      });
      const err = new Error('UNAUTHENTICATED');
      err.data = { code: 'UNAUTHENTICATED' };
      next(err);
    }
  }

  onConnection(socket) {
    socket.data.boards = new Set();
    socket.data.limiter = new OpRateLimiter();
    metrics.inc('socket_connections_total');
    socket.on('board:join', (msg, ack) => this.onJoin(socket, msg, ack));
    socket.on('board:leave', (msg, ack) => this.onLeave(socket, msg, ack));
    socket.on('op:submit', (msg, ack) => this.onSubmit(socket, msg, ack));
    socket.on('disconnect', () => {
      for (const boardId of socket.data.boards) this.removeParticipant(boardId, socket);
    });
  }

  ctx(socket) {
    return { requestId: crypto.randomUUID(), socketId: socket.id };
  }

  async onJoin(socket, msg, ack) {
    if (typeof ack !== 'function') return;
    const ctx = this.ctx(socket);
    try {
      validateJoin(msg);
      const { boardId } = msg;
      const actor = socket.data.actor;
      const result = await this.queues.run(boardId, async () => {
        if (!(await this.auth.stillValid(actor))) throw new AppError('UNAUTHENTICATED');
        const { role, link } = await this.access.authorize(actor, boardId, ACTIONS.VIEW, ctx);
        const rt = await this.store.load(boardId);
        if (!rt) throw new AppError('BOARD_NOT_FOUND');
        if (link) socket.data.linkExpiresAt = link.expiresAt.getTime();
        socket.join(room(boardId));
        socket.data.boards.add(boardId);
        this.addParticipant(boardId, socket, role);
        const participants = this.participantList(boardId);
        // Acknowledge inside the task so that the state and later events are in sequence order.
        ack({ ok: true, role, state: { seq: rt.seq, objects: [...rt.objects.values()] }, participants });
        socket.to(room(boardId)).emit('presence:update', { boardId, participants });
        return true;
      });
      if (result) logger.debug('board.joined', { requestId: ctx.requestId, boardId, actorId: socket.data.actor.id });
    } catch (err) {
      if (!(err instanceof AppError)) logger.error('board.join_failed', { requestId: ctx.requestId, error: err.message });
      ack({ ok: false, error: errorBody(err, ctx.requestId) });
    }
  }

  onLeave(socket, msg, ack) {
    const boardId = msg?.boardId;
    if (typeof boardId === 'string' && socket.data.boards.has(boardId)) {
      socket.leave(room(boardId));
      this.removeParticipant(boardId, socket);
    }
    if (typeof ack === 'function') ack({ ok: true });
  }

  async onSubmit(socket, msg, ack) {
    if (typeof ack !== 'function') return;
    const t0 = performance.now();
    const ctx = this.ctx(socket);
    const clientOpId = typeof msg?.clientOpId === 'string' ? msg.clientOpId.slice(0, 64) : null;
    const reject = (err) => {
      const error = errorBody(err, ctx.requestId);
      metrics.inc('ops_rejected_total', `code=${error.code}`);
      logger.info('op.rejected', { requestId: ctx.requestId, socketId: socket.id, boardId: msg?.boardId, errorCode: error.code });
      ack({ ok: false, clientOpId, error });
    };
    if (!socket.data.limiter.allow()) return reject(new AppError('RATE_LIMITED', 'You are sending changes too quickly.'));
    try {
      validateEnvelope(msg);
    } catch (err) {
      return reject(err);
    }
    const actor = socket.data.actor;
    try {
      await this.queues.run(msg.boardId, async () => {
        const result = await this.engine.apply(actor, msg, { ...ctx, joined: socket.data.boards.has(msg.boardId) });
        ack(result.ack);
        if (result.event) socket.to(room(msg.boardId)).emit('op:applied', result.event);
        metrics.observe(performance.now() - t0);
      });
    } catch (err) {
      if (!(err instanceof AppError)) logger.error('op.failed', { requestId: ctx.requestId, error: err.message });
      if (err.code === 'UNAUTHENTICATED') {
        logger.security({ event: 'auth.token_rejected', requestId: ctx.requestId, socketId: socket.id, actor, boardId: msg.boardId, outcome: 'rejected', reason: 'UNAUTHENTICATED' });
      }
      reject(err);
    }
    return undefined;
  }

  // ---- Presence (FR-052) ----
  addParticipant(boardId, socket, role) {
    const actor = socket.data.actor;
    if (!this.participants.has(boardId)) this.participants.set(boardId, new Map());
    const map = this.participants.get(boardId);
    const wasEmpty = map.size === 0;
    map.set(socket.id, { id: actor.id, displayName: actor.displayName, role, guest: actor.type === 'guest' });
    if (wasEmpty) this.startTimer(boardId);
  }

  removeParticipant(boardId, socket) {
    socket.data.boards.delete(boardId);
    const map = this.participants.get(boardId);
    if (!map || !map.delete(socket.id)) return;
    this.nsp.to(room(boardId)).emit('presence:update', { boardId, participants: this.participantList(boardId) });
    if (map.size === 0) {
      this.participants.delete(boardId);
      this.stopTimer(boardId);
      // FR-030 (c): version when the last participant leaves, then drop the cached state.
      this.versions.triggerAutomatic(boardId, 'last_left').then(() =>
        this.queues.run(boardId, async () => {
          if (!this.participants.has(boardId)) this.store.evict(boardId);
        }),
      );
    }
  }

  participantList(boardId) {
    const seen = new Map();
    for (const p of this.participants.get(boardId)?.values() || []) if (!seen.has(p.id)) seen.set(p.id, p);
    return [...seen.values()];
  }

  socketsOf(boardId, predicate = () => true) {
    const out = [];
    for (const socket of this.nsp.sockets.values()) {
      if (socket.data.boards?.has(boardId) && predicate(socket.data.actor, socket)) out.push(socket);
    }
    return out;
  }

  startTimer(boardId) {
    if (this.timers.has(boardId) || !this.config.versionIntervalMs) return;
    const t = setInterval(() => this.versions.triggerAutomatic(boardId, 'periodic'), this.config.versionIntervalMs);
    t.unref?.();
    this.timers.set(boardId, t);
  }

  stopTimer(boardId) {
    clearInterval(this.timers.get(boardId));
    this.timers.delete(boardId);
  }

  // ---- Notifications from COMP-05 / COMP-07 ----
  revoke(sockets, boardId, reason) {
    for (const socket of sockets) {
      socket.emit('access:revoked', { boardId, reason });
      this.removeParticipant(boardId, socket);
      socket.disconnect(true);
    }
  }

  boardDeleted(boardId) {
    this.stopTimer(boardId);
    const sockets = this.socketsOf(String(boardId));
    this.participants.delete(String(boardId)); // no last-participant version for a deleted board
    for (const socket of sockets) {
      socket.emit('access:revoked', { boardId: String(boardId), reason: 'BOARD_DELETED' });
      socket.data.boards.delete(String(boardId));
      socket.disconnect(true);
    }
  }

  /** The Owner renamed the board (issue #13): open views update their title without a reload. */
  boardRenamed(boardId, title) {
    this.nsp.to(room(String(boardId))).emit('board:renamed', { boardId: String(boardId), title });
  }

  evict(boardId) {
    this.store.evict(boardId);
  }

  linkRevoked(boardId, linkId) {
    const sockets = this.socketsOf(String(boardId), (a) => a.type === 'guest' && a.linkId === String(linkId));
    this.revoke(sockets, String(boardId), 'LINK_REVOKED');
  }

  memberRemoved(boardId, userId) {
    const sockets = this.socketsOf(String(boardId), (a) => a.type === 'user' && a.id === String(userId));
    this.revoke(sockets, String(boardId), 'MEMBER_REMOVED');
  }

  roleChanged(boardId, userId, role) {
    boardId = String(boardId);
    const sockets = this.socketsOf(boardId, (a) => a.type === 'user' && a.id === String(userId));
    for (const socket of sockets) {
      const p = this.participants.get(boardId)?.get(socket.id);
      if (p) p.role = role;
      socket.emit('role:changed', { boardId, role });
    }
    if (sockets.length) this.nsp.to(room(boardId)).emit('presence:update', { boardId, participants: this.participantList(boardId) });
  }

  ownershipTransferred(boardId, previousOwnerId, newOwnerId) {
    this.roleChanged(boardId, newOwnerId, 'owner');
    this.roleChanged(boardId, previousOwnerId, 'editor');
  }

  versionCreated(boardId, { number, trigger, createdAt }) {
    this.nsp.to(room(String(boardId))).emit('version:created', { boardId: String(boardId), number, trigger, createdAt });
  }

  boardRestored(boardId, rt, { restoredFrom, newVersion, actor, createdAt }) {
    boardId = String(boardId);
    this.nsp.to(room(boardId)).emit('board:state', { boardId, seq: rt.seq, objects: [...rt.objects.values()] });
    this.nsp.to(room(boardId)).emit('version:restored', { boardId, restoredFrom, newVersion, actor: { id: actor.id, displayName: actor.displayName } });
    this.versionCreated(boardId, { number: newVersion, trigger: 'restore', createdAt: new Date(createdAt).toISOString() });
  }

  notifyOwner(boardId, notice) {
    boardId = String(boardId);
    for (const socket of this.socketsOf(boardId)) {
      if (this.participants.get(boardId)?.get(socket.id)?.role === 'owner') socket.emit('notice', { boardId, ...notice });
    }
  }

  checkExpiry() {
    const now = Date.now();
    for (const socket of this.nsp.sockets.values()) {
      const actor = socket.data.actor;
      if (!actor) continue;
      const tokenExpired = actor.exp * 1000 <= now;
      const linkExpiresAt = socket.data.linkExpiresAt;
      // A guest token's exp is the link expiry rounded down to whole seconds, so the token can
      // run out up to 1 s before the link: that is still a link expiry and needs the notice.
      const linkExpired =
        actor.type === 'guest' &&
        linkExpiresAt &&
        (linkExpiresAt <= now || (tokenExpired && actor.exp === Math.floor(linkExpiresAt / 1000)));
      if (linkExpired) {
        for (const boardId of [...socket.data.boards]) {
          logger.security({
            event: 'link.expired_disconnect',
            requestId: crypto.randomUUID(),
            socketId: socket.id,
            actor,
            boardId,
            outcome: 'success',
            details: { linkId: actor.linkId },
          });
          this.revoke([socket], boardId, 'LINK_EXPIRED');
        }
        socket.disconnect(true);
      } else if (tokenExpired) {
        socket.disconnect(true); // token expired on an open socket; reconnect needs a new token
      }
    }
  }

  close() {
    clearInterval(this.expiryTimer);
    for (const t of this.timers.values()) clearInterval(t);
    this.timers.clear();
  }
}
