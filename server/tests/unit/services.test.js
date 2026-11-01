// Issue #19: unit tests of backend building blocks without a database: the common error object
// (errors.js), the per-board FIFO queue (boardQueue.js), log redaction and the security-event
// allow-list (logger.js), the per-connection operation rate limiter (realtimeServer.js) and the
// document/snapshot conversions and size accounting of the persistence layer (models.js, boardStore.js).
import mongoose from 'mongoose';
import { AppError, errorBody, STATUS } from '../../src/errors.js';
import { BoardQueues } from '../../src/realtime/boardQueue.js';
import { logger, redact, SECURITY_EVENTS } from '../../src/logger.js';
import { OpRateLimiter } from '../../src/realtime/realtimeServer.js';
import { toDocument, toRawDocument, toSnapshot } from '../../src/db/models.js';
import { contentContribution, objectBytes } from '../../src/realtime/boardStore.js';

describe('errors.js', () => {
  test('codes map to the documented HTTP statuses', () => {
    expect(STATUS).toMatchObject({ VALIDATION_FAILED: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, BOARD_NOT_FOUND: 404, NOT_FOUND: 404, LINK_EXPIRED: 410, RATE_LIMITED: 429, INTERNAL: 500, BOARD_FULL: 507 });
  });

  test('AppError carries code, status, default or custom message and extra fields', () => {
    const e = new AppError('BOARD_NOT_FOUND');
    expect([e.code, e.status, e.message]).toEqual(['BOARD_NOT_FOUND', 404, 'Board not found.']);
    expect(new AppError('VALIDATION_FAILED', 'Bad title').message).toBe('Bad title');
    expect(new AppError('SOMETHING_NEW').status).toBe(500);
    expect(new AppError('FORBIDDEN', undefined, { retryAfter: 3 }).retryAfter).toBe(3);
  });

  test('errorBody exposes only code, message and requestId; unknown errors become INTERNAL', () => {
    expect(errorBody(new AppError('FORBIDDEN'), 'req-1')).toEqual({ code: 'FORBIDDEN', message: expect.any(String), requestId: 'req-1' });
    const leak = new Error('MongoServerError: E11000 duplicate key users.email');
    expect(errorBody(leak, 'req-2')).toEqual({ code: 'INTERNAL', message: 'An unexpected error occurred.', requestId: 'req-2' });
  });
});

describe('BoardQueues', () => {
  const tick = () => new Promise((r) => setTimeout(r, 5));

  test('tasks of one board run one at a time in submission order', async () => {
    const q = new BoardQueues();
    const log = [];
    const task = (name, ms) => async () => {
      log.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, ms));
      log.push(`end ${name}`);
      return name;
    };
    const results = await Promise.all([q.run('b1', task('a', 20)), q.run('b1', task('b', 1)), q.run('b1', task('c', 1))]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  test('different boards do not wait for each other', async () => {
    const q = new BoardQueues();
    let release;
    const slow = q.run('b1', () => new Promise((r) => (release = r)));
    let fastDone = false;
    await q.run('b2', async () => {
      fastDone = true;
    });
    expect(fastDone).toBe(true);
    release();
    await slow;
  });

  test('a failing task rejects only its own caller and the queue continues', async () => {
    const q = new BoardQueues();
    const failed = q.run('b1', async () => {
      throw new AppError('INTERNAL');
    });
    const next = q.run('b1', async () => 'still runs');
    await expect(failed).rejects.toMatchObject({ code: 'INTERNAL' });
    await expect(next).resolves.toBe('still runs');
  });

  test('idle() resolves after every queued task and the queue map is emptied', async () => {
    const q = new BoardQueues();
    let done = 0;
    for (let i = 0; i < 3; i += 1) q.run(`b${i % 2}`, async () => {
      await tick();
      done += 1;
    });
    await q.idle();
    expect(done).toBe(3);
    await tick();
    expect(q.tails.size).toBe(0);
  });
});

describe('logger.js', () => {
  let lines;
  let remove;
  let level;
  beforeEach(() => {
    lines = [];
    level = logger.level;
    logger.configure({ level: 'info', stdout: false });
    remove = logger.addSink((l) => lines.push(JSON.parse(l)));
  });
  afterEach(() => {
    remove();
    logger.configure({ level, stdout: false });
  });

  test('redact removes passwords, tokens, e-mail addresses and board content at any depth', () => {
    const out = redact({
      boardId: 'b1',
      password: 'p',
      token: 't',
      guestToken: 'g',
      Authorization: 'Bearer x',
      email: 'a@b.c',
      text: 'secret note',
      nested: { points: [[1, 2]], payload: { x: 1 }, keep: 1 },
      list: [{ objects: [], ok: true }],
    });
    expect(out).toEqual({ boardId: 'b1', nested: { keep: 1 }, list: [{ ok: true }] });
  });

  test('entries below the configured level are dropped; others are JSON with timestamp, level and event', () => {
    logger.debug('noise', { a: 1 });
    logger.info('board.renamed', { boardId: 'b1', title: 'not secret', password: 'x' });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'info', event: 'board.renamed', boardId: 'b1' });
    expect(lines[0].password).toBeUndefined();
    expect(Date.parse(lines[0].timestamp)).not.toBeNaN();
  });

  test('security events: only allow-listed fields and detail keys are written; unknown events throw', () => {
    logger.security({
      event: 'board.deleted',
      requestId: 'r1',
      actor: { type: 'user', id: 'u1', email: 'a@b.c' },
      boardId: 'b1',
      outcome: 'success',
      details: { role: 'owner', token: 'leak' },
      extra: 'dropped',
    });
    expect(lines[0]).toEqual({
      timestamp: expect.any(String),
      level: 'info',
      event: 'board.deleted',
      security: true,
      requestId: 'r1',
      actorType: 'user',
      actorId: 'u1',
      boardId: 'b1',
      subjectId: null,
      outcome: 'success',
      reason: null,
      details: { role: 'owner' },
    });
    expect(() => logger.security({ event: 'board.renamed', outcome: 'success' })).toThrow(/Unknown security event/);
    expect(SECURITY_EVENTS.has('board.deleted')).toBe(true);
  });
});

