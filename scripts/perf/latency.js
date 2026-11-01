// TC-019 — synchronisation latency and capacity (NFR-001, NFR-002; D7c). Ten scripted Editor
// clients in one process share one monotonic clock (performance.now). Each submits 2 operations/s
// (adds and updates of its own objects). Latency sample = t_apply at a receiver − t_submit at the
// sender, for every (accepted operation, receiver) pair; p95 by nearest rank. Pass: p95 ≤ 500 ms,
// no disconnection, zero rejections, no missing or duplicate seq, identical final states.
import { pathToFileURL } from 'node:url';
import { boardWithEditors, client, environmentInfo, freshState, QUICK, sameState, sleep, startEnv, stats, writeCsv } from './env.js';

const CLIENTS = 10;
const WARMUP_MS = QUICK ? 3_000 : 10_000;
const MEASURE_MS = QUICK ? 15_000 : 60_000;
const OPS_PER_SEC = 2;

export async function runLatency() {
  const env = await startEnv();
  try {
    const { owner, editors, boardId } = await boardWithEditors(env.url, CLIENTS);
    const users = [owner, ...editors];
    const clients = [];
    for (const u of users) clients.push(await client(env.url, u.token, boardId));

    const submitted = new Map(); // clientOpId -> {t, measured}
    const samples = [];
    const ackTimes = [];
    let rejected = 0;
    let disconnects = 0;
    let measuring = false;
    clients.forEach((c) => {
      c.sync.subscribe((kind, d) => {
        const now = performance.now();
        if (kind === 'submitted') submitted.set(d.clientOpId, { t: d.submittedAt, measured: measuring });
        else if (kind === 'applied' && !d.own) {
          const s = submitted.get(d.clientOpId);
          if (s?.measured) samples.push(now - s.t);
        } else if (kind === 'ack') {
          const s = submitted.get(d.entry.clientOpId);
          if (s?.measured) ackTimes.push(now - s.t);
        } else if (kind === 'rejected') rejected += 1;
        else if (kind === 'disconnected') disconnects += 1;
      });
    });

    // Each client edits its own objects; staggered timers at 2 operations/s.
    let counter = 0;
    const timers = clients.map((c, k) => {
      const mine = [];
      const tick = () => {
        counter += 1;
        if (mine.length < 5 || counter % 2 === 0) {
          const id = `u${k}-o${counter}`;
          mine.push(id);
          c.sync.submit('object:add', { id, kind: 'rect', x: (counter * 7) % 1000, y: k * 60, w: 40, h: 30, color: '#1E88E5', strokeWidth: 2 });
        } else {
          const id = mine[counter % mine.length];
          c.sync.submit('object:update', { id, x: (counter * 13) % 1000 + 0.5 });
        }
      };
      let interval;
      const start = setTimeout(() => {
        interval = setInterval(tick, 1000 / OPS_PER_SEC);
      }, (k * 1000) / OPS_PER_SEC / CLIENTS);
      return () => {
        clearTimeout(start);
        clearInterval(interval);
      };
    });

    await sleep(WARMUP_MS);
    measuring = true;
    await sleep(MEASURE_MS);
    measuring = false;
    timers.forEach((stop) => stop());
    await sleep(3_000); // let the last operations arrive

    // Sequence integrity and convergence.
    let seqProblems = 0;
    for (const c of clients) {
      const seqs = c.sync.appliedSeqs;
      for (let i = 1; i < seqs.length; i += 1) if (seqs[i] !== seqs[i - 1] + 1) seqProblems += 1;
    }
    const fresh = await freshState(env.url, owner.token, boardId);
    const converged = clients.every((c) => sameState(c.sync.exportState(), fresh));
    clients.forEach((c) => c.close());

    const lat = stats(samples);
    const acks = stats(ackTimes);
    const expected = (MEASURE_MS / 1000) * OPS_PER_SEC * CLIENTS * (CLIENTS - 1);
    const pass = lat.p95 !== null && lat.p95 <= 500 && disconnects === 0 && rejected === 0 && seqProblems === 0 && converged;
    const row = {
      tc: 'TC-019',
      date: new Date().toISOString(),
      ...environmentInfo(),
      clients: CLIENTS,
      warmupS: WARMUP_MS / 1000,
      measureS: MEASURE_MS / 1000,
      samples: lat.n,
      expectedSamples: expected,
      medianMs: lat.median,
      p95Ms: lat.p95,
      p99Ms: lat.p99,
      maxMs: lat.max,
      ackP95Ms: acks.p95,
      rejected,
      disconnects,
      seqProblems,
      converged,
      result: pass ? 'PASS' : 'FAIL',
    };
    return { row, file: writeCsv('tc019-latency', row) };
  } finally {
    await env.stop();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { row, file } = await runLatency();
  console.log(JSON.stringify(row, null, 2));
  console.log(`written to ${file}`);
  process.exitCode = row.result === 'PASS' ? 0 : 1;
}
