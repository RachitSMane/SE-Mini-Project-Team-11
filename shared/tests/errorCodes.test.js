// Shared error-code contract (issue #9): every code is complete, the server uses the shared
// statuses and messages, the client has a meaningful text for every code, and unexpected or
// database errors never expose implementation details.
import { afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { CLIENT_ERROR_CODES, codeForStatus, ERROR_CODES, errorDefinition, GENERIC_ERROR_MESSAGE, userMessageFor } from '../src/errorCodes.js';
import { AppError, dbErrorDetails, errorBody, STATUS, toAppError } from '../../server/src/errors.js';
import { api, ApiError, describeError } from '../../client/src/api.js';

const ALL = { ...ERROR_CODES, ...CLIENT_ERROR_CODES };

describe('contract', () => {
  test('every code has a status, a server message and a user message', () => {
    for (const [code, d] of Object.entries(ERROR_CODES)) {
      expect(code).toMatch(/^[A-Z_]+$/);
      expect(Number.isInteger(d.status) && d.status >= 400 && d.status <= 599).toBe(true);
      expect(d.message.trim().length).toBeGreaterThan(0);
      expect(d.userMessage.trim().length).toBeGreaterThan(0);
      expect(typeof d.useServerMessage).toBe('boolean');
      expect(typeof d.showReference).toBe('boolean');
    }
    for (const d of Object.values(CLIENT_ERROR_CODES)) expect(d.userMessage.trim().length).toBeGreaterThan(0);
    // Client-only codes must not collide with server codes.
    for (const code of Object.keys(CLIENT_ERROR_CODES)) expect(ERROR_CODES[code]).toBeUndefined();
  });

  test('the codes of SAD §4.3 keep their HTTP statuses', () => {
    expect(STATUS).toMatchObject({
      VALIDATION_FAILED: 400,
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      BOARD_NOT_FOUND: 404,
      EMAIL_TAKEN: 409,
      LINK_EXPIRED: 410,
      LINK_REVOKED: 410,
      RATE_LIMITED: 429,
      INTERNAL: 500,
      UNAVAILABLE: 503,
      BOARD_FULL: 507,
    });
  });

  test('the server status table is exactly the shared table', () => {
    expect(Object.keys(STATUS).sort()).toEqual(Object.keys(ERROR_CODES).sort());
    for (const [code, d] of Object.entries(ERROR_CODES)) {
      expect(STATUS[code]).toBe(d.status);
      const e = new AppError(code);
      expect(e.status).toBe(d.status);
      expect(e.message).toBe(d.message);
    }
  });

  test('errorDefinition knows server and client codes only', () => {
    expect(errorDefinition('BOARD_FULL')).toBe(ERROR_CODES.BOARD_FULL);
    expect(errorDefinition('NETWORK')).toBe(CLIENT_ERROR_CODES.NETWORK);
    expect(errorDefinition('NOPE')).toBeNull();
    expect(errorDefinition('toString')).toBeNull(); // no prototype lookups
    expect(errorDefinition(undefined)).toBeNull();
  });
});

describe('client messages (describeError)', () => {
  test('every code produces a non-empty, user-facing text', () => {
    for (const code of Object.keys(ALL)) {
      const text = describeError(new ApiError(ALL[code].status, code, 'server text', 'req-1'));
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).not.toMatch(/Request failed \(\d+\)/);
    }
  });

  test('specific server messages are kept where the contract allows it; generic codes use the client text', () => {
    const v = new ApiError(400, 'VALIDATION_FAILED', 'Invalid request: /title must NOT have more than 100 characters');
    expect(describeError(v)).toBe(v.message);
    expect(describeError(new ApiError(507, 'BOARD_FULL', 'x'))).toBe(ERROR_CODES.BOARD_FULL.userMessage);
    expect(describeError(new ApiError(410, 'LINK_REVOKED', 'x'))).toMatch(/Ask the board Owner/);
    // Socket.IO acknowledgements carry a plain { code, message, requestId } object.
    expect(describeError({ code: 'RATE_LIMITED', message: 'You are sending changes too quickly.' })).toBe(ERROR_CODES.RATE_LIMITED.userMessage);
  });

  test('unexpected server errors show a reference instead of details', () => {
    const text = describeError({ code: 'INTERNAL', message: 'An unexpected error occurred.', requestId: 'abc-123' });
    expect(text).toBe(`${ERROR_CODES.INTERNAL.userMessage} (reference: abc-123)`);
  });

  test('unknown codes and missing errors fall back safely', () => {
    expect(describeError({ code: 'SOMETHING_NEW', message: 'Newer server text' })).toBe('Newer server text');
    expect(describeError({ code: 'SOMETHING_NEW' })).toBe(GENERIC_ERROR_MESSAGE);
    expect(describeError(null)).toBe(GENERIC_ERROR_MESSAGE);
    expect(userMessageFor({})).toBe(GENERIC_ERROR_MESSAGE);
  });

  test('codeForStatus maps responses without an error object', () => {
    expect(codeForStatus(502)).toBe('UNAVAILABLE');
    expect(codeForStatus(504)).toBe('UNAVAILABLE');
    expect(codeForStatus(500)).toBe('INTERNAL');
    expect(codeForStatus(429)).toBe('RATE_LIMITED');
  });
});

