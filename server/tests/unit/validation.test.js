// Issue #19: unit tests of server/src/validation.js (SEC-REQ-005): REST bodies, the op:submit
// envelope, operation payloads against the current board state, and the Idempotency-Key header.
import { LIMITS } from '@wb/shared/objects';
import { AppError } from '../../src/errors.js';
import { validateBody, validateEnvelope, validateIdempotencyKey, validateJoin, validateOperation } from '../../src/validation.js';

/** Runs fn and returns the AppError code it throws (or null if it does not throw). */
function codeOf(fn) {
  try {
    fn();
    return null;
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    return err.code;
  }
}

const style = { color: '#1E88E5', strokeWidth: 3 };
const rect = { id: 'r1', kind: 'rect', x: 10, y: 20, w: 30, h: 40, ...style };
const board = () => new Map([[rect.id, rect]]);

describe('REST bodies', () => {
  test.each(['createBoard', 'renameBoard'])('%s: 1–100 characters, not blank, string only, no extra fields', (name) => {
    for (const title of ['a', 'Sprint planning', 'x'.repeat(LIMITS.MAX_TITLE), ' padded ']) expect(validateBody(name, { title })).toEqual({ title });
    for (const body of [{ title: '' }, { title: '   ' }, { title: 'x'.repeat(LIMITS.MAX_TITLE + 1) }, { title: 1 }, {}, null, undefined, { title: 'a', x: 1 }]) {
      expect(codeOf(() => validateBody(name, body))).toBe('VALIDATION_FAILED');
    }
  });

  test('register: e-mail format, 8–72 character password, 1–30 character display name', () => {
    const ok = { email: 'a@b.co', password: 'x'.repeat(8), displayName: 'A' };
    expect(validateBody('register', ok)).toBe(ok);
    expect(validateBody('register', { ...ok, password: 'x'.repeat(72), displayName: 'n'.repeat(30) })).toBeTruthy();
    for (const bad of [
      { ...ok, email: 'no-at-sign' },
      { ...ok, password: 'x'.repeat(7) },
      { ...ok, password: 'x'.repeat(73) },
      { ...ok, displayName: '' },
      { ...ok, displayName: ' ' },
      { ...ok, displayName: 'n'.repeat(31) },
      { ...ok, role: 'admin' },
    ]) {
      expect(codeOf(() => validateBody('register', bad))).toBe('VALIDATION_FAILED');
    }
  });

  test('createLink, patchMember and transfer accept only their documented values', () => {
    expect(validateBody('createLink', { role: 'viewer' })).toBeTruthy();
    expect(validateBody('createLink', { role: 'editor', expiresIn: '24h' })).toBeTruthy();
    for (const bad of [{ role: 'owner' }, { role: 'editor', expiresIn: '2d' }, {}]) expect(codeOf(() => validateBody('createLink', bad))).toBe('VALIDATION_FAILED');
    expect(codeOf(() => validateBody('patchMember', { role: 'owner' }))).toBe('VALIDATION_FAILED');
    expect(validateBody('transfer', { newOwnerId: 'u1', confirm: true })).toBeTruthy();
    for (const bad of [{ newOwnerId: 'u1' }, { newOwnerId: 'u1', confirm: 'true' }, { newOwnerId: 'u1', confirm: false }]) {
      expect(codeOf(() => validateBody('transfer', bad))).toBe('VALIDATION_FAILED');
    }
  });

  test('error messages are short and name the problem', () => {
    try {
      validateBody('createBoard', { title: 'x'.repeat(500) });
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message.length).toBeLessThanOrEqual(200);
      expect(err.message).toMatch(/title/);
    }
  });
});

describe('real-time envelope and join', () => {
  const env = { boardId: 'b1', clientOpId: 'c1', type: 'object:add', payload: {} };
  test('a complete envelope passes; missing, unknown or extra fields fail', () => {
    expect(() => validateEnvelope(env)).not.toThrow();
    for (const bad of [{ ...env, type: 'board:delete' }, { ...env, extra: 1 }, { boardId: 'b1' }, { ...env, payload: 'x' }, null]) {
      expect(codeOf(() => validateEnvelope(bad))).toBe('VALIDATION_FAILED');
    }
  });
  test('join needs exactly a boardId', () => {
    expect(() => validateJoin({ boardId: 'b1' })).not.toThrow();
    for (const bad of [{}, { boardId: '' }, { boardId: 'b1', role: 'owner' }]) expect(codeOf(() => validateJoin(bad))).toBe('VALIDATION_FAILED');
  });
});

