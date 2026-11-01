// Start-up recovery (SAD §3.6): runs for every board before the server accepts any connection.
// 1. complete journalled clears/restores, 2. sequence recovery, 3. recompute content size (M3).
import { Board, BoardObject, toSnapshot } from './db/models.js';
import { logger } from './logger.js';
import { contentContribution } from './realtime/boardStore.js';
import { withRetries } from './versions/versionService.js';

export class RecoveryError extends Error {}

export async function runStartupRecovery({ engine, versions, faults }) {
  faults.inRecovery = true;
  try {
    const pending = await Board.find({ pendingOp: { $exists: true, $ne: null } }, { pendingOp: 1 }).lean();
    for (const board of pending) {
      const op = board.pendingOp;
      try {
        await withRetries(async () => {
          if (op.type === 'clear') await engine.completeClear(board._id, op);
          else if (op.type === 'restore') await versions.completeRestore(board._id, op, null);
          else throw new Error(`Unknown pending operation ${op.type}`);
        });
      } catch (err) {
        logger.error('recovery.required', { requestId: null, boardId: String(board._id), operation: op.type, error: err.message });
        throw new RecoveryError(`Recovery of board ${board._id} failed: ${err.message}`);
      }
      logger.info(op.type === 'clear' ? 'board.clear_rolled_forward' : 'version.restore_rolled_forward', {
        requestId: null,
        boardId: String(board._id),
        seq: op.seq,
        ...(op.type === 'restore' ? { newVersion: op.version, restoredFrom: op.restoredFrom } : {}),
      });
      if (op.type === 'restore') await versions.applyRetention(board._id).catch(() => {});
    }
  } finally {
    faults.inRecovery = false;
  }

  // Steps 2 and 3 for every board.
  const boards = await Board.find({}, { seq: 1, contentBytes: 1 }).lean();
  for (const board of boards) {
    let maxSeq = board.seq || 0;
    let contentBytes = 0;
    const cursor = BoardObject.find({ boardId: board._id }).lean().cursor();
    for await (const doc of cursor) {
      if (doc.updatedSeq > maxSeq) maxSeq = doc.updatedSeq;
      contentBytes += contentContribution(toSnapshot(doc));
    }
    if (maxSeq !== board.seq || contentBytes !== board.contentBytes) {
      await Board.updateOne({ _id: board._id }, { $set: { seq: maxSeq, contentBytes } });
      if (maxSeq !== board.seq) logger.warn('recovery.seq_advanced', { boardId: String(board._id), from: board.seq, to: maxSeq });
    }
  }
}
