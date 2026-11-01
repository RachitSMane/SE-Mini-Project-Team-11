// Issue #20: database validation and data integrity.
// - required fields and constraints at the persistence layer (Mongoose schemas),
// - the MongoDB $jsonSchema validator on boardObjects (native-driver writes),
// - duplicate and invalid data scenarios,
// - update and delete operations keep the database consistent,
// - the start-up integrity check removes orphans and leftover Owner rows,
// - database errors become the common error object (CONFLICT / VALIDATION_FAILED), never raw text.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { LIMITS } from '@wb/shared/objects';
import { rect, scriptedClient, startTestServer, stroke, text, uniqueDbUrl, waitFor } from '../helpers/harness.js';
import { apiClient, expectError } from '../helpers/api.js';
import { Board, BoardObject, DURABLE, Membership, ShareLink, toSnapshot, User, Version } from '../../src/db/models.js';
import { checkIntegrity, problemCount } from '../../src/db/integrity.js';
import { contentContribution } from '../../src/realtime/boardStore.js';
import { errorBody, toAppError } from '../../src/errors.js';

const oid = () => new mongoose.Types.ObjectId();
const BCRYPT = `$2b$04$${'a'.repeat(53)}`;
const emoji = (n) => '😀'.repeat(n); // 1 character (code point) = 2 UTF-16 code units

let srv;
let c;
const open = [];
beforeAll(async () => {
  srv = await startTestServer({ MONGO_URL: uniqueDbUrl('integrity') });
  c = apiClient(srv);
});
afterAll(async () => {
  for (const x of open) x.close();
  await srv?.stop();
});

