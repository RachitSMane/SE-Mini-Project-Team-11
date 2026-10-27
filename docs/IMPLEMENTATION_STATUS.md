# Implementation Status

Last updated 12-10-2026 (evening); later sessions are appended as §10–§12 (latest 15-10-2026, §12). Every result below is tied to a command whose exit code and output
were checked, and to an evidence file where one exists. Nothing is claimed from code inspection alone.
Two verification sessions ran on 12-10-2026 on the same uncommitted working tree:

- **Session 1** (about 09:00–12:25 IST): implementation, defect fixes, first full execution of the STP
  and the performance runs. Its console output was **not retained**; the surviving evidence is
  `perf-results/*.csv` and `test-results/` (TC-021 screenshots, Playwright `.last-run.json`).
- **Session 2** (17:46–18:49 IST): re-verification without code changes. Logs are in
  `docs/evidence/2026-10-12-reverification/` (file names below).
- **Session 3** (14-10-2026, addendum): investigation of §6 issues 2 (TC-022) and 3 (Jest open
  handles). Two test files changed (`server/tests/integration/boardLimit.test.js`,
  `shared/tests/syncClient.test.js`); no application code changed. Logs and findings are in
  `docs/evidence/2026-10-14-tc022-investigation/` and `docs/evidence/2026-10-14-jest-open-handles/`;
  the final local checks of the finished test versions are in `docs/evidence/2026-10-14-final-checks/`
  (lint; unit 32/32; TC-022 alone 1/1; full `npm test` 77/77; no open-handles warning; all exit 0).
  Session 3 ran **no** E2E, performance or production-build checks and no loaded run of the final
  TC-022 version. Only the header, §6 issues 2 and 3, §8 item 5 and §9 step 3 were updated; the rest
  of this report (including the tables of §2) is the session-2 state.
- **Session 5** (14-10-2026, 20:10–21:30 IST): TC-022 timing investigation and a server performance
  fix; local TLS end-to-end test and TC-109 helper; staged document build. See **§11**.
- **Session 4** (14-10-2026, 19:22–20:10 IST): full re-execution of every automated check plus TC-022
  under controlled load, a security review, and fixes of four SEC-REQ-007 application-side defects
  (with regression tests). Results and changes are in **§10**; evidence in
  `docs/evidence/2026-10-14-full-verification/`; requirement-by-requirement view in
  `docs/reviews/REQUIREMENTS_AUDIT.md`.

## 1. Build, environment and CI scope

- **Build tested:** uncommitted working tree of branch `docs/setup` (base commit `82af885`). The results
  are not bound to a commit hash; rerun the checks after committing (§9, step 4).
- **Environment:** Windows 10 Pro 19045, Intel i7-7820HQ (8 threads), 32 GB (from the perf CSVs);
  Node.js 26.7.0, npm 11.19.0 (checked in session 2); MongoDB 8.2.1. Browser versions as recorded in
  session 1: Playwright 1.50.1 with Chromium 133.0.6943.16; Google Chrome 154.0.8037.99; Microsoft
  Edge 155.0.4283.45; Playwright Firefox 134.0 (patched build, not stable Mozilla Firefox).
- **Local vs hosted CI:** every result is local. The GitHub Actions workflows (`app-ci.yml`,
  `docs-check.yml`) have **never run**: nothing has been committed or pushed. `app-ci.yml` triggers
  only on Pull Requests and on pushes to `main`. Session 1 reported a local CI-equivalent run (same
  steps as `app-ci.yml`, MongoDB through `TEST_MONGO_URL`; Node.js 26 instead of 22, Windows instead
  of Ubuntu, existing `node_modules` instead of `npm ci`); its log was not retained.

## 2. Current verified results (session 2)

Evidence folder: `docs/evidence/2026-10-12-reverification/`.

| Check | Command | Exit | Result | Evidence file |
|---|---|---|---|---|
| Lint | `npm run lint` | 0 | no findings | `lint.txt` |
| Unit tests | `npm run test:unit` | 0 | 4 suites, **32** passed | `unit.txt` |
| Unit + integration, run 1 | `npm test` | 1 | 73 of 77 passed; see §6, issue 1 (run in parallel with the Python checks) | `npm-test-1.txt` |
| Unit + integration, run 2 | `npm test` | 1 | 76 of 77 passed; TC-022 step 6 failed, see §6, issue 2 | `npm-test-2.txt` |
| Unit + integration, runs 3–5 | `npm test` | 0, 0, 0 | 11 suites, **77** passed each time (32 unit + 45 integration) | `npm-test-3.txt` … `npm-test-5.txt` |
| `versions.test.js` alone | `jest --selectProjects integration …/versions.test.js` | 0 | 5 passed | `versions-isolated.txt` |
| `boardLimit.test.js` alone | `jest --selectProjects integration …/boardLimit.test.js` | 0 | 1 passed; 243 strokes, max M1 31,881 B, M4 15,727,703 B | `boardlimit-isolated-1.txt` |
| Test client build | `npm run build:test` | 0 | built | `build-test.txt` |
| E2E, Chromium | `npx playwright test --output <temp dir>` | 0 | **10** passed, 0 skipped | `e2e-chromium.txt` |
| Doc tool tests | `python -m unittest discover -s tools/tests` | 0 | 14 tests OK | `unittest.txt` |
| Traceability checker | `python tools/check_trace.py` | 0 | 1,483 checks passed, 0 failed | `check_trace.txt` |
| Size model | `python tools/size_model.py` | 0 | `bound_holds True` | `size_model.txt` |