describe('OpRateLimiter (SEC-REQ-006)', () => {
  test('at most 30 operations in any one-second window; capacity returns as the window slides', () => {
    let now = 0;
    const lim = new OpRateLimiter(30, 1000, () => now);
    for (let i = 0; i < 30; i += 1) expect(lim.allow()).toBe(true);
    expect(lim.allow()).toBe(false);
    now = 999;
    expect(lim.allow()).toBe(false);
    now = 1000; // the first 30 (at t = 0) leave the window
    expect(lim.allow()).toBe(true);
  });
});

describe('persistence conversions and size accounting', () => {
  const boardId = new mongoose.Types.ObjectId();
  const stroke = { id: 's1', kind: 'stroke', points: [[1.5, 2.5], [3, 4]], color: '#000000', strokeWidth: 2 };

  test('snapshot -> document -> snapshot round-trips every kind and drops foreign fields', () => {
    const objs = [
      stroke,
      { id: 'r1', kind: 'rect', x: 1, y: 2, w: 3, h: 4, color: '#D32F2F', strokeWidth: 5 },
      { id: 'l1', kind: 'line', x1: 1, y1: 2, x2: 3, y2: 4, color: '#D32F2F', strokeWidth: 5 },
      { id: 't1', kind: 'text', x: 1, y: 2, text: 'hi', color: '#D32F2F', strokeWidth: 5 },
    ];
    for (const o of objs) {
      const doc = toDocument(boardId, o, 7);
      expect(doc).toMatchObject({ boardId, objectId: o.id, updatedSeq: 7 });
      expect(doc.id).toBeUndefined();
      expect(toSnapshot({ ...doc, _id: 'x', junk: 1 })).toEqual(o);
    }
  });

  test('toRawDocument stores the board id as an ObjectId even when given a string', () => {
    const doc = toRawDocument(String(boardId), stroke, 1);
    expect(doc.boardId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(String(doc.boardId)).toBe(String(boardId));
  });

  test('object size (M2) is the BSON size of the snapshot form; M3 adds 9 bytes per object', () => {
    const bytes = objectBytes(stroke);
    expect(bytes).toBe(mongoose.mongo.BSON.calculateObjectSize(stroke));
    expect(objectBytes({ ...stroke, extra: 'x'.repeat(1000) })).toBe(bytes); // foreign fields not counted
    expect(contentContribution(stroke)).toBe(bytes + 9);
  });
});
