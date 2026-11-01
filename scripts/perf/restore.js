// TC-013 timing run — restore propagation (NFR-005 ≤ 3 s). Board with TB-STD saved as version n,
// later changed and saved as version m; 10 scripted clients (one is the Owner). Each repetition
// restores alternately n and m with a new Idempotency-Key; t0 = request sent, t1 = the latest
// time any of the 10 clients applied the resulting board:state. Ten repetitions.
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { api, boardWithEditors, client, environmentInfo, QUICK, seed, sleep, startEnv, stats, tbStd, writeCsv } from './env.js';

const CLIENTS = 10;
const RUNS = QUICK ? 3 : 10;

export async function runRestore() {
  const env = await startEnv({ VERSION_INTERVAL_MS: '0' });
  try {
    const { owner, editors, boardId } = await boardWithEditors(env.url, CLIENTS);
    const seeder = await client(env.url, owner.token, boardId);
    await seed(seeder, tbStd(13, 'n'));
    seeder.close(); // last participant leaves -> version n (FR-030 c)
    await sleep(1500);
    const later = await client(env.url, owner.token, boardId);
    await seed(later, tbStd(14, 'm').slice(0, 40));
    later.close(); // -> version m
    await sleep(1500);
    const versions = await api(env.url, 'GET', `/boards/${boardId}/versions`, owner.token);
    const [m, n] = versions.map((v) => v.number);
    if (!n || !m) throw new Error(`expected two versions, got ${JSON.stringify(versions)}`);

    const clients = [];
    for (const u of [owner, ...editors]) clients.push(await client(env.url, u.token, boardId));
    const times = [];
    let contentOk = true;
    for (let run = 0; run < RUNS; run += 1) {
      const target = run % 2 === 0 ? n : m;
      const expected = (await api(env.url, 'GET', `/boards/${boardId}/versions/${target}`, owner.token)).objects;
      const applied = clients.map((c) => new Promise((resolve) => {
        const unsub = c.sync.subscribe((kind) => {
          if (kind === 'state-replaced') {
            unsub();
            resolve(performance.now());
          }
        });
      }));
      const t0 = performance.now();
      await api(env.url, 'POST', `/boards/${boardId}/versions/${target}/restore`, owner.token, undefined, { 'Idempotency-Key': crypto.randomUUID() });
      const t1 = Math.max(...(await Promise.all(applied)));
      times.push(t1 - t0);
      for (const c of clients) if (JSON.stringify(c.sync.exportState().objects) !== JSON.stringify(expected)) contentOk = false;
      await sleep(500);
    }
    clients.forEach((c) => c.close());
    const s = stats(times);
    const pass = contentOk && times.length === RUNS && times.every((t) => t <= 3000);
    const row = {
      tc: 'TC-013',
      date: new Date().toISOString(),
      ...environmentInfo(),
      clients: CLIENTS,
      objects: 370,
      runs: RUNS,
      timesMs: times.map((t) => Math.round(t)).join(' '),
      medianMs: s.median,
      maxMs: s.max,
      contentOk,
      result: pass ? 'PASS' : 'FAIL',
    };
    return { row, file: writeCsv('tc013-restore', row) };
  } finally {
    await env.stop();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { row, file } = await runRestore();
  console.log(JSON.stringify(row, null, 2));
  console.log(`written to ${file}`);
  process.exitCode = row.result === 'PASS' ? 0 : 1;
}