The E2E run wrote its artefacts to a temporary directory so that the session-1 TC-021 screenshots in
`test-results/` were preserved.

## 3. Results reported by session 1 and not re-run in session 2

| Check | Command | Reported result | Surviving evidence |
|---|---|---|---|
| Production build | `npm run build` | exit 0; no test hooks (`__wbTest`) in `client/dist` | none (log not retained) |
| E2E, three browsers | `npm run test:e2e:browsers` | 29 passed, 1 skipped of 30 (10 tests × Chrome, Edge, Playwright Firefox) | TC-021 screenshots in `test-results/` (12:05–12:08 IST); `.last-run.json` = `passed` (12:09 IST) |
| Guest-token expiry regression | `e2e/whiteboard.spec.cjs` | passed in Chromium, Chrome, Edge, Playwright Firefox; fails without the fix | Chromium pass re-confirmed in session 2 (`e2e-chromium.txt`, test 9) |
| Performance | `npm run perf`; `PERF_CHANNEL=chrome node scripts/perf/browser.js` | all PASS | `perf-results/*.csv` (§4) |
| `npm run dev` / `npm start` | manual | pages, API proxy, register/login; CSP, health, metrics hidden in production | none |

## 4. Performance (selected run)

`perf-results/` holds exactly one full-length run set (`quick = false` in every row); measurements
from any earlier runs were not retained and are not reported. Selected rows (date column, UTC; IST = UTC + 5:30):

| Case | Target | Configuration | Result | CSV row |
|---|---|---|---|---|
| TC-019 | NFR-001 p95 ≤ 500 ms; NFR-002 | 10 clients × 2 ops/s, 10 s warm-up + 60 s | p95 **80 ms**; median 34.7, p99 181.4, max 383.2 ms; 10,566 samples; 0 rejected, 0 disconnects, 0 seq problems; states converged; PASS | `tc019-latency.csv`, 06:40:56Z (`npm run perf`) |
| TC-013 | NFR-005 ≤ 3,000 ms | TB-STD (370 objects), 10 clients, 10 runs | max **1,661 ms**, median 1,005.1 ms; content correct; PASS | `tc013-restore.csv`, 06:42:09Z (`npm run perf`) |
| TC-020 | NFR-003 ≤ 3,000 ms | TB-STD, new context per run, 10 runs | max **380.6 ms** (Chromium 133); PASS | `tc020-load.csv`, 06:42:47Z (`npm run perf`) |
| TC-020 | NFR-003 ≤ 3,000 ms | as above | max **1,110 ms** (Chrome 154.0.8037.99); PASS | `tc020-load.csv`, 06:49:04Z (Chrome run) |
| TC-009 | NFR-004 ≤ 5,000 ms | 30 s outage, 20 changes, 10 runs | max **2,194 ms** (Chromium 133); banner shown; states match; PASS | `tc009-reconnect.csv`, 06:48:14Z (`npm run perf`) |
| TC-009 | NFR-004 ≤ 5,000 ms | as above | max **2,322 ms** (Chrome 154.0.8037.99); PASS | `tc009-reconnect.csv`, 06:54:42Z (Chrome run) |

All rows: commit `82af885+local-changes`, Node.js v26.7.0, MongoDB 8.2.1, the hardware of §1. The values
hold for that hardware only.

## 5. STP execution status (authoritative)

Source of truth: the "Status" fields in `docs/working/stp/tc-functional-nfr.md` and `tc-security.md`
(34 test cases); the RTM (`docs/traceability/rtm.md`) is derived from them and `tools/check_trace.py`
confirms that the two agree.

| Status | Count | Test cases |
|---|---|---|
| Pass | 33 | TC-001..TC-025, TC-101..TC-108 (TC-021 since 17-10-2026, with limitations; see below) |
| Blocked | 1 | TC-109 (reason below) |
| Fail | 0 | — |
| Not executed | 0 | — (TC-109 was not run at all; per STP §13 it is recorded as Blocked because it cannot be run) |

RTM: 49 of 50 requirements **P**; SEC-REQ-007 (TC-109) is **N**. NFR-006 and NFR-007 became P when
TC-021 was set to Pass on 17-10-2026 (before that: 47 of 50).
Security objectives: SEC-OBJ-002, SEC-OBJ-003 P; SEC-OBJ-001 N (includes TC-109).
An automated test existing is not counted as verification: a requirement is P only because all its
linked test cases have status Pass from an actual run.

