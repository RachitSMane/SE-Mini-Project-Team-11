// COMP-08 Persistence Layer: Mongoose models for the collections of SAD §3.6.
//
// Data integrity (issue #20). Every value is validated twice:
//   1. at the API boundary by the JSON schemas of validation.js (SEC-REQ-005), which reject bad input
//      with VALIDATION_FAILED before anything is written;
//   2. here, at the persistence layer, as a second line of defence, so that a programming error or a
//      future code path cannot store a value the API would never accept. The limits come from the
//      shared LIMITS, the same constants the API schemas and the client use.
// Mongoose validators run on create()/save()/insertMany(). Board objects added or updated in real
// time are written with the native driver (see toRawDocument), which skips Mongoose, so the
// boardObjects collection also has a MongoDB $jsonSchema validator that the database itself enforces
// for every writer (BOARD_OBJECT_JSON_SCHEMA below).
import mongoose from 'mongoose';
import { GEOMETRY, KINDS, LIMITS } from '@wb/shared/objects';

const { Schema } = mongoose;

/** Journaled write concern used for every write that must survive a crash (SAD §3.6). */
export const DURABLE = Object.freeze({ writeConcern: { w: 1, j: true } });

// ---- Shared constraint helpers ----
// Same patterns as the API schemas in validation.js.
export const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const OBJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_BLANK = /\S/;
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * String length in Unicode code points, as the API schemas count it (Ajv). Mongoose's built-in
 * `maxlength` counts UTF-16 code units, so a valid 500-character text with emoji would be refused.
 */
const codePoints = (s) => [...s].length;
function lengthBetween(min, max, what) {
  return {
    validator: (v) => v === undefined || v === null || (typeof v === 'string' && codePoints(v) >= min && codePoints(v) <= max),
    message: `${what} must be ${min}–${max} characters`,
  };
}
function integerBetween(min, max, what) {
  return {
    validator: (v) => v === undefined || v === null || (Number.isInteger(v) && v >= min && v <= max),
    message: `${what} must be a whole number between ${min} and ${max}`,
  };
}
const coord = { type: Number, min: -LIMITS.MAX_COORD, max: LIMITS.MAX_COORD };
const size = { type: Number, min: 0, max: LIMITS.MAX_COORD };

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, match: EMAIL_PATTERN },
    passwordHash: { type: String, required: true, match: BCRYPT_HASH }, // never the password itself
    displayName: {
      type: String,
      required: true,
      validate: lengthBetween(1, LIMITS.MAX_DISPLAY_NAME, 'Display name'),
      match: NOT_BLANK,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'users' },
);

const boardSchema = new Schema(
  {
    title: { type: String, required: true, validate: lengthBetween(1, LIMITS.MAX_TITLE, 'Title'), match: NOT_BLANK },
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    seq: { type: Number, default: 0, validate: integerBetween(0, Number.MAX_SAFE_INTEGER, 'seq') },
    contentBytes: { type: Number, default: 0, min: 0 },
    pendingOp: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: 'boards' },
);

const boardObjectSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, required: true },
    objectId: { type: String, required: true, match: OBJECT_ID_PATTERN },
    kind: { type: String, required: true, enum: KINDS },
    // Per-point checks are left to the $jsonSchema validator: a Mongoose validator per coordinate
    // would add up to 4,000 calls per stroke on the restore path.
    points: { type: [[Number]], default: undefined },
    x: coord,
    y: coord,
    w: size,
    h: size,
    x1: coord,
    y1: coord,
    x2: coord,
    y2: coord,
    text: { type: String, validate: lengthBetween(1, LIMITS.MAX_TEXT, 'Text') },
    color: { type: String, required: true, match: COLOR_PATTERN },
    strokeWidth: {
      type: Number,
      required: true,
      validate: integerBetween(LIMITS.MIN_STROKE_WIDTH, LIMITS.MAX_STROKE_WIDTH, 'Stroke width'),
    },
    updatedSeq: { type: Number, required: true, min: 0 },
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
    tokenHash: { type: String, required: true, unique: true, match: SHA256_HEX }, // never the token itself
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
    number: { type: Number, required: true, validate: integerBetween(1, Number.MAX_SAFE_INTEGER, 'Version number') },
    boardSeq: { type: Number, required: true, min: 0 },
    trigger: { type: String, enum: ['periodic', 'before_clear', 'last_left', 'restore'], required: true },
    restoredFrom: { type: Number, default: null, min: 1 },
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

