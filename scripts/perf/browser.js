// Browser timings with Playwright (Chromium), one clock in this process:
// TC-020 — initial board load (NFR-003 ≤ 3 s): board with TB-STD, new context (empty cache) per run,
//          value = startTime of the `board-ready` mark (ms since navigation start), 10 runs.
// TC-009 — reconnection recovery (NFR-004 ≤ 5 s): browser goes offline for 30 s while the Owner makes
//          20 changes; t0 = back online, t1 = the next `board-ready` mark; state compared with a fresh
//          join; 10 repetitions.
// Needs the client test build (`npm run build:test`) for window.__wbTest.exportState().
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { boardWithEditors, client, environmentInfo, freshState, QUICK, root, sameState, seed, sleep, startEnv, stats, submitAck, tbStd, writeCsv } from './env.js';

/** Waits until the page has more than `n` board-ready marks (page.evaluate works under the app's CSP). */
async function waitMarks(page, n, timeout = 30_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if ((await page.evaluate(() => performance.getEntriesByName('board-ready').length)) > n) return;
    await sleep(20);
  }
  throw new Error('board-ready mark not reached');
}

const LOAD_RUNS = QUICK ? 3 : 10;
const RECONNECT_RUNS = QUICK ? 2 : 10;
const OUTAGE_MS = QUICK ? 5_000 : 30_000;

export async function runBrowser() {
  const dist = path.join(root, 'client', 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('client/dist missing: run `npm run build:test` first');
  const env = await startEnv({ CLIENT_DIST: dist, NODE_ENV: 'test', BCRYPT_COST: '12', VERSION_INTERVAL_MS: '0' });
  // PERF_CHANNEL=chrome (or msedge) uses the installed browser; default is Playwright's Chromium.
  const channel = process.env.PERF_CHANNEL || undefined;
  const browser = await chromium.launch({ channel });
  try {
    const { owner, editors, boardId } = await boardWithEditors(env.url, 2);
    const ownerClient = await client(env.url, owner.token, boardId);
    await seed(ownerClient, tbStd(20, 'b'));

    const open = async (u) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await context.addInitScript((s) => window.localStorage.setItem('wb.session', JSON.stringify(s)), u.session);
      const page = await context.newPage();
      await page.goto(`${env.url}/boards/${boardId}`);
      await waitMarks(page, 0);
      return { context, page };
    };

    // TC-020
    const loads = [];
    for (let i = 0; i < LOAD_RUNS; i += 1) {
      const { context, page } = await open(editors[0]);
      loads.push(await page.evaluate(() => performance.getEntriesByName('board-ready')[0].startTime));
      await context.close();
    }
    const ls = stats(loads);
    const loadRow = {
      tc: 'TC-020',
      date: new Date().toISOString(),
      ...environmentInfo(),
      browser: `${channel || 'chromium'} ${browser.version()}`,
      objects: 370,
      runs: LOAD_RUNS,
      timesMs: loads.map((t) => Math.round(t)).join(' '),
      medianMs: ls.median,
      maxMs: ls.max,
      result: loads.every((t) => t <= 3000) ? 'PASS' : 'FAIL',
    };
    writeCsv('tc020-load', loadRow);

    // TC-009
    const recoveries = [];
    let statesOk = true;
    let bannerOk = true;
    const { context, page } = await open(editors[0]);
    for (let i = 0; i < RECONNECT_RUNS; i += 1) {
      const marks = await page.evaluate(() => performance.getEntriesByName('board-ready').length);
      await context.setOffline(true);
      try {
        await page.getByTestId('disconnected-banner').waitFor({ timeout: 15_000 });
      } catch {
        bannerOk = false;
      }
      const outageStart = Date.now();
      for (let k = 0; k < 20; k += 1) {
        const ack = await submitAck(ownerClient, 'object:add', { id: `r${i}-${k}`, kind: 'rect', x: 10 + k * 20, y: 10 + i * 20, w: 15, h: 15, color: '#D32F2F', strokeWidth: 2 });
        if (!ack.ok) throw new Error('owner change rejected');
        await sleep(50);
      }
      await sleep(Math.max(0, OUTAGE_MS - (Date.now() - outageStart)));
      const t0 = Date.now();
      await context.setOffline(false);
      await waitMarks(page, marks);
      recoveries.push(Date.now() - t0);
      const fresh = await freshState(env.url, owner.token, boardId);
      if (!sameState(await page.evaluate(() => window.__wbTest.exportState()), fresh)) statesOk = false;
    }
    await context.close();
    ownerClient.close();
    const rs = stats(recoveries);
    const reconnectRow = {
      tc: 'TC-009',
      date: new Date().toISOString(),
      ...environmentInfo(),
      browser: `${channel || 'chromium'} ${browser.version()}`,
      outageS: OUTAGE_MS / 1000,
      runs: RECONNECT_RUNS,
      timesMs: recoveries.join(' '),
      medianMs: rs.median,
      maxMs: rs.max,
      bannerShown: bannerOk,
      statesMatch: statesOk,
      result: statesOk && bannerOk && recoveries.every((t) => t <= 5000) ? 'PASS' : 'FAIL',
    };
    writeCsv('tc009-reconnect', reconnectRow);
    return { loadRow, reconnectRow };
  } finally {
    await browser.close();
    await env.stop();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = await runBrowser();
  console.log(JSON.stringify(rows, null, 2));
  process.exitCode = rows.loadRow.result === 'PASS' && rows.reconnectRow.result === 'PASS' ? 0 : 1;
}