**Pass with limitations accepted by the team**

- **TC-021** (NFR-006, NFR-007), 17-10-2026, record
  `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md` (section 14 below).
  - Manual, tester-reported: Firefox 158 (flows and checklist) and Chrome (checklist).
  - Automated: Chrome and Edge, 10/10 passed.
  - Two-member review completed. Limitations retained:
    - exact 31-character guest-name value not recorded;
    - manual TC-017 role sequence differs from the STP;
    - tooltip fix re-checked in Firefox only;
    - Editor keyboard accepted without role-specific evidence;
    - no manual Edge check;
    - automated run predates the fix;
    - screenshot gaps;
    - uncommitted build.
  - Before 17-10-2026 it was Blocked (stable Firefox not installed; manual checklist not performed).

**Blocked**

- **TC-109** (SEC-REQ-007): no deployed HTTPS instance (DECISIONS.md E3). `FORCE_HTTPS`/`TRUST_PROXY`
  are implemented but unverified; no step was executed.

**Skipped**

- TC-009 offline test in Playwright Firefox (1 of 30 in the session-1 three-browser run):
  `setOffline()` there does not cut open WebSockets. Heartbeat detection is covered by `sync.test.js`.

**Deviations recorded in the test-case records**

- TC-005, TC-012: some automatic versions are triggered directly instead of waiting for the interval
  *T* (same code path the timer calls); the periodic timer itself is tested with *T* = 1 s.
- TC-006, TC-007: rounds paced at ≥ 50 ms so one connection stays below the 30 ops/s limit.
- TC-024 uses TB-STD as version n (plus 5 objects for version m). TC-025 uses its specified minimum of
  50 objects in steps 1–4 and 5 objects in steps 6–8, where the STP gives no count.
- TC-104: the log scan runs in its own test server (`securityLog.test.js`) covering every event type,
  instead of scanning the log left by the other security tests.
- Process: the STP entry criterion "SRS, SAD and STP v1.0 signed off" was not met; the execution took
  place before sign-off (STP §5, §11).

## 6. Open issues found in session 2

1. **Hook timeout under load (test harness).** In run 1 the `beforeAll` that starts the test server in
   `versions.test.js` exceeded Jest's 5,000 ms hook timeout, so TC-012/TC-013/TC-014 and TC-024 step 8
   did not run; `afterAll` then failed on the undefined server. The run overlapped CPU-heavy Python
   checks. The suite passed alone and in runs 2–5.
2. **TC-022 step 6 failed once (cause not identified).** In run 2 (632 s, about three times slower than
   runs 3–5) deleting stroke `fill-0000` at the 15 MiB limit was rejected
   (`boardLimit.test.js:133`). The test records only `ok: false`, not the error code, so it is not
   known whether this is a product or a harness fault. TC-022 passed alone and in runs 1, 3, 4 and 5.
   Kept as Pass on Rachit's decision (12-10-2026), subject to team review.
   **Session 3 (14-10-2026)** — details and logs: `docs/evidence/2026-10-14-tc022-investigation/`.
   - *Reproduced harness failure.* With diagnostics added (error code, disconnects, step-5 timing) and
     artificial CPU load (16 busy processes on 8 threads), TC-022 failed at the same step:
     `{"ok":false,"error":{"code":"NOT_READY"}}`. Both sockets had dropped with `ping timeout` during
     step 5 (version of the full board: 7–10 s idle, 71 s under load) and the reconnecting client
     refused to send the delete; the server never received it. A test-harness fault, not an FR-008
     fault. Run 2's failure is consistent with this mechanism but cannot be confirmed (no code recorded).
   - *Reconnect-wait fix.* Step 6 first waits (≤ 60 s) until both clients have joined again; each
     step-6 acknowledgement is bounded to 60 s; failures report both clients' status, the disconnects
     and the last server log lines. Expected results unchanged (steps 1–5 untouched; both deletes and
     the new stroke must still return `ok: true`; E and O must end identical). The 60 s failure branches
     have not been exercised.
   - *Passing post-fix runs.* Loaded (16 busy processes): passed once with the **first** post-fix
     version, i.e. before the 60 s bounds were added (4 disconnects recorded, both clients recovered;
     test duration > 286 s of its 300 s timeout). The **final** version has not been run under load:
     a repeat was judged likely to hit the 300 s timeout, and the later changes only affect failure
     paths. Targeted, idle: final version passed twice (58.6 s; 65.9 s, no disconnects). Full
     `npm test`, idle: 77/77 four times — once with the first post-fix version (open-handles warning
     still printed) and three times with the final versions (no warning).
   - *Still unexplained.* Why heartbeats (10 s + 10 s) are missed under CPU load: the test process's
     event loop never stalled for more than 133 ms, so it is not a simple event-loop stall there.
     **Corrected in session 5 (§11):** that 133 ms figure came from a step-5-only histogram that cannot
     record a stall beginning before its first sample; a whole-test measurement found stalls of 11.1 s
     and 6.1 s in step 5, which explain the heartbeat misses.
   The TC-022 status decision still needs team review; the STP record was not changed.