describe('operations against the board state', () => {
  test('object:add validates every kind and refuses duplicate ids', () => {
    const objs = [
      { id: 's1', kind: 'stroke', points: [[1, 2], [3, 4]], ...style },
      { id: 'e1', kind: 'ellipse', x: 0, y: 0, w: 5, h: 5, ...style },
      { id: 'l1', kind: 'line', x1: 0, y1: 0, x2: 5, y2: 5, ...style },
      { id: 't1', kind: 'text', x: 0, y: 0, text: 'hi', ...style },
    ];
    for (const o of objs) expect(() => validateOperation('object:add', o, board())).not.toThrow();
    expect(codeOf(() => validateOperation('object:add', rect, board()))).toBe('VALIDATION_FAILED'); // id exists
    for (const bad of [
      { ...rect, id: 'r2', kind: 'triangle' },
      { ...rect, id: 'r2', strokeWidth: 0 },
      { ...rect, id: 'r2', strokeWidth: 21 },
      { ...rect, id: 'r2', color: 'red' },
      { ...rect, id: 'r2', w: -1 },
      { ...rect, id: 'r2', x: LIMITS.MAX_COORD + 1 },
      { ...rect, id: 'bad id!' },
      { ...rect, id: 'r2', onclick: 'x' },
      { id: 't2', kind: 'text', x: 0, y: 0, text: 'x'.repeat(LIMITS.MAX_TEXT + 1), ...style },
      { id: 's2', kind: 'stroke', points: [], ...style },
    ]) {
      expect(codeOf(() => validateOperation('object:add', bad, board()))).toBe('VALIDATION_FAILED');
    }
  });

  test('object:update merges with the current object and allows only its updatable properties', () => {
    expect(() => validateOperation('object:update', { id: 'r1', x: 99, color: '#000000' }, board())).not.toThrow();
    expect(codeOf(() => validateOperation('object:update', { id: 'missing', x: 1 }, board()))).toBe('OBJECT_NOT_FOUND');
    expect(codeOf(() => validateOperation('object:update', { id: 'r1' }, board()))).toBe('VALIDATION_FAILED'); // nothing to update
    expect(codeOf(() => validateOperation('object:update', { id: 'r1', kind: 'ellipse' }, board()))).toBe('VALIDATION_FAILED');
    expect(codeOf(() => validateOperation('object:update', { id: 'r1', text: 'no' }, board()))).toBe('VALIDATION_FAILED'); // not a rect property
    expect(codeOf(() => validateOperation('object:update', { id: 'r1', strokeWidth: 50 }, board()))).toBe('VALIDATION_FAILED');
    expect(codeOf(() => validateOperation('object:update', { x: 1 }, board()))).toBe('VALIDATION_FAILED');
  });

  test('object:delete needs an existing id; board:clear needs an empty payload; unknown types fail', () => {
    expect(() => validateOperation('object:delete', { id: 'r1' }, board())).not.toThrow();
    expect(codeOf(() => validateOperation('object:delete', { id: 'nope' }, board()))).toBe('OBJECT_NOT_FOUND');
    expect(codeOf(() => validateOperation('object:delete', { id: 'r1', x: 1 }, board()))).toBe('VALIDATION_FAILED');
    expect(() => validateOperation('board:clear', {}, board())).not.toThrow();
    expect(codeOf(() => validateOperation('board:clear', { all: true }, board()))).toBe('VALIDATION_FAILED');
    expect(codeOf(() => validateOperation('board:drop', {}, board()))).toBe('VALIDATION_FAILED');
  });
});

test('Idempotency-Key must be a UUID and is normalised to lower case', () => {
  expect(validateIdempotencyKey('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  for (const bad of [undefined, '', 'abc', '3f2504e0-4f89-41d3-9a0c-0305e82c330', 42]) expect(codeOf(() => validateIdempotencyKey(bad))).toBe('VALIDATION_FAILED');
});