// ---- Database-level validator for boardObjects (enforced by MongoDB for every writer) ----
const jsonCoord = { bsonType: 'number', minimum: -LIMITS.MAX_COORD, maximum: LIMITS.MAX_COORD };
const jsonSize = { bsonType: 'number', minimum: 0, maximum: LIMITS.MAX_COORD };

/**
 * MongoDB $jsonSchema for boardObjects documents (snapshot form + boardId, objectId, updatedSeq).
 * Mirrors the object schemas of validation.js: kind, colour, stroke width, text length, coordinate
 * ranges, the 2,000-point limit, the geometry required for each kind, and no unknown fields.
 */
export const BOARD_OBJECT_JSON_SCHEMA = Object.freeze({
  bsonType: 'object',
  required: ['_id', 'boardId', 'objectId', 'kind', 'color', 'strokeWidth', 'updatedSeq'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'objectId' },
    boardId: { bsonType: 'objectId' },
    objectId: { bsonType: 'string', pattern: OBJECT_ID_PATTERN.source },
    kind: { enum: [...KINDS] },
    points: {
      bsonType: 'array',
      minItems: 1,
      maxItems: LIMITS.MAX_POINTS,
      items: { bsonType: 'array', minItems: 2, maxItems: 2, items: jsonCoord },
    },
    x: jsonCoord,
    y: jsonCoord,
    w: jsonSize,
    h: jsonSize,
    x1: jsonCoord,
    y1: jsonCoord,
    x2: jsonCoord,
    y2: jsonCoord,
    text: { bsonType: 'string', minLength: 1, maxLength: LIMITS.MAX_TEXT },
    color: { bsonType: 'string', pattern: COLOR_PATTERN.source },
    strokeWidth: { bsonType: 'number', minimum: LIMITS.MIN_STROKE_WIDTH, maximum: LIMITS.MAX_STROKE_WIDTH, multipleOf: 1 },
    updatedSeq: { bsonType: 'number', minimum: 0 },
  },
  // The geometry each kind needs (GEOMETRY in shared/src/objects.js).
  oneOf: KINDS.map((kind) => ({ properties: { kind: { enum: [kind] } }, required: [...GEOMETRY[kind]] })),
});

/**
 * Installs the boardObjects validator (creates the collection if needed). validationLevel "strict"
 * checks every insert and update; validationAction "error" refuses the write (MongoDB error 121,
 * mapped to VALIDATION_FAILED by toAppError).
 */
export async function applyCollectionValidators(db = mongoose.connection.db) {
  const options = { validator: { $jsonSchema: BOARD_OBJECT_JSON_SCHEMA }, validationLevel: 'strict', validationAction: 'error' };
  const exists = (await db.listCollections({ name: 'boardObjects' }, { nameOnly: true }).toArray()).length > 0;
  if (exists) await db.command({ collMod: 'boardObjects', ...options });
  else await db.createCollection('boardObjects', options);
}

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
 * The database still checks these documents with BOARD_OBJECT_JSON_SCHEMA.
 */
export function toRawDocument(boardId, obj, updatedSeq) {
  return toDocument(new mongoose.Types.ObjectId(String(boardId)), obj, updatedSeq);
}

export async function connectDb(url) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000, autoIndex: true });
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).init()));
  await applyCollectionValidators();
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
