// `npm run perf`: builds the client test build, then runs TC-019, TC-013, TC-020 and TC-009 timings.
// Results are appended to perf-results/*.csv. PERF_QUICK=1 shortens every run (smoke check only;
// quick results are marked `quick: true` and do not count as NFR verification).
import { execSync } from 'node:child_process';
import { root } from './env.js';
import { runLatency } from './latency.js';
import { runRestore } from './restore.js';
import { runBrowser } from './browser.js';

execSync('npm run build:test', { cwd: root, stdio: 'inherit' });
const summary = [];
const { row: latency } = await runLatency();
summary.push(latency);
const { row: restore } = await runRestore();
summary.push(restore);
const { loadRow, reconnectRow } = await runBrowser();
summary.push(loadRow, reconnectRow);

for (const r of summary) {
  const detail = r.p95Ms !== undefined ? `p95 ${r.p95Ms} ms (n=${r.samples})` : `max ${r.maxMs} ms (${r.timesMs})`;
  console.log(`${r.tc.padEnd(7)} ${r.result}  ${detail}`);
}
console.log('CSV files: perf-results/');
process.exitCode = summary.every((r) => r.result === 'PASS') ? 0 : 1;