3. **Jest open handles.** Every full run prints "Jest did not exit one second after the test run has
   completed". Runs 2–5 then exited; run 1's process did not exit and was still running when this
   report was written. The session-1 statement "Jest exited cleanly" was not reproduced.
   **Session 3 (14-10-2026)** — `docs/evidence/2026-10-14-jest-open-handles/`. Confirmed cause of the
   warning in unit runs: the test "board:state after a restore…" in `shared/tests/syncClient.test.js`
   left an unacknowledged operation whose real 10 s acknowledgement timer kept the process alive
   (`--detectOpenHandles` reported nothing; found by running suites and tests in isolation). Fixed in
   the test (`sync.close()` after the assertions). Afterwards: unit run without the warning, and full
   `npm test` runs without it. That the full-run warning had the same cause is consistent with this
   but not proven (suite order not recorded). Session 2's run 1, whose process never exited, is
   **not** explained by a 10 s timer; that run also had a failed `beforeAll`/`afterAll`
   (`versions.test.js`, issue 1) and its cause remains unknown.

None of these were fixed (outside the scope of a documentation reconciliation). Issue 2 should be
investigated (log the rejection code) before the result is relied on for FR-008.
*(Session 3: issue 2 investigated and the harness fault fixed; issue 3's warning traced to a unit test
and fixed, with the never-exiting run 1 still unexplained; issue 1 unchanged.)*

## 7. Defects found and fixed in session 1 (historical; fixes covered by the session-2 test runs)

1. Access service: `changeMemberRole` returned 500 when the board was deleted while queued;
   `removeMember` could remove an Owner's leftover row after an interrupted transfer.
2. Socket handshake accepted guest tokens of revoked or expired links.
3. Expiry timer disconnected guests up to 1 s early without the `LINK_EXPIRED` notice.
4. Client router lost a redirect issued during the first render (blank page after logout).
5. Expired guest token left the guest on a dead "reconnecting" board; SAD §3.9.2 requires the guest
   entry page. Fixed; the pending-join token is also cleared after a guest join.
6. `npm start` with the documented relative `CLIENT_DIST=../client/dist` returned 500 for every
   page; the path is now resolved to an absolute path (`server/tests/unit/config.test.js`).
7. Socket.IO heartbeat defaults (25 s + 20 s) could leave a silent network loss undetected for longer
   than the 30 s outage of TC-009; now 10 s + 10 s (`sync.test.js` heartbeat test).

## 8. Remaining limitations

1. TC-109 Blocked (§5). TC-021 Pass since 17-10-2026, with the limitations listed in §5 and section 14.
2. Hosted CI has never run (§1).
3. Playwright 1.50.1 hangs on Node.js 26 when loading ES-module test files; the E2E files are
   CommonJS (`*.cjs`) for that reason.
4. The open issues of §6.
5. Deliverables: `docs/final/Team11_{SRS,SAD,STP}.docx` were regenerated from the current sources on
   12-10-2026 (`python tools/build_docs.py`, exit 0, log `build_docs.txt`). **`submission/final/` is
   stale** (DOCX and PDF of 11-10-2026, before the execution): `tools/export_pdf.ps1` refused to run
   (exit 1, "Microsoft Word is open") because a Word window was open. No PDF of the current sources
   exists yet, so PDF layout has not been inspected.
   *Superseded:* `submission/final/` now contains DOCX (13-10-2026 20:55) and PDF (20:56) files of all
   three documents (PDF pages: SRS 30, SAD 61, STP 38, counted 14-10-2026). The STP's TC-022 record
   still has the session-2 wording ("the test does not record the error code"). Updating it requires
   regenerating the deliverables, which has not been done.

## 10. Session 4 (14-10-2026): full re-verification and SEC-REQ-007 fixes

Same environment as §1, except Google Chrome is now 155.0.8059.41. Uncommitted working tree (base
commit `82af885`). All results local; hosted CI has still never run. Evidence folder:
`docs/evidence/2026-10-14-full-verification/` (file numbers below).

**Changes.**
- `server/src/config.js`: `FORCE_HTTPS=true` now requires `TRUST_PROXY=true` and an `https://`
  `PUBLIC_URL` (start-up error instead of a redirect loop or insecure share links).
- `server/src/rest/app.js`: the HTTPS redirect goes to the `PUBLIC_URL` origin, not the client's `Host`
  header; with `FORCE_HTTPS` the client CSP allows only `wss:`.
