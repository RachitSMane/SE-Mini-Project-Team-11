// COMP-08 Persistence Layer: Mongoose models for the collections of SAD §3.6.
import mongoose from 'mongoose';
import { GEOMETRY } from '@wb/shared/objects';

const { Schema } = mongoose;

/** Journaled write concern used for every write that must survive a crash (SAD §3.6). */
export const DURABLE = Object.freeze({ writeConcern: { w: 1, j: true } });

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'users' },
);

const boardSchema = new Schema(
  {
    title: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    seq: { type: Number, default: 0 },
    contentBytes: { type: Number, default: 0 },
    pendingOp: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: 'boards' },
);

const boardObjectSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, required: true },
    objectId: { type: String, required: true },
    kind: { type: String, required: true },
    points: { type: [[Number]], default: undefined },
    x: Number,
    y: Number,
    w: Number,
    h: Number,
    x1: Number,
    y1: Number,
    x2: Number,
    y2: Number,
    text: String,
    color: String,
    strokeWidth: Number,
    updatedSeq: { type: Number, required: true },
  },
  { collection: 'boardObjects', versionKey: false },
);
boardObjectSchema.index({ boardId: 1, objectId: 1 }, { unique: true });

const membershipSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: ['editor', 'viewer'], required: true },
  },
  { timestamps: true, collection: 'memberships' },
);
membershipSchema.index({ boardId: 1, userId: 1 }, { unique: true });

const shareLinkSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    role: { type: String, enum: ['editor', 'viewer'], required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'shareLinks' },
);
// TTL clean-up one day after expiry (expired links are rejected by the expiry check before that).
shareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86_400 });

const versionSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, required: true },
    number: { type: Number, required: true },
    boardSeq: { type: Number, required: true },
    trigger: { type: String, enum: ['periodic', 'before_clear', 'last_left', 'restore'], required: true },
    restoredFrom: { type: Number, default: null },
    requestId: { type: String, default: undefined },
    createdAt: { type: Date, required: true },
    createdBy: { type: String, default: null },
    objects: { type: [Schema.Types.Mixed], default: [] },
  },
  { collection: 'versions', versionKey: false },
);
versionSchema.index({ boardId: 1, number: 1 }, { unique: true });
versionSchema.index(
  { boardId: 1, requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } },
);

const revokedTokenSchema = new Schema(
  {
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'revokedTokens', versionKey: false },
);
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const User = mongoose.model('User', userSchema);
export const Board = mongoose.model('Board', boardSchema);
export const BoardObject = mongoose.model('BoardObject', boardObjectSchema);
export const Membership = mongoose.model('Membership', membershipSchema);
export const ShareLink = mongoose.model('ShareLink', shareLinkSchema);
export const Version = mongoose.model('Version', versionSchema);
export const RevokedToken = mongoose.model('RevokedToken', revokedTokenSchema);

/** boardObjects document -> snapshot form (SAD §3.6). */
export function toSnapshot(doc) {
  const out = { id: doc.objectId, kind: doc.kind };
  for (const p of GEOMETRY[doc.kind] || []) if (doc[p] !== undefined && doc[p] !== null) out[p] = doc[p];
  out.color = doc.color;
  out.strokeWidth = doc.strokeWidth;
  return out;
}

/** Snapshot form -> boardObjects document. */
export function toDocument(boardId, obj, updatedSeq) {
  const { id, ...rest } = obj;
  return { boardId, objectId: id, ...rest, updatedSeq };
}

/**
 * Snapshot form -> boardObjects document for the native driver (`BoardObject.collection`), with the
 * fields and types Mongoose would store (boardId as an ObjectId). Only for objects already validated
 * by the operation schemas (SEC-REQ-005): Mongoose's casting of a 2,000-point stroke cost about ten
 * times the write itself and dominated the CPU time of large operations (TC-022 profile, 14-10-2026).
 */
export function toRawDocument(boardId, obj, updatedSeq) {
  return toDocument(new mongoose.Types.ObjectId(String(boardId)), obj, updatedSeq);
}

export async function connectDb(url) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000, autoIndex: true });
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).init()));
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
