// In-memory runtime state of active boards (objects, seq, content size), loaded from MongoDB.
// Every mutation happens inside the board's queue task, so cache and database stay in step.
import mongoose from 'mongoose';
import { snapshotForm } from '@wb/shared/objects';
import { Board, BoardObject, toSnapshot } from '../db/models.js';

const { BSON } = mongoose.mongo;

/** M2: BSON size of one object in snapshot form (SAD §3.6). */
export function objectBytes(obj) {
  return BSON.calculateObjectSize(snapshotForm(obj));
}

/** M3 contribution of one object: M2 + 9 bytes of array element header. */
export function contentContribution(obj) {
  return objectBytes(obj) + 9;
}

export class BoardStore {
  constructor() {
    this.cache = new Map();
  }

  /** Loads (or returns the cached) runtime state; null if the board does not exist. */
  async load(boardId) {
    const key = String(boardId);
    if (this.cache.has(key)) return this.cache.get(key);
    const board = await Board.findById(key, { seq: 1, pendingOp: 1 }).lean();
    if (!board) return null;
    const docs = await BoardObject.find({ boardId: key }).lean();
    const objects = new Map();
    const sizes = new Map();
    let contentBytes = 0;
    let maxSeq = board.seq || 0;
    for (const d of docs) {
      const obj = toSnapshot(d);
      const size = contentContribution(obj);
      objects.set(obj.id, obj);
      sizes.set(obj.id, size);
      contentBytes += size;
      if (d.updatedSeq > maxSeq) maxSeq = d.updatedSeq;
    }
    const rt = { id: key, seq: maxSeq, contentBytes, objects, sizes, failed: Boolean(board.pendingOp) };
    this.cache.set(key, rt);
    return rt;
  }

  /** Replace the whole object set (after clear or restore). */
  replaceObjects(rt, objects, seq) {
    rt.objects = new Map();
    rt.sizes = new Map();
    rt.contentBytes = 0;
    for (const obj of objects) {
      const size = contentContribution(obj);
      rt.objects.set(obj.id, obj);
      rt.sizes.set(obj.id, size);
      rt.contentBytes += size;
    }
    rt.seq = seq;
  }

  evict(boardId) {
    this.cache.delete(String(boardId));
  }
}
