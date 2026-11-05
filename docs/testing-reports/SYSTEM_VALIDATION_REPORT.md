# System Validation Report — Team 11

Real-Time Collaborative Virtual Whiteboard · validates the system against the SRS through the STP test
cases · report date **05-11-2026**

This report separates three kinds of evidence and never mixes them:

- **[Run 05-11]** — executed for this report on 05-11-2026 (logs in [`evidence/2026-11-05/`](evidence/2026-11-05/));
- **[Historical]** — earlier runs whose logs are committed in the repository or recorded by GitHub Actions; cited, not re-run;
- **[Manual]** — checks performed by team members and recorded in the STP test-case records.

## 1. Summary

| Level | Tool | Result | Evidence |
|---|---|---|---|
| Integration (API, real-time, database, recovery) | Jest + real `mongod` + Supertest + scripted Socket.IO clients | **100 of 100 passed**, 13 suites **[Run 05-11]** | [`02-jest-unit-and-integration-with-coverage.txt`](evidence/2026-11-05/02-jest-unit-and-integration-with-coverage.txt), [`jest-results-unit-and-integration.json`](evidence/2026-11-05/jest-results-unit-and-integration.json) |
| End-to-end system tests in a browser | Playwright 1.50.1, Chromium 133 (as in CI) | **31 of 31 passed** **[Run 05-11]** | [`03-e2e-chromium.txt`](evidence/2026-11-05/03-e2e-chromium.txt) |
| Unit | Jest | 110 of 110 passed **[Run 05-11]** | [Unit Testing Report](UNIT_TESTING_REPORT.md) |
| Static analysis | ESLint | no findings **[Run 05-11]** | [`04-lint.txt`](evidence/2026-11-05/04-lint.txt) |
| Requirement ↔ test ↔ RTM traceability | `tools/check_trace.py` | 1,483 checks passed, 0 failed **[Run 05-11]** | [`05-check-trace.txt`](evidence/2026-11-05/05-check-trace.txt) |
| Cross-browser (Chrome, Edge, Playwright Firefox, Playwright WebKit) | `npm run test:e2e:browsers` | 119 passed, 0 failed, 5 skipped **[Historical, 02-11-2026]** | `docs/evidence/2026-11-02-final-validation/19-after-deps-e2e-browsers.txt` |
| Performance (NFR-001 to NFR-005) | `npm run perf` harness | all targets met **[Historical, 12-10-2026]** | `docs/IMPLEMENTATION_STATUS.md` §4 |
| Usability and stable Mozilla Firefox (TC-021) | manual checklist | Pass with limitations **[Manual, 17-10-2026]** | STP TC-021 record |
| STP test cases overall | — | **33 Pass, 1 Blocked (TC-109), 0 Fail** of 34 | STP test-case records; RTM; `docs/IMPLEMENTATION_STATUS.md` §5 |
| Requirements | — | **49 of 50 verified (P)**; SEC-REQ-007 not verified (N) | `docs/traceability/rtm.md` |

**Verdict.** On 05-11-2026 every automated test of the project passed (unit 110, integration 100,
E2E 31 = 241) on the code that is on `main`. Together with the historical performance, cross-browser and
manual records, the system meets its SRS baseline except SEC-REQ-007 (HTTPS in a deployed environment),
which cannot be validated without a deployment (TC-109 Blocked, DECISIONS.md E3).

## 2. Environment **[Run 05-11]**

Windows 10 Pro 19045, Intel i7-7820HQ, 32 GB; Node.js 26.7.0, npm 11.19.0; MongoDB 8.2.1 (throw-away
local `mongod` per run); Jest 30.5.2; Playwright 1.50.1 with Chromium 133.0.6943.16. Dependencies were
installed with `npm ci` from the committed lock file. Code under test: git tree `e48707687ef3…`
(= `main` `64876d8` = `docs/final-submission` `8bca53e`). Full details:
[`00-environment.txt`](evidence/2026-11-05/00-environment.txt).

Commands:

```
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage --coverageProvider=v8 …   # unit + integration (npm test + coverage)
npm run test:e2e                                                                                                # client test build + Playwright Chromium
npx eslint . ; python tools/check_trace.py ; python tools/size_model.py ; python -m unittest discover -s tools/tests
```

## 3. Integration suites **[Run 05-11]**

