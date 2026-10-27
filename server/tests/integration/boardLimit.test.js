// TC-022 — board content size limit (FR-008, D11c). Fills a board through a scripted Editor with
// deterministic generated strokes (gen-board-fill), records M1/M2/M3, then tests the exact boundary:
// an object of exactly R + 1 bytes is rejected with BOARD_FULL and one of exactly R bytes is accepted.
import { jest } from '@jest/globals';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import mongoose from 'mongoose';
import { LIMITS } from '@wb/shared/objects';
import { rect, scriptedClient, startTestServer, waitFor } from '../helpers/harness.js';
import { apiClient, logEvents } from '../helpers/api.js';
import { contentContribution, objectBytes } from '../../src/realtime/boardStore.js';
import { Board, BoardObject, Version } from '../../src/db/models.js';

jest.setTimeout(300000);
const LIMIT = LIMITS.BOARD_CONTENT_LIMIT;

/** Deterministic PRNG (mulberry32) so that every run generates the same board. */
function prng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** gen-board-fill: stroke i with n points; coordinates with one decimal (never integral). */
function genStroke(rand, i, n = LIMITS.MAX_POINTS) {
  const points = Array.from({ length: n }, () => [Math.floor(rand() * 9000) + 100.5, Math.floor(rand() * 9000) + 100.5]);
  return { id: `fill-${String(i).padStart(4, '0')}`, kind: 'stroke', points, color: '#1E88E5', strokeWidth: 2 };
}

const textObj = (id, k) => ({ id, kind: 'text', x: 10.5, y: 10.5, text: 'a'.repeat(k), color: '#000000', strokeWidth: 1 });
/** M1: bytes of the Engine.IO frame carrying the op:submit (acknowledgement id up to 6 digits). */
const m1 = (boardId, payload) => Buffer.byteLength(`42/board,999999${JSON.stringify(['op:submit', { boardId, clientOpId: 'c'.repeat(24), type: 'object:add', payload }])}`);

let srv;
const open = [];
afterAll(async () => {
  for (const x of open) x.close();
  await srv?.stop();
});

