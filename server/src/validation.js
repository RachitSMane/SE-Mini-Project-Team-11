// JSON-schema validation of every REST body and Socket.IO payload (SEC-REQ-005, SAD §3.6).
import Ajv from 'ajv';
import { LIMITS, GEOMETRY, KINDS, OP_TYPES, updatableProps } from '@wb/shared/objects';
import { AppError } from './errors.js';

const ajv = new Ajv({ allErrors: false, strict: true, coerceTypes: false, useDefaults: false });

const coord = { type: 'number', minimum: -LIMITS.MAX_COORD, maximum: LIMITS.MAX_COORD };
const size = { type: 'number', minimum: 0, maximum: LIMITS.MAX_COORD };
const PROPERTY_SCHEMAS = {
  points: {
    type: 'array',
    minItems: 1,
    maxItems: LIMITS.MAX_POINTS,
    items: { type: 'array', minItems: 2, maxItems: 2, items: coord },
  },
  x: coord,
  y: coord,
  w: size,
  h: size,
  x1: coord,
  y1: coord,
  x2: coord,
  y2: coord,
  // FR-004: up to 500 characters (counted as Unicode code points by Ajv).
  text: { type: 'string', minLength: 1, maxLength: LIMITS.MAX_TEXT },
  color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
  strokeWidth: { type: 'integer', minimum: LIMITS.MIN_STROKE_WIDTH, maximum: LIMITS.MAX_STROKE_WIDTH },
};
const ID = { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' };
const ID_PATTERN = new RegExp(ID.pattern);

function objectSchema(kind) {
  const props = { id: ID, kind: { const: kind }, color: PROPERTY_SCHEMAS.color, strokeWidth: PROPERTY_SCHEMAS.strokeWidth };
  for (const p of GEOMETRY[kind]) props[p] = PROPERTY_SCHEMAS[p];
  return {
    type: 'object',
    properties: props,
    required: Object.keys(props),
    additionalProperties: false,
  };
}

const objectValidators = Object.fromEntries(KINDS.map((k) => [k, ajv.compile(objectSchema(k))]));

const envelope = ajv.compile({
  type: 'object',
  properties: {
    boardId: { type: 'string', minLength: 1, maxLength: 64 },
    clientOpId: { type: 'string', minLength: 1, maxLength: 64 },
    type: { enum: OP_TYPES },
    payload: { type: 'object' },
  },
  required: ['boardId', 'clientOpId', 'type', 'payload'],
  additionalProperties: false,
});

const joinPayload = ajv.compile({
  type: 'object',
  properties: { boardId: { type: 'string', minLength: 1, maxLength: 64 } },
  required: ['boardId'],
  additionalProperties: false,
});

const idOnly = ajv.compile({
  type: 'object',
  properties: { id: ID },
  required: ['id'],
  additionalProperties: false,
});

const emptyObject = ajv.compile({ type: 'object', maxProperties: 0 });

function fail(validator, what) {
  const e = validator.errors?.[0];
  const where = e ? `${e.instancePath || what} ${e.message}` : what;
  return new AppError('VALIDATION_FAILED', `Invalid ${what}: ${where}`.slice(0, 200));
}

/** Validates the op:submit envelope; returns the clientOpId (if present) for the acknowledgement. */
export function validateEnvelope(msg) {
  if (!envelope(msg)) throw fail(envelope, 'operation');
}

export function validateJoin(msg) {
  if (!joinPayload(msg)) throw fail(joinPayload, 'join request');
}

/**
 * Validates an operation payload. For updates the merged object (existing + changes) is
 * validated as a whole, so an update can never produce an invalid object.
 * @param {Map} objects current board objects (snapshot form)
 */
export function validateOperation(type, payload, objects) {
  switch (type) {
    case 'object:add': {
      const v = objectValidators[payload.kind];
      if (!v) throw new AppError('VALIDATION_FAILED', 'Invalid operation: unknown object kind');
      if (!v(payload)) throw fail(v, 'object');
      if (objects.has(payload.id)) throw new AppError('VALIDATION_FAILED', 'Invalid object: id already exists');
      return;
    }
    case 'object:update': {
      if (typeof payload.id !== 'string' || !ID_PATTERN.test(payload.id)) {
        throw new AppError('VALIDATION_FAILED', 'Invalid operation: missing or invalid id');
      }
      const current = objects.get(payload.id);
      if (!current) throw new AppError('OBJECT_NOT_FOUND');
      const allowed = new Set(updatableProps(current.kind));
      const keys = Object.keys(payload).filter((k) => k !== 'id');
      if (keys.length === 0) throw new AppError('VALIDATION_FAILED', 'Invalid operation: nothing to update');
      for (const k of keys) {
        if (!allowed.has(k)) throw new AppError('VALIDATION_FAILED', `Invalid operation: property ${k} cannot be updated`);
      }
      const merged = { ...current, ...payload };
      const v = objectValidators[current.kind];
      if (!v(merged)) throw fail(v, 'object');
      return;
    }
    case 'object:delete':
      if (!idOnly(payload)) throw fail(idOnly, 'operation');
      if (!objects.has(payload.id)) throw new AppError('OBJECT_NOT_FOUND');
      return;
    case 'board:clear':
      if (!emptyObject(payload)) throw fail(emptyObject, 'operation');
      return;
    default:
      throw new AppError('VALIDATION_FAILED', 'Invalid operation type');
  }
}

// ---- REST bodies (API-02) ----
const email = { type: 'string', minLength: 3, maxLength: 254, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' };
const displayName = { type: 'string', minLength: 1, maxLength: LIMITS.MAX_DISPLAY_NAME, pattern: '\\S' };
const password = { type: 'string', minLength: LIMITS.MIN_PASSWORD, maxLength: LIMITS.MAX_PASSWORD };

const boardTitleBody = {
  type: 'object',
  properties: { title: { type: 'string', minLength: 1, maxLength: LIMITS.MAX_TITLE, pattern: '\\S' } },
  required: ['title'],
  additionalProperties: false,
};

const bodies = {
  register: {
    type: 'object',
    properties: { email, password, displayName },
    required: ['email', 'password', 'displayName'],
    additionalProperties: false,
  },
  login: {
    type: 'object',
    properties: { email: { type: 'string', maxLength: 254 }, password: { type: 'string', maxLength: 1024 } },
    required: ['email', 'password'],
    additionalProperties: false,
  },
  createBoard: boardTitleBody,
  renameBoard: boardTitleBody, // same 1–100 character rule as creation (FR-042)
  createLink: {
    type: 'object',
    properties: { role: { enum: ['viewer', 'editor'] }, expiresIn: { enum: ['1h', '24h', '7d'] } },
    required: ['role'],
    additionalProperties: false,
  },
  resolveLink: {
    type: 'object',
    properties: { token: { type: 'string', minLength: 1, maxLength: 128 }, displayName },
    required: ['token'],
    additionalProperties: false,
  },
  patchMember: {
    type: 'object',
    properties: { role: { enum: ['viewer', 'editor'] } },
    required: ['role'],
    additionalProperties: false,
  },
  transfer: {
    type: 'object',
    properties: { newOwnerId: { type: 'string', minLength: 1, maxLength: 64 }, confirm: { const: true } },
    required: ['newOwnerId', 'confirm'],
    additionalProperties: false,
  },
};
const bodyValidators = Object.fromEntries(Object.entries(bodies).map(([k, s]) => [k, ajv.compile(s)]));

export function validateBody(name, body) {
  const v = bodyValidators[name];
  if (!v(body ?? {})) throw fail(v, 'request');
  return body;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateIdempotencyKey(key) {
  if (typeof key !== 'string' || !UUID.test(key)) {
    throw new AppError('VALIDATION_FAILED', 'Idempotency-Key header must be a UUID');
  }
  return key.toLowerCase();
}