- `server/src/server.js`: with `FORCE_HTTPS`, Socket.IO refuses connections not forwarded as HTTPS
  (`allowRequest`, `forwardedProto`).
- Tests: new `server/tests/integration/transport.test.js` (5), one new test in
  `server/tests/unit/config.test.js`. Before the fix: 3 of 5 transport tests and the config test failed
  (`02`, `03`); after: 9/9 (`04`). The first version of the new transport test left a 10 s timer open
  (Jest's "did not exit" warning in run `13`); fixed in the test (`14`), absent in run `16`.
- CI configuration (not run on GitHub): `app-ci.yml` job timeout 45 min, MongoDB service health check,
  `workflow_dispatch`, artifact upload ignores a missing folder; `docs-check.yml` timeout 10 min and
  `workflow_dispatch`. Node.js floor `>=22.12` in `package.json` (and the lockfile's root entry): the E2E
  set-up `require()`s an ES module, unsupported before 20.19/22.12; Node.js 20 is end-of-life.
- Documentation: README (Node.js floor, deployment section), `server/.env.example`, STP TC-109 and TC-022
  records (dated addenda; statuses unchanged), STP §14 sentence on TC-022, `docs/reviews/TC109_DEPLOYMENT_PLAN.md`.

**Results.**

| # | Check | Command | Exit | Result |
|---|---|---|---|---|
| 01 | Lint (baseline) | `npm run lint` | 0 | no findings |
| 02 | Unit + integration (baseline) | `npm test` | 1 | 77 of 78 passed; the 1 failure is the new config regression test against the unfixed code; all 77 existing tests passed (incl. TC-022); no "did not exit" warning |
| 03 | Transport test, unfixed code | `jest server/tests/integration/transport.test.js` | 1 | 3 failed, 2 passed (defects 1–3 confirmed) |
| 04 | Config + transport, fixed code | `jest …/config.test.js …/transport.test.js` | 0 | 9 passed |
| 05 | Production build | `npm run build` | 0 | built; `__wbTest` in 0 files of `client/dist` |
| 06 | Test build | `npm run build:test` | 0 | built |
| 07 | E2E Chromium | `npx playwright test --output <scratch>` | 0 | 10 passed |
| 08 | E2E Chrome, Edge, Playwright Firefox | `E2E_BROWSERS=chrome,msedge,firefox npx playwright test --output <scratch>` | 0 | 29 passed, 1 skipped (TC-009 offline test in Playwright Firefox, as before) |
| 10 | Performance | `npm run perf` | 0 | TC-019 p95 44.3 ms (n = 10,602); TC-013 max 835.8 ms; TC-020 max 208.8 ms; TC-009 max 2,330 ms — all PASS |
| 11 | Browser timings, Chrome 155 | `PERF_CHANNEL=chrome node scripts/perf/browser.js` | 0 | TC-020 max 222 ms; TC-009 max 2,119 ms — PASS |
| 12 | Lint (final code) | `npm run lint` | 0 | no findings |
| 13 | Unit + integration (final code) | `npm test` | 0 | 12 suites, 83 passed; "did not exit" warning (cause: the new test, fixed in 14) |
| 15 | **TC-022 final version under load** | `node …/cpuload.cjs 16 330` together with `jest …/boardLimit.test.js` | 0 | passed; Jest time 295.6 s of the 300 s timeout; 2 `ping timeout` disconnects at 209.6 s, both clients rejoined; step 5 46.6 s, max event-loop delay 153 ms; M1 max 31,881 B; M4 15,727,703 B |
| 16 | Unit + integration (final code and tests) | `npm test` | 0 | 12 suites, **83 passed**; no warning |
| 17 | Traceability | `python tools/check_trace.py` | 0 | 1,483 passed, 0 failed |
| 18 | Size model | `python tools/size_model.py` | 0 | `bound_holds True` |
| 19 | Doc tool tests | `python -m unittest discover -s tools/tests -v` | 0 | 14 tests OK (templates present locally, so the build tests ran) |
| 20 | Staged document build | `python tools/build_docs.py --out-dir <scratch>` | 0 | SRS, SAD unchanged in content; STP differs only by the session-4 addenda |
| 21 | Traceability (after the STP addenda) | `python tools/check_trace.py` | 0 | 1,483 passed, 0 failed |
| 22 | Lint (after the last test edit) | `npm run lint` | 0 | no findings |

The E2E runs wrote their artefacts to the session scratch directory so that the session-1 TC-021
screenshots in `test-results/` are preserved. Performance rows were appended to `perf-results/*.csv`
(earlier rows untouched; row counts before the run in `09`).

**Deliverables.** `submission/final/` was **not** regenerated: its STP DOCX/PDF predate the session-4 STP addenda (TC-022, TC-109, §14), while its SRS and SAD match the sources. Regenerate (close Word, `tools/export_pdf.ps1`) only after the team has reviewed the TC-022 record (D-03/D-04).

**Still open after session 4.** TC-021 and TC-109 Blocked (§5); hosted CI never run; no commit hash;
TC-022's pass under load had only a few seconds of margin to the 300 s timeout and the heartbeat misses
under load remain unexplained (team decision D-07); approvals and deadline (§9 step 7); §6 issue 1
(hook timeout under load) was not reproduced in session 4 and not investigated.

## 11. Session 5 (14-10-2026): TC-022 timing, persistence fix, local TLS test

Environment as §10, except that the laptop ran **on battery** throughout (Windows `BatteryStatus` 1,
Balanced plan; processor performance counter about 35–45 % of nominal, clock 1.5 of 2.9 GHz). Absolute
timings are therefore not comparable with session 4; every before/after comparison below was run back
to back under the same conditions. Evidence: `docs/evidence/2026-10-14-tc022-performance/` and
`docs/evidence/2026-10-14-tls-local/`.

**TC-022 investigation (why the loaded run used 295.6 s of 300 s).**
- CPU profile of one idle run (`--cpu-prof`): the Jest process was busy 125 of 141 s; about 50 s in
  Mongoose document construction/validation/save of `boardObjects`, about 12 s in driver serialisation,
  about 24 s in the test's own work; the test's stroke generation was below 0.5 s.
- Microbenchmarks (`4-bench-before.txt`, `6-bench-inside-jest.txt`): in plain Node.js a 2,000-point
  stroke costs 89 ms through `BoardObject.create` versus 9 ms through the native `insertOne`; inside
  Jest's module sandbox the BSON size calculation of the 15 MiB version takes 4,957 ms versus 324 ms in
  plain Node.js (about 15 times slower). A hypothesis that Mongoose wraps the cached arrays was tested
  and rejected (`5-…`).
- Timeline (`3-…`): stalls of 11.1 s and 6.1 s during step 5 in the process that hosts the server and
  both clients; the longest gap between heartbeat pings was 17.8 s (limit 20 s). This explains the
  heartbeat misses under load and corrects §6 issue 2.
- Conclusion: (1) application: large operations were CPU-expensive because Mongoose re-cast
  already-validated point arrays — fixed; (2) test: re-reading the 15 MiB version to measure M4 added a
  stall — fixed; (3) environment: the remaining stall is the design-mandated full BSON size check (D11b,
  SAD §3.6) plus serialisation, about 15 times slower inside Jest and further slowed by load and battery
  throttling (about 1 s in plain Node.js). Not changed; options for the team under D-07.

**Changes.**
- `server/src/realtime/boardEngine.js`, `server/src/db/models.js` (`toRawDocument`): object additions
  and updates are written through `BoardObject.collection` after schema validation, with the board ID
  as an ObjectId. New regression test `server/tests/integration/persistence.test.js`: stored documents
  are field- and BSON-type-identical to the Mongoose path, and the board reloads unchanged; a deliberate
  mutation (board ID stored as a string) makes it fail (`8-…`).
- `server/tests/integration/boardLimit.test.js`: M4 measured with MongoDB `$bsonSize` (same value);
  timing diagnostics added (fill duration, acknowledgement percentiles, phase times, whole-test
  event-loop delay, stall timeline, ping gaps); the misleading step-5 histogram removed. No assertion
  changed; steps and expected results unchanged.
- `scripts/verify-tls.js`: automates TC-109 steps 1–4 against a deployed URL (no account needed).
  `server/tests/integration/tls.test.js`: local end-to-end test through a real TLS 1.2+ proxy with a
  throw-away certificate generated by OpenSSL at test time (skipped if OpenSSL is missing).
- SAD §3.9 (trust boundary sentence on database access), STP TC-022, TC-109 and §14 (dated addenda;
  statuses unchanged), README, `docs/reviews/TC109_DEPLOYMENT_PLAN.md`, `REQUIREMENTS_AUDIT.md`,
  `TEAM_REVIEW_AGENDA.md` (D-07 options).

**Results** (`docs/evidence/2026-10-14-tc022-performance/` unless noted).

| # | Check | Exit | Result |
|---|---|---|---|
| 1–3 | TC-022 idle, before the change (instrumented) | 0 | 147–151 s; fill 97–100 s; ack p50 309–312 ms; step 5 17.8–18.5 s; run 1: both clients `ping timeout` at 112 s without artificial load |
| 7 | `persistence.test.js` | 0 | 1 passed |
| 8 | same, with the deliberate mutation | 1 | failed as intended (code restored) |
| 9 | TC-022 idle, after | 0 | Jest 67.4 s; fill 44.8 s; ack p50 95 ms, p95 151 ms; step 5 6.4 s; one 6.2 s stall; longest ping gap 11.4 s; no disconnects; M1 31,881, R 123, M4 15,727,703 (identical) |
| 10 | TC-022 after, 16-process load, battery | 0 | passed, but 303.7 s from test start to end against the 300 s timeout (Jest did not fail it because its own timer was delayed); 52.7 s stall in step 5; 2 `ping timeout` disconnects, both rejoined — **not a clean pass** |
| 11 | `npm run lint` | 0 | no findings |
| 12 | `npm test` | 0 | 13 suites, 84 passed (before `tls.test.js` existed) |
| 13–14 | production build / test build | 0 | built; `__wbTest` in 0 production files |
| 15 | E2E Chromium | 0 | 10 passed |
| 16 | E2E Chrome 155, Edge 155, Playwright Firefox | 0 | 29 passed, 1 skipped (TC-009 offline in Playwright Firefox) |
| 18 | `npm run perf` | 1 | **TC-019 FAIL** p95 1,935.6 ms (median 25 ms, max 4,087 ms, 0 rejected, 0 disconnects); TC-013, TC-020, TC-009 PASS |
| 19–21 | TC-019 alone: new / old / new engine | 0 | p95 72.4 / 62.7 / 56.8 ms — PASS each; the failure in 18 is not caused by the engine change; the multi-second stalls of run 18 were not reproduced and their cause is not identified (battery operation suspected, not proven) |
| 22 | `npm run perf` repeated | 0 | TC-019 p95 81.9 ms; TC-013 max 2,192 ms; TC-020 max 474 ms; TC-009 max 2,367 ms — all PASS |
| tls 1 | `tls.test.js` (local TLS self-test) | 0 | all 7 verifier checks PASS (`docs/evidence/2026-10-14-tls-local/`) |
| 23 | `npm run lint` (final) | 0 | no findings |
| 24 | `npm test` (final) | 0 | 14 suites, **85 passed**, no warning |

Not available locally: stable Mozilla Firefox (not installed), Node.js 22 (only 26.7.0 installed),
Docker/`act`/`actionlint`; installing any of them needs approval.

## 12. Sessions 7–8 (15-10-2026): reruns, version-write measurement, transport regression test

Same uncommitted working tree (base `82af885`), Node.js 26.7.0, MongoDB 8.2.1. Logs, Jest JSON results,
screenshots and staged documents are outside the repository in
`C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\` (`logs\2026-10-15-session7\`, `…-session8\`); copy them to
`docs/evidence/` if the team wants them versioned. Nothing here is a hosted CI result.

- Lint clean; `npm test` 14 suites — 85 passed (session 7, AC), 86 passed after the new transport test
  (session 8, battery; per-test results in `08-npm-test-results.json`). E2E Chromium 10/10; Chrome 155,
  Edge 155 and Playwright Firefox 29 passed, 1 skipped (twice). TLS self-test 7/7. Doc-tool tests 14 OK,
  `check_trace.py` 1,483/0, `size_model.py` bound holds; all 9 PlantUML sources re-render to 33 PNGs
  byte-identical to `docs/diagrams/png/`; workflows parse and reference existing scripts and files.
- TC-022: AC idle ×3 Jest 38.6–39.0 s, no disconnects; AC loaded 174.6 s (295.6 s before the session-5
  persistence change, same conditions). Battery idle 101.2 s (two disconnects without artificial load)
  and 58.6 s; battery loaded 290.6 s (9.4 s below the 300 s timeout).
- Version-write measurement (full 15 MiB board): event loop blocked by the size check 178–277 ms and by
  `Version.create` 354–536 ms in plain Node.js; 2.2–2.8 s and 2.4–4.0 s inside Jest. The native driver
  blocked 272–433 ms (plain) / 1.9–3.2 s (Jest). **Not changed:** the saving (about 100 ms in plain
  Node.js) does not remove the stall, and a native version write would bypass the schema's `trigger`
  enum and need explicit handling of the optional `requestId` used by the idempotent-restore index.
  The remaining stall is BSON processing (design-mandated size check D11b plus serialisation), slowed
  about ten times by Jest's module sandbox; options remain those of D-07.
- New regression test `transport.test.js` — "REST and real-time connections read a multi-valued
  X-Forwarded-Proto the same way (first value)"; fails when `forwardedProto()` is changed to the last
  value (mutation run, file restored and hash-checked).
- Documentation: SAD §3.6 (native write path), §3.9.6 (deployment assumptions for SEC-REQ-007), §4.1.4
  (heartbeat values and event-loop blocking); STP TC-021, TC-022 and TC-109 *Actual result* addenda
  (statuses unchanged); `TC109_DEPLOYMENT_PLAN.md` (proxy must replace `X-Forwarded-Proto`);
  `TC021_EXECUTION_CHECKLIST.md` (§0 update).

## 13. Sessions 9–10 (15/16-10-2026): suite result check, TC-022 reruns, stable Firefox (automated)

No application code or test changed. Logs in `C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\logs\`
(`2026-10-15-session9\`, `2026-10-16-session10\`).

- The session-8 full suite did not fail: `08-npm-test-results.json` reports 14/14 suites, 86/86 tests,
  `success: true`, exit 0.
- TC-022 alone, battery, three runs: 67.0–83.4 s, longest stall 6.0–10.7 s, no disconnects, all size
  outcomes as expected. No code change (section 12).
- TC-021, automated only: stable Mozilla Firefox 157.0.1, extracted from the official installer (not
  installed; installing needs administrator approval), through Playwright's experimental WebDriver BiDi
  driver. 8 passed, 2 failed through driver limitations (no `dblclick` synthesised; `setOffline()` has no
  effect), confirmed by a probe without application code. TC-001 to TC-004 passed with a dispatched
  double-click; usability checklist passed; Owner/Editor/Viewer screenshots captured. TC-009 is not
  verified in stable Firefox. TC-021 stays **Blocked**: the manual checklist and human judgement are open.

## 14. Session 14 (17-10-2026): TC-021 manual execution, tooltip fix, TC-021 Pass

Record: `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md`. Logs in
`C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\logs\2026-10-17-session14-chrome-edge\`.
Uncommitted working tree on base commit 82af885.

**Automated** (17-10-2026 20:17 IST, client test build of 16-10-2026 17:59). Command:
`E2E_BROWSERS=chrome,msedge` with
`--grep "TC-021 checklist|TC-001 to TC-004|TC-017/TC-103|TC-005/TC-013|TC-017 step 3"`.
- Browsers: Chrome 155.0.8059.82 and Edge 155.0.4283.45.
- Result: exit 0; 10 passed, 0 failed, 0 skipped.
- Not run: the full suite and TC-009.

**Manual** (tester-reported; development server):
- Installed Mozilla Firefox 158.0 at 1280 × 720:
  - TC-001, TC-002, TC-013 step 1 and TC-017 flows passed;
  - Owner, Editor and Viewer checklist items passed.
- Chrome at 1280 × 720: checklist items passed; core flows not run by hand.
- Edge: not checked by hand.
- Screenshots: About Firefox, the viewport, and the three board views. Tooltip, flow end-state and Chrome
  screenshots were not captured.

**Defect found and fixed during TC-021:**
- The stroke-width "Increase" and "Decrease" buttons had no visible text and no tooltip. They had only
  an `aria-label`, which the automated checklist counts as a label.
- Fix in `client/src/board/Toolbar.jsx`:
  - the existing tooltip pattern (`bind(...)`) added to both buttons;
  - the tooltip closes when a step reaches width 1 or 20 and the button becomes disabled.
- Accessible names, disabled conditions and the 1–20 limits are unchanged.
- `npm run lint`: exit 0, no findings.
- Re-check: tester-reported, in Firefox only. Both tooltips appear on hover and on Tab focus, and close at
  the limits.
- Not done after the fix: Chrome/Edge check, automated run, test-build rebuild.

**Team decision:**
- Two team members (names not recorded) reviewed the record and accepted the limitations. They are listed
  in §5 and in the STP TC-021 record.
- The team confirmed TC-021 as **Pass** with these limitations. STP TC-021 status and the RTM (NFR-006,
  NFR-007 → P) were updated accordingly.
- This is not the four-member review of the test summary required by the STP exit criteria; that review
  is still outstanding (STP §14).

## Run locally

```sh
npm install
cp server/.env.example server/.env    # set JWT_SECRET and LOGIN_HMAC_KEY (>= 32 random characters)
npm run db:start                      # terminal 1; skip if a MongoDB service listens on 27017
npm run dev                           # terminal 2 -> http://localhost:5173
```

Single server: `npm run build`, set `CLIENT_DIST=../client/dist` in `server/.env`, `npm start`
(http://127.0.0.1:4000).

## 9. Manual steps before submission

1. ~~Run TC-021 in the current stable Mozilla Firefox, then update the TC-021 record and the RTM.~~
   Done 17-10-2026 (section 14). The tooltip fix in `client/src/board/Toolbar.jsx` is part of the
   uncommitted working tree.
2. Leave TC-109 Blocked unless a real HTTPS deployment is set up and inspected (DECISIONS.md E3).
3. Review the TC-022 decision (§6, issue 2) as a team, using the session-3 findings; decide whether
   the STP TC-022 record is updated (requires regenerating the deliverables).
4. Commit the changes (each member with their own commits, per the course rules), then rerun
   `npm run lint`, `npm test`, `npm run test:e2e` and record the commit hash in the STP records.
5. Open a Pull Request (or push to `main`) so that both GitHub Actions workflows run, and confirm they
   pass (enable CI: DECISIONS.md E4).
6. Close every Word window, run `powershell -ExecutionPolicy Bypass -File tools/export_pdf.ps1`, and
   check the PDFs.
7. Complete the team sign-off of the approval tables (DECISIONS.md E1) and confirm the deadline
   with the instructor (E2).