test('TC-022: fill to the 15 MiB limit; exact boundary; version near the limit; space reusable after deletion', async () => {
  srv = await startTestServer({ VERSION_INTERVAL_MS: '0' });
  const c = apiClient(srv);
  const O = await c.register('Owner');
  const E = await c.register('Editor');
  const boardId = await c.createBoard(O.token);
  await c.addMember(O.token, boardId, E.token, 'editor');
  const e = await scriptedClient(srv.url, E.token, boardId);
  const o = await scriptedClient(srv.url, O.token, boardId);
  open.push(e, o);
  // Diagnostics for the step-6 failure under load (IMPLEMENTATION_STATUS §6, issue 2): record socket
  // disconnects, and report the error code of a failed acknowledgement, not only ok: false.
  const tStart = Date.now();
  const diag = { disconnects: [] };
  // Event-loop delay over the whole test: server and both clients share this process, so a long
  // synchronous step anywhere here also delays the Socket.IO heartbeat.
  const wholeLoop = monitorEventLoopDelay({ resolution: 20 });
  wholeLoop.enable();
  // Timeline: every event-loop stall above 500 ms, and the longest gap between heartbeat pings per client.
  diag.stalls = [];
  let tick = Date.now();
  const stallTimer = setInterval(() => {
    const now = Date.now();
    if (now - tick > 600) diag.stalls.push({ atMs: tick - tStart, ms: now - tick - 100 });
    tick = now;
  }, 100);
  stallTimer.unref(); // never keeps Jest alive if the test fails before clearInterval
  diag.pingGaps = {};
  for (const [who, cl] of [['editor', e], ['owner', o]]) {
    let last = Date.now();
    cl.socket.io.on('ping', () => {
      const now = Date.now();
      if (!diag.pingGaps[who] || now - last > diag.pingGaps[who].ms) diag.pingGaps[who] = { ms: now - last, endAtMs: now - tStart };
      last = now;
    });
  }
  const phase = (name, t) => {
    diag.phasesMs = { ...diag.phasesMs, [name]: Date.now() - t };
  };
  for (const [who, cl] of [['editor', e], ['owner', o]]) cl.socket.on('disconnect', (reason) => diag.disconnects.push({ who, reason, atMs: Date.now() - tStart }));
  const failure = (what, extra) => new Error(`${what}: ${JSON.stringify({ ...extra, editorStatus: e.sync.status, ownerStatus: o.sync.status, atMs: Date.now() - tStart, ...diag, serverLog: srv.parsedLogs().filter((l) => /^(op|db|version|recovery)\./.test(l.event)).slice(-5) })}`);
  // An operation discarded by a reconnection is never acknowledged, so wait at most 60 s for it.
  const expectOk = async (pending, step) => {
    let timer;
    const ack = await Promise.race([pending, new Promise((r) => { timer = setTimeout(() => r(null), 60000); })]);
    clearTimeout(timer);
    if (ack?.ok !== true) throw failure(`${step} not acknowledged`, { ack: ack ?? 'none within 60 s' });
  };
  const rand = prng(22);
  let m3 = 0;
  let maxM1 = 0;
  let i = 0;
  const ackMs = []; // acknowledgement latency of every generated stroke (timing diagnostics)
  const submit = async (obj) => {
    const frame = m1(boardId, obj);
    maxM1 = Math.max(maxM1, frame);
    expect(frame).toBeLessThanOrEqual(LIMITS.MAX_MESSAGE_BYTES);
    const tAck = performance.now();
    const ack = await e.submitAck('object:add', obj);
    ackMs.push(performance.now() - tAck);
    await new Promise((r) => setTimeout(r, 40)); // < 30 operations/s (SEC-REQ-006)
    return ack;
  };

  // Step 1: fill with full strokes while one more still fits, then smaller strokes until the
  // remaining space R lies in the range a text object can match byte for byte.
  const tFill = Date.now();
  const fullSize = contentContribution(genStroke(prng(1), 0));
  const t0 = contentContribution(textObj('over', 0)); // text with a 4-character id: t0 + characters
  while (LIMIT - m3 >= fullSize + t0 + LIMITS.MAX_TEXT) {
    const s = genStroke(rand, i++);
    expect(JSON.stringify(s).length).toBeLessThanOrEqual(60000);
    expect((await submit(s)).ok).toBe(true);
    m3 += contentContribution(s);
  }
  while (LIMIT - m3 > t0 + LIMITS.MAX_TEXT) {
    // Largest stroke that keeps R >= t0 + 1: binary search on the point count of one generated
    // stroke (contribution grows with the count). Few sizings, so the event loop stays responsive.
    const full = genStroke(prng(1000 + i), i);
    const sized = (n) => ({ ...full, points: full.points.slice(0, n) });
    let lo = 1;
    let hi = LIMITS.MAX_POINTS;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (LIMIT - m3 - contentContribution(sized(mid)) >= t0 + 1) lo = mid;
      else hi = mid - 1;
    }
    const s = sized(lo);
    expect(LIMIT - m3 - contentContribution(s)).toBeGreaterThanOrEqual(t0 + 1);
    expect((await submit(s)).ok).toBe(true);
    m3 += contentContribution(s);
    i += 1;
  }
  const R = LIMIT - m3;
  diag.fillStepMs = Date.now() - tFill;
  const sorted = [...ackMs].sort((a, b) => a - b);
  const pct = (q) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);
  diag.fillAckMs = { n: sorted.length, p50: pct(0.5), p95: pct(0.95), max: Math.round(sorted[sorted.length - 1]) };
  expect(R).toBeGreaterThan(t0);
  expect(R).toBeLessThanOrEqual(t0 + LIMITS.MAX_TEXT);
  expect((await Board.findById(boardId).lean()).contentBytes).toBe(m3); // server M3 = test M3
  expect(maxM1).toBeLessThanOrEqual(LIMITS.MAX_MESSAGE_BYTES);

  // Step 3 first (exceeds by exactly one byte), then step 2 (fits exactly).
  const tStep3 = Date.now();
  let applied = 0;
  o.socket.on('op:applied', () => {
    applied += 1;
  });
  const before = { seq: (await Board.findById(boardId).lean()).seq, count: await BoardObject.countDocuments({ boardId }), state: o.sync.exportState() };
  const over = textObj('over', R + 1 - t0);
  expect(contentContribution(over)).toBe(R + 1);
  expect(await e.submitAck('object:add', over)).toMatchObject({ ok: false, error: { code: 'BOARD_FULL' } });
  await new Promise((r) => setTimeout(r, 200));
  expect(applied).toBe(0);
  expect({ seq: (await Board.findById(boardId).lean()).seq, count: await BoardObject.countDocuments({ boardId }), state: o.sync.exportState() }).toEqual(before);
  expect(e.sync.getView().has('over')).toBe(false); // optimistic object removed
  expect(logEvents(srv, 'op.rejected').some((l) => l.errorCode === 'BOARD_FULL' && l.attemptedBytes === LIMIT + 1)).toBe(true);
  // An update that grows an object past the limit is rejected as well.
  const fit = textObj('fits', R - t0);
  expect(contentContribution(fit)).toBe(R);
  expect((await e.submitAck('object:add', fit)).ok).toBe(true);
  expect((await Board.findById(boardId).lean()).contentBytes).toBe(LIMIT); // M3 exactly 15,728,640
  expect(await e.submitAck('object:update', { id: 'fits', text: `${fit.text}b` })).toMatchObject({ ok: false, error: { code: 'BOARD_FULL' } });
  expect(await e.submitAck('object:add', rect())).toMatchObject({ ok: false, error: { code: 'BOARD_FULL' } });
  // Updates that do not grow the content are still accepted at the limit.
  expect((await e.submitAck('object:update', { id: 'fits', x: 99.5 })).ok).toBe(true);

  phase('steps2and3', tStep3);
  // Step 5: a version of the full board is stored and below the defensive threshold (M4).
  const tVersion = Date.now();
  expect(await srv.services.versions.triggerAutomatic(boardId, 'periodic')).toMatchObject({ created: true });
  // M4 = BSON size of the stored version document, measured by MongoDB ($bsonSize). Reading the 15 MiB
  // document back and re-measuring it here stalled the event loop shared by the server and both clients.
  const [{ m4 }] = await Version.collection
    .aggregate([
      { $match: { boardId: new mongoose.Types.ObjectId(boardId) } },
      { $sort: { number: -1 } },
      { $limit: 1 },
      { $project: { _id: 0, m4: { $bsonSize: '$$ROOT' } } },
    ])
    .toArray();
  diag.versionStepMs = Date.now() - tVersion;
  expect(m4).toBeLessThanOrEqual(LIMITS.VERSION_DOC_LIMIT);
  expect(m4).toBeLessThanOrEqual(LIMIT + 286 + 1024); // D11c bound plus the version metadata fields

  const tStep6 = Date.now();
  // Step 6: delete two strokes; a new stroke smaller than the freed space is accepted.
  // Under heavy CPU load both sockets were seen to drop with "ping timeout" during step 5, and a
  // reconnecting client refuses to submit (NOT_READY). Reconnection is not what TC-022 tests, so wait
  // until both clients have joined again; any disconnect stays in the recorded values below.
  await waitFor(() => e.sync.status === 'ready' && o.sync.status === 'ready', { timeout: 60000 }).catch(() => {
    throw failure('clients not joined again within 60 s before step 6', {});
  });
  for (const id of ['fill-0000', 'fill-0001']) await expectOk(e.submitAck('object:delete', { id }), `step 6: delete ${id}`);
  const fresh = genStroke(prng(7), 9999, 1500);
  expect(contentContribution(fresh)).toBeLessThan(2 * fullSize);
  await expectOk(submit(fresh), 'step 6: add fresh stroke');
  await waitFor(() => o.sync.lastSeq === e.sync.lastSeq);
  expect(o.sync.exportState()).toEqual(e.sync.exportState());

  // Recorded values (STP: "all values are reported").
  phase('step6', tStep6);
  diag.totalMs = Date.now() - tStart;
  wholeLoop.disable();
  clearInterval(stallTimer);
  diag.maxLoopDelayMs = Math.round(wholeLoop.max / 1e6);
  console.log(JSON.stringify({ tc: 'TC-022', strokesFilled: i, fullStrokeM2: objectBytes(genStroke(prng(1), 0)), maxM1, R, m3AtLimit: LIMIT, m4, ...diag }));
});
