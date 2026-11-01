// Regression for the native-driver writes of object:add / object:update (boardEngine.js, 14-10-2026):
// the stored boardObjects documents must be identical — fields and BSON types — to what the previous
// Mongoose path (BoardObject.create / updateOne) stored, and the board must reload unchanged (FR-027).
import mongoose from 'mongoose';
import { canonicalState } from '@wb/shared/objects';
import { scriptedClient, startTestServer } from '../helpers/harness.js';
import { apiClient, freshJoin } from '../helpers/api.js';
import { BoardObject, DURABLE, toDocument } from '../../src/db/models.js';

const { BSON } = mongoose.mongo;

let srv;
const open = [];
afterAll(async () => {
  for (const x of open) x.close();
  await srv?.stop();
});

/** Field name -> BSON bytes of {v: value}: equal only if value and BSON type (int32 vs double, ...) match. */
function bsonFields(doc, skip) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) if (!skip.includes(k)) out[k] = BSON.serialize({ v }).toString('hex');
  return out;
}

const raw = (boardId, objectId) => BoardObject.collection.findOne({ boardId: new mongoose.Types.ObjectId(boardId), objectId });

/** What the previous Mongoose path stored for the same object, written to a separate board id. */
async function viaMongoose(obj, seq, update) {
  const refBoard = new mongoose.Types.ObjectId();
  await BoardObject.create([toDocument(refBoard, obj, seq)], DURABLE);
  if (update) {
    const { id, ...changes } = update.payload;
    await BoardObject.updateOne({ boardId: refBoard, objectId: id }, { $set: { ...changes, updatedSeq: update.seq } }, DURABLE);
  }
  return BoardObject.collection.findOne({ boardId: refBoard, objectId: obj.id });
}

test('object:add and object:update store the same documents as the Mongoose path; the board reloads unchanged', async () => {
  srv = await startTestServer();
  const c = apiClient(srv);
  const O = await c.register('Owner');
  const boardId = await c.createBoard(O.token);
  const o = await scriptedClient(srv.url, O.token, boardId);
  open.push(o);

  // Integral and non-integral coordinates: BSON stores them as int32 and double respectively.
  const objects = [
    { id: 'st1', kind: 'stroke', points: [[10, 20], [30.5, 40.5], [-5, 7.25]], color: '#1E88E5', strokeWidth: 3 },
    { id: 're1', kind: 'rect', x: 1, y: 2.5, w: 30, h: 40.5, color: '#000000', strokeWidth: 1 },
    { id: 'tx1', kind: 'text', x: 5.5, y: 6, text: '<b>not html</b>', color: '#FF0000', strokeWidth: 1 },
  ];
  const seqs = {};
  for (const obj of objects) {
    const ack = await o.submitAck('object:add', obj);
    expect(ack.ok).toBe(true);
    seqs[obj.id] = ack.seq;
  }
  for (const obj of objects) {
    const stored = await raw(boardId, obj.id);
    expect(stored.boardId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(String(stored.boardId)).toBe(boardId);
    const ref = await viaMongoose(obj, seqs[obj.id]);
    expect(bsonFields(stored, ['_id', 'boardId'])).toEqual(bsonFields(ref, ['_id', 'boardId']));
  }

  // Updates: move a stroke (whole points array) and restyle a rectangle.
  const updates = [
    { id: 'st1', points: [[11, 21], [31.5, 41.5], [-4, 8.25]] },
    { id: 're1', color: '#00FF00', strokeWidth: 5 },
  ];
  for (const payload of updates) {
    const ack = await o.submitAck('object:update', payload);
    expect(ack.ok).toBe(true);
    const stored = await raw(boardId, payload.id);
    const original = objects.find((x) => x.id === payload.id);
    const ref = await viaMongoose(original, seqs[payload.id], { payload, seq: ack.seq });
    expect(bsonFields(stored, ['_id', 'boardId'])).toEqual(bsonFields(ref, ['_id', 'boardId']));
  }

  // Reload from the database (cache dropped): the joined state equals the client's confirmed state.
  srv.services.store.evict(boardId);
  const fresh = await freshJoin(srv.url, O.token, boardId);
  open.push(fresh);
  expect(fresh.objects).toEqual(canonicalState(o.sync.confirmed));
  expect(fresh.lastSeq).toBe(o.sync.lastSeq);
});
