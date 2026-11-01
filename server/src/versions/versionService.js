// COMP-07 Version History Service (SRS §4.3, SAD §3.6, §4.1.5): automatic snapshots with the
// no-change rule, retention of the 20 newest, read-only preview, and the journalled, idempotent
// Owner-only restore.
import mongoose from 'mongoose';
import { canonicalState, LIMITS } from '@wb/shared/objects';
import { Board, BoardObject, Version, DURABLE, toDocument } from '../db/models.js';
import { AppError } from '../errors.js';
import { logger, metrics } from '../logger.js';
import { ACTIONS } from '../access/policy.js';
import { contentContribution } from '../realtime/boardStore.js';

const { BSON } = mongoose.mongo;

export async function withRetries(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function actorRef(actor) {
  return actor ? String(actor.id) : null;
}

export class VersionService {
  constructor({ config, queues, store, access, faults }) {
    this.config = config;
    this.queues = queues;
    this.store = store;
    this.access = access;
    this.faults = faults;
    this.realtime = null;
  }

  async latest(boardId) {
    return Version.findOne({ boardId }, { number: 1, boardSeq: 1 }).sort({ number: -1 }).lean();
  }

  /**
   * Automatic trigger (periodic, before_clear, last_left) with the no-change rule (D5b).
   * Must run inside the board's queue. Returns {created, number} (number of the latest version).
   */
  async snapshotIfChanged(rt, trigger, actor) {
    const latest = await this.latest(rt.id);
    const changed = latest ? latest.boardSeq !== rt.seq : rt.objects.size > 0;
    if (!changed) return { created: false, number: latest ? latest.number : null };
    if (trigger === 'before_clear') this.faults.errorAt('version_write_error');
    const number = (latest ? latest.number : 0) + 1;
    const doc = {
      boardId: rt.id,
      number,
      boardSeq: rt.seq,
      trigger,
      restoredFrom: null,
      createdAt: new Date(),
      createdBy: actorRef(actor),
      objects: canonicalState(rt.objects),
    };
    this.checkDocumentSize(doc, trigger);
    await Version.create([doc], DURABLE);
    await this.applyRetention(rt.id);
    logger.info('version.created', { boardId: rt.id, number, trigger, boardSeq: rt.seq });
    this.realtime?.versionCreated(rt.id, { number, trigger, createdAt: doc.createdAt.toISOString() });
    return { created: true, number };
  }

  /** M4 defensive check (D11b). */
  checkDocumentSize(doc, trigger) {
    const bytes = BSON.calculateObjectSize(doc);
    metrics.observeSnapshot?.(bytes);
    if (bytes > LIMITS.VERSION_DOC_LIMIT) {
      logger.error('version.snapshot_too_large', { boardId: String(doc.boardId), bytes, trigger });
      throw new AppError('INTERNAL', 'This version could not be saved.', { snapshotTooLarge: true });
    }
    return bytes;
  }

  /** Delete versions older than the 20 newest, except one referenced by a pending restore. */
  async applyRetention(boardId) {
    const keep = this.config.versionRetention;
    const cutoff = await Version.find({ boardId }, { number: 1 }).sort({ number: -1 }).skip(keep - 1).limit(1).lean();
    if (!cutoff.length) return;
    const board = await Board.findById(boardId, { pendingOp: 1 }).lean();
    const protect = board?.pendingOp?.type === 'restore' ? [board.pendingOp.restoredFrom] : [];
    await Version.deleteMany({ boardId, number: { $lt: cutoff[0].number, $nin: protect } }, DURABLE);
  }

  /** Runs a periodic or last-participant trigger as a board task. */
  triggerAutomatic(boardId, trigger) {
    return this.queues.run(boardId, async () => {
      const rt = await this.store.load(boardId);
      if (!rt || rt.failed) return null;
      try {
        return await this.snapshotIfChanged(rt, trigger, null);
      } catch (err) {
        if (err.snapshotTooLarge) this.realtime?.notifyOwner(boardId, { code: 'VERSION_NOT_SAVED', message: 'This version could not be saved.' });
        logger.error('version.trigger_failed', { boardId: String(boardId), trigger, error: err.message });
        return null;
      }
    });
  }

  // ---- API-03 ----
  async list(actor, boardId, { limit = 20, before } = {}, ctx) {
    await this.access.authorize(actor, boardId, ACTIONS.VIEW, ctx);
    const filter = { boardId };
    if (before !== undefined) filter.number = { $lt: before };
    const rows = await Version.find(filter, { objects: 0, boardId: 0 }).sort({ number: -1 }).limit(limit).lean();
    return rows.map((v) => ({
      number: v.number,
      trigger: v.trigger,
      restoredFrom: v.restoredFrom ?? null,
      createdAt: v.createdAt.toISOString(),
      createdBy: v.createdBy ?? null,
    }));
  }

  async preview(actor, boardId, number, ctx) {
    await this.access.authorize(actor, boardId, ACTIONS.VIEW, ctx);
    const v = await Version.findOne({ boardId, number }).lean();
    if (!v) throw new AppError('VERSION_NOT_FOUND');
    return {
      number: v.number,
      trigger: v.trigger,
      restoredFrom: v.restoredFrom ?? null,
      createdAt: v.createdAt.toISOString(),
      objects: v.objects,
    };
  }

  /** Owner-only restore of version n (FR-033, SAD §3.6 steps 1–7). */
  async restore(actor, boardId, n, key, ctx) {
    await this.access.authorize(actor, boardId, ACTIONS.RESTORE, ctx);
    const t0 = performance.now();
    return this.queues.run(boardId, async () => {
      await this.access.authorize(actor, boardId, ACTIONS.RESTORE, ctx);
      const rt = await this.store.load(boardId);
      if (!rt) throw new AppError('BOARD_NOT_FOUND');
      if (rt.failed) throw new AppError('INTERNAL');
      // Step 1: idempotent retry / key reuse, then load snapshot n.
      const prior = await Version.findOne({ boardId, requestId: key }, { number: 1, restoredFrom: 1, boardSeq: 1 }).lean();
      if (prior) {
        if (prior.restoredFrom === n) return { newVersion: prior.number, restoredFrom: n, seq: prior.boardSeq, replay: true };
        throw new AppError('IDEMPOTENCY_KEY_REUSED', `This Idempotency-Key was already used to restore version ${prior.restoredFrom}`);
      }
      const snap = await Version.findOne({ boardId, number: n }, { objects: 1 }).lean();
      if (!snap) throw new AppError('VERSION_NOT_FOUND');
      const latest = await this.latest(boardId);
      const r = latest.number + 1;
      const s = rt.seq + 1;
      const pendingOp = {
        type: 'restore',
        seq: s,
        version: r,
        restoredFrom: n,
        requestId: key,
        createdBy: actorRef(actor),
        createdAt: new Date(),
      };
      // Step 2: M4 of version r.
      try {
        this.checkDocumentSize(this.restoreVersionDoc(boardId, pendingOp, snap.objects), 'restore');
        // Step 3: commit point (journaled).
        this.faults.errorAt('commit_write_error');
        await Board.updateOne({ _id: boardId }, { $set: { pendingOp } }, DURABLE);
      } catch (err) {
        logger.error('version.restore_failed', { requestId: ctx.requestId, boardId: String(boardId), restoredFrom: n, error: err.message });
        throw err instanceof AppError ? err : new AppError('INTERNAL');
      }
      this.faults.committed();
      this.faults.crashAt('after_pending_restore');
      // Steps 4–6, retried up to 3 times; never reported as successful before completion.
      try {
        await withRetries(() => this.completeRestore(boardId, pendingOp, snap.objects));
      } catch (err) {
        rt.failed = true;
        logger.error('recovery.required', { boardId: String(boardId), operation: 'restore', error: err.message });
        throw new AppError('INTERNAL');
      }
      this.faults.crashAt('after_complete');
      this.store.replaceObjects(rt, snap.objects, s);
      await this.applyRetention(boardId).catch((err) => logger.error('version.retention_failed', { boardId: String(boardId), error: err.message }));
      // Step 7: broadcast and respond.
      this.realtime?.boardRestored(boardId, rt, { restoredFrom: n, newVersion: r, actor, createdAt: pendingOp.createdAt });
      logger.security({
        event: 'version.restored',
        requestId: ctx.requestId,
        actor,
        boardId,
        outcome: 'success',
        details: { restoredFrom: n, newVersion: r },
      });
      metrics.inc('restore_total');
      logger.info('restore.completed', { boardId: String(boardId), durationMs: Math.round(performance.now() - t0) });
      return { newVersion: r, restoredFrom: n, seq: s };
    });
  }

  restoreVersionDoc(boardId, op, objects) {
    return {
      boardId: new mongoose.Types.ObjectId(String(boardId)),
      number: op.version,
      boardSeq: op.seq,
      trigger: 'restore',
      restoredFrom: op.restoredFrom,
      requestId: op.requestId,
      createdAt: new Date(op.createdAt),
      createdBy: op.createdBy,
      objects,
    };
  }

  /** Steps 4–6 of a restore; idempotent, used by the running task and by start-up recovery. */
  async completeRestore(boardId, op, snapshotObjects) {
    let objects = snapshotObjects;
    if (!objects) {
      const snap = await Version.findOne({ boardId, number: op.restoredFrom }, { objects: 1 }).lean();
      const restored = snap ? null : await Version.findOne({ boardId, number: op.version }, { objects: 1 }).lean();
      if (!snap && !restored) throw new Error(`Snapshot ${op.restoredFrom} for pending restore is missing`);
      objects = (snap || restored).objects;
    }
    // Step 4: insert version r unless it already exists.
    this.faults.guardWrite();
    if (!(await Version.exists({ boardId, number: op.version }))) {
      await Version.create([this.restoreVersionDoc(boardId, op, objects)], DURABLE);
    }
    this.faults.crashAt('after_version_insert');
    // Step 5: replace the object set.
    this.faults.guardWrite();
    await BoardObject.deleteMany({ boardId }, DURABLE);
    const docs = objects.map((o) => toDocument(boardId, o, op.seq));
    if (this.faults.name === 'during_object_replace' && docs.length > 1) {
      await BoardObject.insertMany(docs.slice(0, Math.floor(docs.length / 2)), { ordered: false, ...DURABLE });
      this.faults.crashAt('during_object_replace');
    }
    if (docs.length) await BoardObject.insertMany(docs, { ordered: false, ...DURABLE });
    // Step 6: complete (one atomic, journaled update).
    this.faults.guardWrite();
    const contentBytes = objects.reduce((sum, o) => sum + contentContribution(o), 0);
    await Board.updateOne(
      { _id: boardId, 'pendingOp.seq': op.seq },
      { $set: { seq: op.seq, contentBytes, updatedAt: new Date() }, $unset: { pendingOp: 1 } },
      DURABLE,
    );
  }
}
