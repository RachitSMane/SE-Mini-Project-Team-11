# Branch Coverage Report — Team 11

Real-Time Collaborative Virtual Whiteboard · decision (branch) coverage of the Jest test suites · report
date **05-11-2026** · same run as the [Code Coverage Report](CODE_COVERAGE_REPORT.md) (§2 there gives the
command, tool and environment)

## 1. Headline figures (unit + integration, 210 tests, all passed)

| Scope | Branches covered / measured | Branch coverage |
|---|---|---|
| **Server** (`server/src`, 18 loaded files) | 738 / 820 | **90.00 %** |
| **Shared** (`shared/src`, 3 files) | 196 / 218 | **89.91 %** |
| Client, loaded files only (`api.js`, `geometry.js`, `exportImage.js`, `render.js`) | 90 / 104 | 86.54 % |
| **All measured branches** | 1,024 / 1,142 | **89.67 %** (Jest's table prints 89.66 because it rounds down) |

## 2. Important caveat — what "measured" means here

Jest's V8 provider can only count the branches of code that actually ran. For the **15 files that no
Jest test loads** — the 14 React UI files and `server/src/index.js` — it reports *0 branches in total*,
and Jest's console table then shows them as "100 %" branch coverage. That figure is meaningless and is
**not** used in this report.

Consequences:

- The 89.67 % above is the branch coverage **of the code Jest executes**. It says nothing about the
  React UI, whose branches were never measured. Those files are tested only end to end by Playwright
  (31 tests, [System Validation Report](SYSTEM_VALIDATION_REPORT.md) §4), which collects no coverage.
- Branches executed only in server child processes (the crash/restart tests in `recovery.test.js`) are
  counted as *not* taken, so the server figure is, if anything, slightly understated.
- For a whole-code-base view use the line figure of the Code Coverage Report (58.24 %), which does count
  the unloaded files.

The table generator [`make_coverage_tables.py`](make_coverage_tables.py) marks unloaded files as "not
measurable" instead of 100 %.

## 3. Per file (loaded files)

| File | Branches | Coverage | Notes on uncovered branches (line numbers from Jest's table) |
|---|---|---|---|
| `server/src/access/policy.js` | 9/9 | 100 % | permission matrix fully covered |
| `server/src/db/integrity.js` | 16/16 | 100 % | |
| `server/src/realtime/boardQueue.js` | 10/10 | 100 % | |
| `server/src/validation.js` | 51/52 | 98.08 % | line 76 |
| `shared/src/errorCodes.js` | 31/32 | 96.88 % | line 72 |
| `server/src/errors.js` | 36/38 | 94.74 % | lines 67–68 |
| `server/src/auth/authService.js` | 50/53 | 94.34 % | lines 64–65 |
| `server/src/rest/app.js` | 96/102 | 94.12 % | lines 105–106, 241, 243–244 |
| `server/src/logger.js` | 55/59 | 93.22 % | lines 76–77, 133–138 |
| `server/src/access/accessService.js` | 125/135 | 92.59 % | line 50 |
| `server/src/config.js` | 37/40 | 92.50 % | lines 10, 16, 49 |
| `server/src/realtime/realtimeServer.js` | 100/110 | 90.91 % | lines 115–121, 278–282 |
| `server/src/db/models.js` | 17/19 | 89.47 % | line 215 |
| `client/src/board/geometry.js` | 56/63 | 88.89 % | lines 34, 63, 90 |
| `shared/src/syncClient.js` | 142/160 | 88.75 % | lines 118–125, 247–249, 338–343 |
| `shared/src/objects.js` | 23/26 | 88.46 % | lines 39, 45, 81 |
| `server/src/realtime/boardStore.js` | 15/17 | 88.24 % | lines 29, 41 |
| `client/src/board/exportImage.js` | 14/16 | 87.50 % | canvas-drawing part needs a browser |
| `server/src/realtime/boardEngine.js` | 43/50 | 86.00 % | lines 74–78, 102–104, 113–115, 122–125, 138–141 |
| `server/src/server.js` | 13/16 | 81.25 % | lines 68–70 |
| `client/src/api.js` | 19/24 | 79.17 % | line 45 |
| `server/src/versions/versionService.js` | 54/69 | 78.26 % | defensive paths (retry exhaustion, oversize snapshot) and restore completion after a crash, which runs in a child process |
| `server/src/recovery.js` | 5/10 | 50.00 % | start-up roll-forward runs in the child process of `recovery.test.js` (not measured) |
| `server/src/faults.js` | 6/15 | 40.00 % | test-only fault-injection hooks; most fault points are triggered inside child processes |
| `client/src/board/render.js` | 1/1 | 100 % of 1 measured | only module set-up ran; drawing functions need a browser canvas |

Not measurable (never loaded by Jest): `client/src/App.jsx`, `main.jsx`, `router.jsx`, `ui.jsx`,
`icons.jsx`, `session.js`, `board/BoardPage.jsx`, `board/Canvas.jsx`, `board/OwnerDialogs.jsx`,
`board/SidePanel.jsx`, `board/Toolbar.jsx`, `pages/Auth.jsx`, `pages/Dashboard.jsx`, `pages/Join.jsx`,
`server/src/index.js`.

## 4. Unit level alone

Unit tests only (110 tests, [`coverage-summary-unit.json`](evidence/2026-11-05/coverage-summary-unit.json)):
442 of 501 measured branches = 88.22 % — over 16 loaded files (shared 179/203 = 88.18 %, server
173/194 = 89.18 % over the 9 server files the unit tests load, client 90/104). The integration level
raises the number of measured server branches from 194 to 820 because it loads the REST, real-time,
auth, access and version services.

## 5. Evidence

| File | Content |
|---|---|
| [`evidence/2026-11-05/02-jest-unit-and-integration-with-coverage.txt`](evidence/2026-11-05/02-jest-unit-and-integration-with-coverage.txt) | Jest console output with the `% Branch` column and uncovered lines |
| [`evidence/2026-11-05/coverage-summary-unit-and-integration.json`](evidence/2026-11-05/coverage-summary-unit-and-integration.json) | branch totals per file (`branches.covered` / `branches.total`) |
| [`evidence/2026-11-05/lcov-unit-and-integration.info`](evidence/2026-11-05/lcov-unit-and-integration.info) | LCOV with per-branch records (`BRDA`) |
| [`coverage-html/index.html`](coverage-html/index.html) | HTML report; uncovered branches are highlighted in the source view |

## 6. Limitations

- No branch-coverage threshold is configured or enforced in CI; this is a measurement, not a gate.
- V8 branch counting differs from Istanbul/Babel instrumentation (e.g. how `&&`, `??` and default
  parameters are counted), so figures are not directly comparable with projects that use Istanbul.
- Client UI branches are unmeasured (see §2).
