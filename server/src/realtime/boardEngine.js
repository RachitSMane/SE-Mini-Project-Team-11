// COMP-06 operation processing (SAD §4.1.2): authorisation, validation, board size limit,
// sequence numbers, persistence before acknowledgement, and the journalled clear (SAD §3.6).
import mongoose from 'mongoose';
import { applyOperation, LIMITS } from '@wb/shared/objects';
import { Board, BoardObject, DURABLE, toRawDocument } from '../db/models.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { actionForOperation } from '../access/policy.js';
import { validateOperation } from '../validation.js';
import { contentContribution } from './boardStore.js';
import { withRetries } from '../versions/versionService.js';

export class BoardEngine {
  constructor({ store, access, auth, versions, faults }) {
    this.store = store;
    this.access = access;
    this.auth = auth;
    this.versions = versions;
    this.faults = faults;
  }

  /**
   * Processes one op:submit inside the board's queue task. Returns
   * {ack, event} where event (if any) is broadcast to the other sockets of the room.
   */
  async apply(actor, msg, ctx) {
    const { boardId, clientOpId, type, payload } = msg;
    const { role } = await this.access.authorize(actor, boardId, actionForOperation(type), ctx);
    if (!(await this.auth.stillValid(actor))) throw new AppError('UNAUTHENTICATED');
    if (!ctx.joined) throw new AppError('VALIDATION_FAILED', 'Join the board before submitting operations.');
    const rt = await this.store.load(boardId);
    if (!rt) throw new AppError('BOARD_NOT_FOUND');
    if (rt.failed) throw new AppError('INTERNAL');
    if (type === 'board:clear') return this.clear(rt, actor, msg, ctx);

    validateOperation(type, payload, rt.objects);
    // FR-008: content size (M3) after the change, checked before anything is written.
    let newSize = 0;
    let delta = 0;
    if (type === 'object:add') {
      newSize = contentContribution(payload);
      delta = newSize;
    } else if (type === 'object:update') {
      newSize = contentContribution({ ...rt.objects.get(payload.id), ...payload });
      delta = newSize - rt.sizes.get(payload.id);
    } else {
      delta = -rt.sizes.get(payload.id);
    }
    const contentBytes = rt.contentBytes + delta;
    if (delta > 0 && contentBytes > LIMITS.BOARD_CONTENT_LIMIT) {
      logger.info('op.rejected', { requestId: ctx.requestId, boardId, errorCode: 'BOARD_FULL', contentBytes: rt.contentBytes, attemptedBytes: contentBytes });
      throw new AppError('BOARD_FULL');
    }

    const seq = rt.seq + 1;
    try {
      // Adds and updates go through the native driver: the payload is schema-validated above, and
      // Mongoose's re-casting of large point arrays was the main CPU cost of an operation.
      if (type === 'object:add') {
        await BoardObject.collection.insertOne(toRawDocument(boardId, payload, seq), DURABLE);
      } else if (type === 'object:update') {
        const { id, ...changes } = payload;
        await BoardObject.collection.updateOne(
          { boardId: new mongoose.Types.ObjectId(String(boardId)), objectId: id },
          { $set: { ...changes, updatedSeq: seq } },
          DURABLE,
        );
      } else {
        await BoardObject.deleteOne({ boardId, objectId: payload.id }, DURABLE);
      }
      await Board.updateOne({ _id: boardId }, { $set: { seq, contentBytes, updatedAt: new Date() } }, DURABLE);
    } catch (err) {
      // Reload from the database on the next task (start-up style seq recovery); nothing acknowledged.
      this.store.evict(boardId);
      logger.error('db.write_failed', { requestId: ctx.requestId, boardId, error: err.message });
      throw new AppError('INTERNAL');
    }
    // Persisted: update the cache, then acknowledge and broadcast (FR-027).
    applyOperation(rt.objects, type, payload);
    if (type === 'object:delete') rt.sizes.delete(payload.id);
    else rt.sizes.set(payload.id, newSize);
    rt.seq = seq;
    rt.contentBytes = contentBytes;
    return {
      ack: { ok: true, clientOpId, seq },
      event: { boardId, seq, clientOpId, actor: { id: actor.id, displayName: actor.displayName }, type, payload },
      role,
    };
  }

  /** Clear task (FR-007, SAD §3.6, SD-05). */
  async clear(rt, actor, msg, ctx) {
    const { boardId, clientOpId } = msg;
    // Step 1: an empty board is a no-op without a sequence number or version.
    if (rt.objects.size === 0) return { ack: { ok: true, clientOpId, seq: null, noop: true }, event: null };
    // Step 2: "before clear" version (no-change rule); failure rejects the clear.
    let preClearVersion;
    try {
      ({ number: preClearVersion } = await this.versions.snapshotIfChanged(rt, 'before_clear', actor));
    } catch (err) {
      logger.error('op.clear_failed', { requestId: ctx.requestId, boardId, stage: 'before_clear_version', error: err.message });
      throw new AppError('INTERNAL');
    }
    this.faults.crashAt('after_preclear_version');
    // Step 3: commit point.
    const s = rt.seq + 1;
    const pendingOp = { type: 'clear', seq: s, preClearVersion };
    try {
      this.faults.errorAt('commit_write_error');
      await Board.updateOne({ _id: boardId }, { $set: { pendingOp } }, DURABLE);
    } catch (err) {
      logger.error('op.clear_failed', { requestId: ctx.requestId, boardId, stage: 'commit', error: err.message });
      throw new AppError('INTERNAL');
    }
    this.faults.committed();
    this.faults.crashAt('after_pending_clear');
    // Steps 4–6 with up to 3 attempts.
    try {
      await withRetries(() => this.completeClear(boardId, pendingOp));
    } catch (err) {
      rt.failed = true;
      logger.error('recovery.required', { requestId: ctx.requestId, boardId, operation: 'clear', error: err.message });
      throw new AppError('INTERNAL');
    }
    this.faults.crashAt('after_complete');
    this.store.replaceObjects(rt, [], s);
    return {
      ack: { ok: true, clientOpId, seq: s },
      event: { boardId, seq: s, clientOpId, actor: { id: actor.id, displayName: actor.displayName }, type: 'board:clear', payload: {} },
    };
  }

  /** Steps 4–6 of a clear; idempotent, used by the running task and by start-up recovery. */
  async completeClear(boardId, op) {
    this.faults.guardWrite();
    if (this.faults.name === 'during_object_delete') {
      const some = await BoardObject.find({ boardId }, { _id: 1 }).limit(25).lean();
      await BoardObject.deleteMany({ _id: { $in: some.map((d) => d._id) } }, DURABLE);
      this.faults.crashAt('during_object_delete');
    }
    await BoardObject.deleteMany({ boardId }, DURABLE);
    this.faults.guardWrite();
    await Board.updateOne(
      { _id: boardId, 'pendingOp.seq': op.seq },
      { $set: { seq: op.seq, contentBytes: 0, updatedAt: new Date() }, $unset: { pendingOp: 1 } },
      DURABLE,
    );
  }
}
