// Common error object and code-to-status mapping (SAD §4.3). The codes, statuses and default
// messages come from the shared contract (shared/src/errorCodes.js), which the client also uses.
import { ERROR_CODES } from '@wb/shared/errors';

export const STATUS = Object.freeze(Object.fromEntries(Object.entries(ERROR_CODES).map(([code, d]) => [code, d.status])));

const DEFAULT_MESSAGES = Object.freeze(Object.fromEntries(Object.entries(ERROR_CODES).map(([code, d]) => [code, d.message])));

export class AppError extends Error {
  constructor(code, message, extra = {}) {
    super(message || DEFAULT_MESSAGES[code] || code);
    this.code = code;
    this.status = STATUS[code] || 500;
    Object.assign(this, extra);
  }
}

// MongoDB server error codes (https://www.mongodb.com/docs/manual/reference/error-codes/).
const MONGO_DUPLICATE_KEY = 11000;
const MONGO_DOCUMENT_VALIDATION_FAILURE = 121;
const MONGO_UNAVAILABLE_ERRORS = new Set([
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoServerSelectionError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
]);

/**
 * Converts any thrown value into an AppError, so every failure leaves the server as a known code.
 * - AppError: returned unchanged.
 * - Expected database errors (duplicate key, schema validation, invalid id, database down): mapped
 *   to CONFLICT, VALIDATION_FAILED or UNAVAILABLE with our own message. The driver's message (which
 *   can name collections, indexes and the duplicated value) is kept only in `cause` for the log.
 * - Anything else: INTERNAL with `unexpected = true`, so the caller logs it as a server fault.
 */
export function toAppError(err) {
  if (err instanceof AppError) return err;
  let mapped = null;
  if (err?.code === MONGO_DUPLICATE_KEY) {
    mapped = new AppError('CONFLICT');
  } else if (err?.code === MONGO_DOCUMENT_VALIDATION_FAILURE || err?.name === 'ValidationError') {
    mapped = new AppError('VALIDATION_FAILED', 'The data could not be saved because it is not valid.');
  } else if (err?.name === 'CastError') {
    mapped = new AppError('VALIDATION_FAILED', 'The request contains an invalid identifier.');
  } else if (MONGO_UNAVAILABLE_ERRORS.has(err?.name)) {
    mapped = new AppError('UNAVAILABLE');
  }
  if (mapped) {
    mapped.cause = err;
    return mapped;
  }
  const internal = new AppError('INTERNAL');
  internal.cause = err;
  internal.unexpected = true;
  return internal;
}

/**
 * Log fields for a database error mapped by toAppError: the error type, its numeric code and the
 * index fields of a duplicate key, but never the driver message or the duplicated value (which
 * may be an e-mail address or a token hash; SEC-REQ-008 keeps those out of the log).
 */
export function dbErrorDetails(err) {
  return {
    dbError: err?.name,
    dbCode: typeof err?.code === 'number' ? err.code : undefined,
    keyFields: err?.keyPattern ? Object.keys(err.keyPattern) : undefined,
  };
}

/**
 * The `error` member of every REST error response and Socket.IO rejection: { code, message,
 * requestId }. Only AppError messages (written by us) are sent; anything else becomes the generic
 * INTERNAL message, so stack traces and driver messages never reach the client.
 */
export function errorBody(err, requestId) {
  const code = err instanceof AppError ? err.code : 'INTERNAL';
  const message = err instanceof AppError ? err.message : DEFAULT_MESSAGES.INTERNAL;
  return { code, message, requestId };
}