describe('client api() error handling', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });
  const response = (status, body, headers = {}) => ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (h) => headers[h.toLowerCase()] ?? null },
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  });

  test('the common error object becomes an ApiError with code, message and requestId', async () => {
    globalThis.fetch = jest.fn(async () => response(403, { error: { code: 'FORBIDDEN', message: 'No.', requestId: 'r-1' } }));
    const err = await api('GET', '/boards/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, code: 'FORBIDDEN', message: 'No.', requestId: 'r-1' });
  });

  test('a proxy error page (no JSON) while the server is down becomes UNAVAILABLE', async () => {
    globalThis.fetch = jest.fn(async () => response(502, '<html>Bad gateway</html>'));
    const err = await api('GET', '/boards').catch((e) => e);
    expect(err.code).toBe('UNAVAILABLE');
    expect(describeError(err)).toMatch(/temporarily unavailable/);
  });

  test('a network failure becomes NETWORK', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const err = await api('GET', '/boards').catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK' });
    expect(describeError(err)).toMatch(/cannot be reached/);
  });
});

describe('server: toAppError and errorBody', () => {
  test('AppError passes through unchanged', () => {
    const e = new AppError('BOARD_FULL');
    expect(toAppError(e)).toBe(e);
  });

  test('a duplicate key becomes CONFLICT without the driver message or the duplicated value', () => {
    const dup = Object.assign(new Error('E11000 duplicate key error collection: whiteboard.users index: email_1 dup key: { email: "a@b.c" }'), {
      name: 'MongoServerError',
      code: 11000,
      keyPattern: { email: 1 },
      keyValue: { email: 'a@b.c' },
    });
    const e = toAppError(dup);
    expect(e).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(e.unexpected).toBeUndefined();
    const body = JSON.stringify(errorBody(e, 'r'));
    expect(body).not.toMatch(/E11000|email_1|a@b\.c|whiteboard/);
    expect(dbErrorDetails(dup)).toEqual({ dbError: 'MongoServerError', dbCode: 11000, keyFields: ['email'] });
    expect(JSON.stringify(dbErrorDetails(dup))).not.toMatch(/a@b\.c/);
  });

  test('Mongoose validation and cast errors become VALIDATION_FAILED', () => {
    const v = new mongoose.Error.ValidationError();
    expect(toAppError(v)).toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    const c = new mongoose.Error.CastError('ObjectId', 'not-an-id', '_id');
    expect(toAppError(c)).toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(errorBody(toAppError(c), 'r').message).not.toMatch(/not-an-id|ObjectId/);
    const docValidation = Object.assign(new Error('Document failed validation'), { name: 'MongoServerError', code: 121 });
    expect(toAppError(docValidation).code).toBe('VALIDATION_FAILED');
  });

  test('a lost database connection becomes UNAVAILABLE', () => {
    const down = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:27017'), { name: 'MongoServerSelectionError' });
    const e = toAppError(down);
    expect(e).toMatchObject({ code: 'UNAVAILABLE', status: 503 });
    expect(errorBody(e, 'r').message).not.toMatch(/ECONNREFUSED|27017/);
  });

  test('any other error becomes a generic INTERNAL marked unexpected', () => {
    const boom = new TypeError("Cannot read properties of undefined (reading 'ownerId')");
    const e = toAppError(boom);
    expect(e).toMatchObject({ code: 'INTERNAL', status: 500, unexpected: true });
    expect(e.cause).toBe(boom);
    expect(errorBody(e, 'r-9')).toEqual({ code: 'INTERNAL', message: ERROR_CODES.INTERNAL.message, requestId: 'r-9' });
    // errorBody itself never forwards a non-AppError message.
    expect(errorBody(boom, 'r').message).toBe(ERROR_CODES.INTERNAL.message);
    expect(toAppError(undefined).code).toBe('INTERNAL');
  });
});