describe('Mongoose schemas: required fields and constraints', () => {
  test('users: required fields, e-mail format and normalisation, display-name length in characters, password hash format', async () => {
    await expect(User.create({ email: 'a@example.test', displayName: 'A' })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(User.create({ email: 'not-an-email', passwordHash: BCRYPT, displayName: 'A' })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(User.create({ email: 'b@example.test', passwordHash: 'plain-text-password', displayName: 'B' })).rejects.toMatchObject({
      name: 'ValidationError',
    });
    await expect(User.create({ email: 'c@example.test', passwordHash: BCRYPT, displayName: 'x'.repeat(31) })).rejects.toMatchObject({
      name: 'ValidationError',
    });
    await expect(User.create({ email: 'd@example.test', passwordHash: BCRYPT, displayName: '   ' })).rejects.toMatchObject({ name: 'ValidationError' });
    // 30 characters are allowed even when each one is two UTF-16 code units (same rule as the API).
    const u = await User.create({ email: '  MiXeD@Example.TEST ', passwordHash: BCRYPT, displayName: emoji(30) });
    expect(u.email).toBe('mixed@example.test');
  });

  test('boards: title 1–100 characters and not blank; seq and contentBytes not negative', async () => {
    const ownerId = oid();
    await expect(Board.create({ ownerId })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Board.create({ ownerId, title: 'x'.repeat(LIMITS.MAX_TITLE + 1) })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Board.create({ ownerId, title: '  ' })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Board.create({ ownerId, title: 'ok', seq: -1 })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Board.create({ ownerId, title: 'ok', contentBytes: -5 })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Board.create({ title: 'no owner' })).rejects.toMatchObject({ name: 'ValidationError' });
    const b = await Board.create({ ownerId, title: emoji(LIMITS.MAX_TITLE) });
    await Board.deleteOne({ _id: b._id });
  });

  test('memberships, share links and versions: roles, token hashes and version numbers', async () => {
    const boardId = oid();
    await expect(Membership.create({ boardId, userId: oid(), role: 'owner' })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Membership.create({ boardId, role: 'viewer' })).rejects.toMatchObject({ name: 'ValidationError' });
    const link = { boardId, role: 'viewer', expiresAt: new Date(Date.now() + 60_000), createdBy: oid() };
    await expect(ShareLink.create({ ...link, tokenHash: 'the-raw-token' })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(ShareLink.create({ ...link, tokenHash: 'a'.repeat(64), role: 'owner' })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(ShareLink.create({ ...link, tokenHash: 'a'.repeat(64), expiresAt: undefined })).rejects.toMatchObject({ name: 'ValidationError' });
    const version = { boardId, boardSeq: 0, trigger: 'periodic', createdAt: new Date() };
    await expect(Version.create({ ...version, number: 0 })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Version.create({ ...version, number: 1.5 })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Version.create({ ...version, number: 1, trigger: 'manual' })).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('board objects (Mongoose path, used by restore): kind, colour, stroke width, text length', async () => {
    const base = { boardId: oid(), updatedSeq: 1 };
    const bad = [
      { ...base, objectId: 'k1', kind: 'circle', x: 0, y: 0, color: '#000000', strokeWidth: 1 },
      { ...base, objectId: 'k2', kind: 'rect', x: 0, y: 0, w: 1, h: 1, color: 'red', strokeWidth: 1 },
      { ...base, objectId: 'k3', kind: 'rect', x: 0, y: 0, w: 1, h: 1, color: '#000000', strokeWidth: 2.5 },
      { ...base, objectId: 'k4', kind: 'rect', x: 0, y: 0, w: 1, h: 1, color: '#000000', strokeWidth: 21 },
      { ...base, objectId: 'k5', kind: 'text', x: 0, y: 0, text: emoji(LIMITS.MAX_TEXT + 1), color: '#000000', strokeWidth: 1 },
      { ...base, objectId: 'bad id!', kind: 'rect', x: 0, y: 0, w: 1, h: 1, color: '#000000', strokeWidth: 1 },
      { ...base, objectId: 'k7', kind: 'rect', x: LIMITS.MAX_COORD + 1, y: 0, w: 1, h: 1, color: '#000000', strokeWidth: 1 },
    ];
    for (const doc of bad) await expect(BoardObject.create(doc)).rejects.toMatchObject({ name: 'ValidationError' });
    const ok = await BoardObject.create({ ...base, objectId: 'k8', kind: 'text', x: 0, y: 0, text: emoji(LIMITS.MAX_TEXT), color: '#000000', strokeWidth: 1 });
    await BoardObject.deleteOne({ _id: ok._id });
  });
});

describe('MongoDB $jsonSchema validator on boardObjects (native-driver writes)', () => {
  const raw = (extra) => ({ boardId: oid(), objectId: `n${Math.random().toString(36).slice(2, 10)}`, color: '#000000', strokeWidth: 3, updatedSeq: 1, ...extra });
  const rectDoc = (extra = {}) => raw({ kind: 'rect', x: 1, y: 2, w: 3, h: 4, ...extra });

  test('the database itself rejects invalid documents with error 121', async () => {
    const coll = BoardObject.collection;
    const bad = [
      rectDoc({ strokeWidth: 0 }),
      rectDoc({ strokeWidth: 21 }),
      rectDoc({ strokeWidth: 2.5 }),
      rectDoc({ color: 'red' }),
      rectDoc({ w: -1 }),
      rectDoc({ x: LIMITS.MAX_COORD + 1 }),
      rectDoc({ injected: { $where: 'x' } }), // unknown field
      rectDoc({ kind: 'circle' }),
      rectDoc({ objectId: 'bad id!' }),
      raw({ kind: 'rect', x: 1, y: 2, w: 3 }), // geometry incomplete for the kind
      raw({ kind: 'stroke', points: Array.from({ length: LIMITS.MAX_POINTS + 1 }, (_, i) => [i, i]) }),
      raw({ kind: 'stroke', points: [[1, 2, 3]] }),
      raw({ kind: 'text', x: 0, y: 0, text: '' }),
      raw({ kind: 'text', x: 0, y: 0, text: emoji(LIMITS.MAX_TEXT + 1) }),
      { boardId: oid(), objectId: 'm1', kind: 'rect', x: 1, y: 2, w: 3, h: 4, updatedSeq: 1 }, // no colour or width
    ];
    for (const doc of bad) await expect(coll.insertOne(doc, DURABLE)).rejects.toMatchObject({ code: 121 });
  });

  test('valid documents at the limits are accepted, and updates are validated too', async () => {
    const coll = BoardObject.collection;
    const docs = [
      raw({ kind: 'stroke', points: Array.from({ length: LIMITS.MAX_POINTS }, (_, i) => [i, -i]) }),
      raw({ kind: 'text', x: 0, y: 0, text: emoji(LIMITS.MAX_TEXT) }), // counted in characters, like the API
      raw({ kind: 'line', x1: -LIMITS.MAX_COORD, y1: 0, x2: LIMITS.MAX_COORD, y2: 0.5, strokeWidth: 20 }),
      raw({ kind: 'ellipse', x: 0, y: 0, w: 0, h: 0, strokeWidth: 1 }),
    ];
    for (const d of docs) await coll.insertOne(d, DURABLE);
    const target = { boardId: docs[3].boardId, objectId: docs[3].objectId };
    await expect(coll.updateOne(target, { $set: { strokeWidth: 99 } }, DURABLE)).rejects.toMatchObject({ code: 121 });
    await expect(coll.updateOne(target, { $unset: { color: 1 } }, DURABLE)).rejects.toMatchObject({ code: 121 });
    await coll.updateOne(target, { $set: { strokeWidth: 7 } }, DURABLE);
    expect((await coll.findOne(target)).strokeWidth).toBe(7);
    await coll.deleteMany({ objectId: { $in: docs.map((d) => d.objectId) } });
  });

  test('a validation failure becomes VALIDATION_FAILED without database details', async () => {
    const err = await BoardObject.collection.insertOne(rectDoc({ color: 'red' }), DURABLE).catch((e) => e);
    const body = errorBody(toAppError(err), 'r');
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.message).not.toMatch(/schema|boardObjects|121|failed validation/i);
  });
});

describe('duplicate and invalid data through the application', () => {
  test('duplicate e-mail (any case, also two registrations at the same time) is EMAIL_TAKEN', async () => {
    const pw = 'Pw-correct-horse-1';
    const first = await c.call('post', '/auth/register', null, { email: 'dup@example.test', password: pw, displayName: 'One' });
    expect(first.status).toBe(201);
    expectError(await c.call('post', '/auth/register', null, { email: 'DUP@Example.Test', password: pw, displayName: 'Two' }), 409, 'EMAIL_TAKEN');
    const both = await Promise.all(
      ['race@example.test', 'RACE@example.test'].map((email) => c.call('post', '/auth/register', null, { email, password: pw, displayName: 'R' })),
    );
    expect(both.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await User.countDocuments({ email: 'race@example.test' })).toBe(1);
  });

  test('duplicate membership or object id hits the unique index and maps to CONFLICT', async () => {
    const boardId = oid();
    const userId = oid();
    await Membership.create({ boardId, userId, role: 'viewer' });
    const dupMember = await Membership.create({ boardId, userId, role: 'editor' }).catch((e) => e);
    expect(dupMember.code).toBe(11000);
    expect(toAppError(dupMember)).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(errorBody(toAppError(dupMember), 'r').message).not.toMatch(/E11000|memberships|dup key/);
    expect(await Membership.countDocuments({ boardId, userId })).toBe(1);
    await Membership.deleteMany({ boardId });
  });

  test('invalid operations are rejected before anything is written; duplicate object ids are refused', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token, 'Validation');
    const o = await scriptedClient(srv.url, O.token, boardId);
    open.push(o);
    const r = rect();
    expect((await o.submitAck('object:add', r)).ok).toBe(true);
    for (const payload of [r, { ...rect(), strokeWidth: 21 }, { ...rect(), color: 'blue' }, { ...rect(), kind: 'circle' }]) {
      const ack = await o.submitAck('object:add', payload);
      expect(ack.ok).toBe(false);
      expect(ack.error.code).toBe('VALIDATION_FAILED');
    }
    expect(await BoardObject.countDocuments({ boardId })).toBe(1);
    expect((await Board.findById(boardId).lean()).seq).toBe(1);
  });
});

describe('update and delete operations keep the database consistent', () => {
  test('seq, updatedSeq and contentBytes match the stored objects after adds, updates and deletes', async () => {
    const O = await c.register('Owner');
    const boardId = await c.createBoard(O.token, 'Consistency');
    const o = await scriptedClient(srv.url, O.token, boardId);
    open.push(o);
    const a = rect();
    const s = stroke(50);
    const t = text('hello');
    for (const obj of [a, s, t]) expect((await o.submitAck('object:add', obj)).ok).toBe(true);
    expect((await o.submitAck('object:update', { id: a.id, x: 99, color: '#D32F2F' })).ok).toBe(true);
    expect((await o.submitAck('object:delete', { id: s.id })).ok).toBe(true);
    expect((await o.submitAck('object:update', { id: s.id, x: 1 })).error.code).toBe('OBJECT_NOT_FOUND');

    const board = await Board.findById(boardId).lean();
    const docs = await BoardObject.find({ boardId }).lean();
    expect(board.seq).toBe(5);
    expect(docs.map((d) => d.objectId).sort()).toEqual([a.id, t.id].sort());
    expect(docs.find((d) => d.objectId === a.id)).toMatchObject({ x: 99, color: '#D32F2F', updatedSeq: 4 });
    expect(Math.max(...docs.map((d) => d.updatedSeq))).toBeLessThanOrEqual(board.seq);
    expect(board.contentBytes).toBe(docs.reduce((n, d) => n + contentContribution(toSnapshot(d)), 0));
  });

  test('deleting a board removes all of its objects, versions, memberships and links', async () => {
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const boardId = await c.createBoard(O.token, 'Delete me');
    await c.addMember(O.token, boardId, E.token, 'editor');
    const o = await scriptedClient(srv.url, O.token, boardId);
    expect((await o.submitAck('object:add', rect())).ok).toBe(true);
    o.close(); // last participant leaves -> a version is written
    await waitFor(async () => (await Version.countDocuments({ boardId })) > 0, { message: 'last-participant version' });
    expect((await c.call('delete', `/boards/${boardId}`, O.token)).status).toBe(204);
    for (const Model of [Board, BoardObject, Version, Membership, ShareLink]) {
      expect(await Model.countDocuments(Model === Board ? { _id: boardId } : { boardId })).toBe(0);
    }
  });
});

describe('start-up integrity check', () => {
  test('orphans of a half-deleted board and a leftover Owner row are reported, then removed at restart; valid data is kept', async () => {
    const O = await c.register('Owner');
    const E = await c.register('Editor');
    const keep = await c.createBoard(O.token, 'Keep');
    const gone = await c.createBoard(O.token, 'Crashed delete');
    for (const b of [keep, gone]) await c.addMember(O.token, b, E.token, 'viewer');
    for (const b of [keep, gone]) {
      const x = await scriptedClient(srv.url, O.token, b);
      expect((await x.submitAck('object:add', rect())).ok).toBe(true);
      x.close();
      // Wait for the last-participant version so no write is still running when the board is "crashed".
      await waitFor(async () => (await Version.countDocuments({ boardId: b })) > 0, { message: 'last-participant version' });
    }
    // A crash in deleteBoard after the board document was removed, before its children.
    await Board.deleteOne({ _id: gone }, DURABLE);
    // A transfer interrupted between steps 3 and 4: a membership row for the board's own Owner.
    await Membership.create({ boardId: keep, userId: O.id, role: 'editor' });
    // A membership of an account that does not exist.
    await Membership.create({ boardId: keep, userId: oid(), role: 'viewer' });

    const dry = await checkIntegrity({ repair: false });
    expect(dry.orphans.elements).toBeGreaterThanOrEqual(1);
    expect(dry.orphans.memberships).toBeGreaterThanOrEqual(1);
    expect(dry.orphans.shareLinks).toBeGreaterThanOrEqual(1);
    expect(dry.orphans.versions).toBeGreaterThanOrEqual(1);
    expect(dry.ownerMemberships).toBeGreaterThanOrEqual(1);
    expect(dry.missingUserMemberships).toBeGreaterThanOrEqual(1);
    expect(await BoardObject.countDocuments({ boardId: gone })).toBe(1); // dry run deletes nothing

    // Restart on the same database: recovery runs the check before accepting connections.
    const { mongoUrl } = srv;
    for (const x of open.splice(0)) x.close();
    await srv.stop();
    // The start-up log is written before an in-memory sink can be attached, so use a log file.
    const logFile = path.join(os.tmpdir(), `wb-integrity-${process.pid}-${Date.now()}.log`);
    srv = await startTestServer({ MONGO_URL: mongoUrl, LOG_FILE: logFile });
    c = apiClient(srv);
    const startupLog = fs.readFileSync(logFile, 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l));
    fs.rmSync(logFile, { force: true });

    const repaired = startupLog.filter((l) => l.event === 'integrity.repaired');
    expect(repaired).toHaveLength(1);
    expect(repaired[0]).toMatchObject({ ownerMemberships: 1, missingUserMemberships: 1, repaired: true });
    expect(repaired[0].orphans).toMatchObject({ elements: 1, memberships: 1, shareLinks: 1, versions: 1 });
    expect(JSON.stringify(repaired[0])).not.toMatch(/@example\.test/); // counts only, no personal data
    for (const Model of [BoardObject, Version, Membership, ShareLink]) expect(await Model.countDocuments({ boardId: gone })).toBe(0);
    expect(await Membership.countDocuments({ boardId: keep, userId: O.id })).toBe(0);
    expect(await Membership.countDocuments({ boardId: keep, userId: E.id })).toBe(1);
    expect(await BoardObject.countDocuments({ boardId: keep })).toBe(1);
    expect(problemCount(await checkIntegrity({ repair: false }))).toBe(0);

    // The kept board still works: the Owner is Owner and the Editor's viewer membership is intact.
    expect((await c.call('get', `/boards/${keep}`, O.token)).body.role).toBe('owner');
    expect((await c.call('get', `/boards/${keep}`, E.token)).body.role).toBe('viewer');
    expectError(await c.call('get', `/boards/${gone}`, O.token), 404, 'BOARD_NOT_FOUND');
  });
});
