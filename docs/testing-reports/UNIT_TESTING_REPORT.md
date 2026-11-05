# Unit Testing Report — Team 11

Real-Time Collaborative Virtual Whiteboard · STP §5 (test levels) and §6 (tools) · report date **05-11-2026**

## 1. Summary

| Item | Value |
|---|---|
| Result | **110 of 110 unit tests passed** in 9 suites; 0 failed, 0 skipped; exit code 0 |
| Command | `node --experimental-vm-modules node_modules/jest/bin/jest.js --selectProjects unit --coverage --coverageProvider=v8 …` (= `npm run test:unit` plus coverage options, full command in §5) |
| Code under test | git tree `e48707687ef3…`, identical on `main` (`64876d8`) and `docs/final-submission` (`8bca53e`); application code not changed |
| Run | 05-11-2026, about 22:09 IST, local machine (environment: [`evidence/2026-11-05/00-environment.txt`](evidence/2026-11-05/00-environment.txt)) |
| Duration | 3.9 s |
| Raw evidence | console log [`01-jest-unit-with-coverage.txt`](evidence/2026-11-05/01-jest-unit-with-coverage.txt); per-test JSON [`jest-results-unit.json`](evidence/2026-11-05/jest-results-unit.json) |
| Coverage of the unit level alone | [`coverage-summary-unit.json`](evidence/2026-11-05/coverage-summary-unit.json); discussed in the [Code Coverage Report](CODE_COVERAGE_REPORT.md) §4 |

## 2. What "unit" means in this project

The Jest configuration (`jest.config.js`) has two projects. The **unit** project runs pure-logic tests
with no database, no network server and no browser:

- `shared/tests/**` — the shared error-code contract and the client synchronisation module (`syncClient.js`), driven with a fake socket;
- `server/tests/unit/**` — configuration checks, the permission policy, validation schemas, error mapping and the per-board task queue;
- `client/tests/**` — client geometry (shapes, hit-testing, eraser) and PNG-export layout.

Everything that needs MongoDB, Express or Socket.IO is in the **integration** project and is reported
in the [System Validation Report](SYSTEM_VALIDATION_REPORT.md).

## 3. Results per suite

| Suite | Tests | Result | Time | What it checks (from the test titles) | Requirements / design |
|---|---|---|---|---|---|
| `shared/tests/errorCodes.test.js` | 17 | Pass | 1.2 s | every error code has an HTTP status, server and user message; SAD §4.3 statuses unchanged; client message mapping | SAD §4.3–§4.4, issue #9 |
| `shared/tests/syncClient.test.js` | 10 | Pass | 1.6 s | events applied strictly in sequence order, gap repair after 1 s or 100 events, optimistic apply with acknowledgement and rollback, resync on reconnect | FR-021, FR-025, FR-026, D6b |
| `shared/tests/syncLifecycle.test.js` | 25 | Pass | 0.5 s | listener clean-up, one reconnection after a server disconnect, no reconnection after revocation or `close()` | FR-025, issue #18 |
| `server/tests/unit/config.test.js` | 4 | Pass | 1.6 s | short secrets and weak bcrypt cost refused, test hooks off outside `NODE_ENV=test`, `FORCE_HTTPS` preconditions | SEC-REQ-001, SEC-REQ-007 (application side) |
| `server/tests/unit/policy.test.js` | 13 | Pass | 1.6 s | the Owner/Editor/Viewer permission matrix; unknown roles and actions denied | FR-051, SEC-REQ-003 |
| `server/tests/unit/services.test.js` | 14 | Pass | 1.5 s | error mapping and safe error bodies; per-board FIFO queue ordering | SAD §3.6, §4.4 |
| `server/tests/unit/validation.test.js` | 11 | Pass | 0.8 s | REST bodies and real-time envelopes validated, unknown/extra fields refused | SEC-REQ-005 |
| `client/tests/exportImage.test.js` | 6 | Pass | 0.6 s | PNG export area, negative coordinates, scaling of large boards, safe file name | issue #16 (outside the v1.0 baseline, see DECISIONS.md E6) |
| `client/tests/geometry.test.js` | 10 | Pass | 1.8 s | shapes from drags, width/colour limits, 2,000-point stroke cap, eraser hit-testing | FR-002, FR-003, FR-006, TC-004 |
| **Total** | **110** | **all Pass** | 3.9 s | | |

Test counts per suite are taken from `jest-results-unit.json` (`assertionResults`); times are the suite
durations Jest recorded.

## 4. Comparison with earlier runs

| Date | Source | Unit result |
|---|---|---|
| 12-10-2026 | `docs/IMPLEMENTATION_STATUS.md` §2 | 4 suites, 32 passed (before Sprint 4 test work) |
| 02-11-2026 | `docs/evidence/2026-11-02-final-validation/02-npm-test.txt` and `16-after-deps-npm-test.txt` (combined `npm test`); split into levels in `docs/final-submission/DEMO_GUIDE.md` §4.7 | `npm test`: 22 suites, 210 passed, of which 9 unit suites with 110 tests |
| 02-11-2026 | GitHub Actions `app-ci` run 41476112779 (push to `main`, `2b68907`) | `npm run test:unit` step succeeded (historical CI evidence, not re-run) |
| **05-11-2026** | this report | **9 suites, 110 passed** |

The count is unchanged since the release candidate of 02-11-2026; no test was added, removed, skipped
or modified for this report.

## 5. Exact command

```
node --experimental-vm-modules node_modules/jest/bin/jest.js --selectProjects unit \
  --coverage --coverageProvider=v8 --coverageReporters=text --coverageReporters=json-summary \
  "--collectCoverageFrom=shared/src/**/*.js" "--collectCoverageFrom=server/src/**/*.js" \
  "--collectCoverageFrom=client/src/**/*.{js,jsx}" --json --outputFile=<results.json>
```

The coverage options only add measurement; they do not change which tests run. Without them the
command is `npm run test:unit`.

## 6. Known limitations

- The React components (`*.jsx`) have **no unit tests**. They are exercised only by the Playwright E2E
  suite (System Validation Report §4), which does not measure code coverage.
- `client/src/board/render.js` and the canvas-drawing part of `exportImage.js` need a real browser canvas;
  under Jest (Node.js, no DOM) only their pure helpers run.
- The run used Node.js 26.7.0 on Windows; CI uses Node.js 22 on Ubuntu (`.github/workflows/app-ci.yml`).
  Both are inside the `engines` range of `package.json`; the last CI result is cited in §4, not re-triggered.