| Suite | Tests | Result | Time | STP test cases referenced in the suite |
|---|---|---|---|---|
| `access.test.js` | 17 | Pass | 20.9 s | TC-016, TC-017, TC-018, TC-023, TC-101, TC-102, TC-103, TC-104 |
| `auth.test.js` | 7 | Pass | 8.9 s | TC-015, TC-104, TC-105, TC-106, TC-108 |
| `boardLimit.test.js` | 1 | Pass | 54.9 s | TC-022 |
| `boards.test.js` | 11 | Pass | 3.7 s | TC-016 |
| `dbIntegrity.test.js` | 13 | Pass | 3.4 s | — (issue #20: schema and `$jsonSchema` validator, start-up integrity check) |
| `multiClient.test.js` | 23 | Pass | 21.2 s | — (issue #22: five simultaneous clients, races, same-object edits; FR-020 to FR-023) |
| `persistence.test.js` | 1 | Pass | 3.7 s | — (FR-027: stored documents equal the Mongoose path; reload) |
| `recovery.test.js` | 3 | Pass | 121.9 s | TC-011, TC-024, TC-025 (crash injection at every step of restore/clear) |
| `securityLog.test.js` | 1 | Pass | 3.5 s | TC-104 |
| `sync.test.js` | 11 | Pass | 33.2 s | TC-001, TC-005, TC-006, TC-007, TC-008, TC-010, TC-107 |
| `tls.test.js` | 1 | Pass | 3.4 s | TC-109 (application side only, local certificate) |
| `transport.test.js` | 6 | Pass | 3.4 s | TC-109 (application side only: HTTPS redirect, HSTS, proxy trust) |
| `versions.test.js` | 5 | Pass | 10.3 s | TC-012, TC-013, TC-014, TC-024 |
| **Total** | **100** | **all Pass** | ≈ 5 min | |

The integration tests start the real Express + Socket.IO server in-process against a real MongoDB and
talk to it only through HTTP and Socket.IO, as a client would.

## 4. End-to-end system tests **[Run 05-11]**

31 Playwright tests, real server serving the client test build, real MongoDB, Chromium at 1280 × 720
(NFR-006 minimum) unless a test sets another size. All passed in 1.3 min.

| Spec file | Tests | Covers |
|---|---|---|
| `whiteboard.spec.cjs` | 9 | TC-001–TC-004 (all tools synchronise between two users), TC-005/TC-013/TC-018/TC-023 (clear, restore, role change, ownership transfer), TC-009 (offline indicator, resync), TC-010/TC-107 (rejection rollback, markup as text), TC-015/TC-016 (register, create, logout), TC-017/TC-103 (share link, guest, Viewer, revocation), guest-token expiry regression |
| `validation.spec.cjs` | 6 | issue #21: registration, login, server-unreachable, blank title, guest join, stroke-width validation messages |
| `compat.spec.cjs` | 5 | issue #25: plain-HTTP restore fallback, forced colours, 125 % DPR, lost pointer capture, multi-touch |
| `boards.spec.cjs` | 6 | issues #13 and #16: create/rename/reopen, persistence after reload, invalid board URLs, PNG export, empty-board export, Viewer export |
| `responsive.spec.cjs` | 3 | issue #23: layouts at supported sizes and breakpoints, resize, dialogs at 1280 × 720 and 800 × 600 |
| `usability.spec.cjs` | 1 | TC-021 automated checklist part (Owner, Editor, Viewer views at 1280 × 720) |
| `smoke.spec.cjs` | 1 | issue #26: full workflow with no console errors or failed requests |
| **Total** | **31** | |

## 5. STP test cases — how each is validated

| Test cases | Requirements | Evidence |
|---|---|---|
| TC-001–TC-008, TC-010 | FR-001–FR-008, FR-020–FR-027 | `sync.test.js`, `geometry.test.js`, E2E `whiteboard.spec.cjs` **[Run 05-11]** |
| TC-009 | FR-025, NFR-004 | E2E offline/resync tests **[Run 05-11]**; 5 s timing target measured by the perf harness **[Historical, 12-10-2026]**: max 2,194 ms (Chromium), 2,322 ms (Chrome) |
| TC-011, TC-024, TC-025 | FR-007, FR-033, crash recovery | `recovery.test.js`, `versions.test.js` **[Run 05-11]** |
| TC-012–TC-014 | FR-030–FR-035 | `versions.test.js`, E2E **[Run 05-11]**; NFR-005 timing (TC-013) **[Historical, 12-10-2026]**: max 1,661 ms ≤ 3,000 ms |
| TC-015–TC-018, TC-023 | FR-040–FR-052 | `auth.test.js`, `access.test.js`, `boards.test.js`, E2E **[Run 05-11]** |
| TC-019 | NFR-001, NFR-002 | perf harness **[Historical, 12-10-2026]**: p95 80 ms ≤ 500 ms with 10 clients, 0 disconnects |
| TC-020 | NFR-003 | perf harness **[Historical, 12-10-2026]**: max 380.6 ms (Chromium), 1,110 ms (Chrome) ≤ 3,000 ms |
| TC-021 | NFR-006, NFR-007 | **[Manual, 17-10-2026]** Firefox 158 and Chrome, Pass with limitations (STP record); automated part `usability.spec.cjs` **[Run 05-11]** and Chrome/Edge 31/31 **[Historical, 02-11-2026]** |
| TC-022 | FR-008, SEC-REQ-005 | `boardLimit.test.js` **[Run 05-11]** |
| TC-101–TC-108 | SEC-REQ-001–SEC-REQ-006, SEC-REQ-008 | `access.test.js`, `auth.test.js`, `securityLog.test.js`, `sync.test.js`, E2E **[Run 05-11]** (STP §5.1 security validation) |
| TC-109 | SEC-REQ-007 | **Blocked** — needs a deployed HTTPS instance. Application-side controls pass in `transport.test.js` and `tls.test.js` **[Run 05-11]**, which does not verify the requirement itself |

The authoritative status of each test case is the "Status" field in the STP sources
(`docs/working/stp/tc-functional-nfr.md`, `tc-security.md`); `tools/check_trace.py` confirms that the RTM
agrees with them. No status was changed by this report.

## 6. Cross-browser results **[Historical, 02-11-2026]**

From `docs/reports/RELEASE_READINESS_2026-11-02.md` §4 (final run after the dependency update):

| Browser | Result |
|---|---|
| Chromium 133 (Playwright, used by CI) | 31/31 |
| Google Chrome (installed, stable) | 31/31 |
| Microsoft Edge (installed, stable) | 31/31 |
| Firefox 134 (Playwright build — not stable Mozilla Firefox) | 28 passed, 3 skipped (offline emulation does not close WebSockets in this build) |
| WebKit 18.2 (Playwright build — Safari engine, not Apple Safari) | 29 passed, 2 skipped |
| Stable Mozilla Firefox 159 (experimental BiDi driver) | 22 passed, 7 failed, 2 skipped — failures diagnosed as driver limitations (`22-stable-firefox-diagnosis.txt`) |

The four-browser run was **not** repeated on 05-11-2026 because the code is unchanged since then
(identical tree) and it takes about 10 minutes; Chromium was re-run as the CI reference browser.

## 7. Continuous integration **[Historical]**

GitHub Actions is enabled for the repository. Both workflows (`app-ci`: lint, unit, integration,
production build, Chromium E2E; `docs-check`: traceability, size model, documentation tool tests) ran
on every Pull Request and push to `main`. The latest runs, on the merge commit of PR #34
(`64876d8`, 02-11-2026), succeeded: `app-ci` 41485597400, `docs-check` 41485597523. One earlier
failure is on record: `app-ci` failed on PR #28 and on `main` at `e51637c` (01-11-2026) and was repaired
by PR #31 (see the presentation, slide 14). No workflow was triggered for this report.

## 8. Known limitations

1. **TC-109 / SEC-REQ-007 Blocked** — no deployed HTTPS environment was available (DECISIONS.md E3).
2. **Apple Safari not tested**; WebKit results are an engine proxy only.
3. **Stable Mozilla Firefox** evidence is the manual TC-021 run (Firefox 158) plus partial automation;
   the full TC-021 evidence folder is not in the repository (`docs/final-submission/DOCUMENTATION_AUDIT.md` R2).
4. **Performance** (NFR-001 to NFR-005) was measured once on 12-10-2026 on one laptop and not re-measured
   after later changes; values hold for that hardware only.
5. **Manual device checks** listed in the release readiness report §8 (installed stable Firefox, Safari,
   125 % scaling, touch screen, high contrast, second device over HTTP) have no recorded results
   (DOCUMENTATION_AUDIT.md R9). Automated emulations of some of them pass (`compat.spec.cjs`).
6. **PNG export and board rename** are validated by automated tests but are outside the v1.0 requirement
   baseline and therefore have no STP test case (scope decision pending, DECISIONS.md E6).
7. The server's `notice` event (`VERSION_NOT_SAVED`) is not displayed by the client (DOCUMENTATION_AUDIT.md R4).
