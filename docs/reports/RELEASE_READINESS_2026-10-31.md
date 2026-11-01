# Release readiness report — 31-10-2026 (issue #26)

Prepared by Pranav (issues #10, #13, #16, #19, #26) for Rachit (repository owner).
Every result below comes from a command that was run, with exit code and log checked. Logs and
screenshots are in `docs/evidence/2026-10-31-1930-pranav-issues-settled/`.

## 1. What was found before any work

- `main` (`5d2805b`) held only ~38 of the project's files. The server modules imported by
  `boardEngine.js`, the client shell, `package.json`, Jest/Playwright configs and the test harness
  were missing, so the app could not be installed, run or tested from GitHub.
- The full team working tree (snapshot of 16–19 Oct) was available as a ZIP. Every file already on
  `main` was identical to the snapshot apart from CRLF line endings (docs on `main` were newer).
- Remote state at the time: `main`, `docs/setup` (merged), `spr-18/fix-stp-traceability` (open PR #6,
  one docs file). No other open PRs.

## 2. Branches and commits (local; nothing pushed)

| Branch | Commit | Content |
|---|---|---|
| `integration/restore-missing-app-files` (from `origin/main`) | `7e1d2a2` | 124 files missing from every remote branch, copied unchanged from the snapshot. Excluded: `.env`, logs, `client/dist`, `test-results`, `docs/evidence` run logs, `perf-results`, generated DOCX/PDF, `docs/templates/*.docx` (local-only per `.gitignore`). |
| | `69f63fe` | 33 diagram PNGs referenced by the SAD/SRS sources (needed by `tools/check_trace.py`). |
| `feature/pranav-sprint-issues` (stacked on the integration branch) | `20097f4` | #13 board rename |
| | `0f7cad0` | #16 PNG export |
| | `9578520` | #19 backend unit + integration tests |
| | `50243ef` | #10 E2E workflows |
| | (this commit) | #26 report and evidence |

Suggested merge order: PR 1 `integration/restore-missing-app-files` → `main`; then PR 2
`feature/pranav-sprint-issues` → `main`. The integration commit is authored by Pranav but contains the
whole team's code; please mention that in the PR so contribution records stay fair.

## 3. Final verification (HEAD `50243ef`, macOS, Node.js 24.14.1, MongoDB 8.0.4, Chromium 133)

| Check | Command | Exit | Result |
|---|---|---|---|
| Lint | `npm run lint` | 0 | no findings |
| Unit + integration | `npm test` | 0 | 18 suites, **129 passed**, 0 failed (baseline before this work: 14 suites, 86) |
| Production build | `npm run build` | 0 | built; `__wbTest` in 0 files of `client/dist` |
| E2E (Chromium) | `npm run test:e2e` | 0 | **16 passed**, 0 failed, 0 skipped (baseline: 10) |
| Traceability | `python3 tools/check_trace.py` | 0 | 1,483 passed, 0 failed |
| Doc tool tests | `python3 -m unittest discover -s tools/tests` | 0 | 14 run, OK (5 skipped: DOCX templates are local-only) |
| Size model | `python3 tools/size_model.py` | 0 | `bound_holds True` |
| Production smoke | `npm start` with `CLIENT_DIST`, curl | — | health ok; register/login; create, rename (200), empty title (400), unknown board (404), delete (204), get after delete (404); SPA served with CSP; `/metrics` hidden (404) |

Test count growth: unit 33 → 65 (+32), integration 53 → 64 (+11), E2E 10 → 16 (+6).

## 4. Issue checklist

### #13 Board management and persistence
- [x] Create boards (existing, FR-042) — `access.test.js` TC-016, E2E `boards.spec.cjs`
- [x] Retrieve and display saved boards (existing, FR-043)
- [x] **Rename** (new): `PATCH /api/v1/boards/:id`, Owner only, dashboard dialog, live title update
- [x] Delete (existing, FR-044)
- [x] Persisted in MongoDB with journaled writes; survives server restart (`boards.test.js`) and page reload (E2E)
- [x] Invalid/missing boards: 400/401/403/404 with the common error object; UI message for bad URLs

### #16 Export and download
- [x] Export button for every role; PNG download named `<title>-<date>.png`
- [x] Layout preserved (board origin, same renderer); verified by pixel checks in E2E
- [x] Empty board → message, no file; failures → error toast
- [x] Mutation check: E2E fails when objects are not drawn
- Note: STP §4 lists "export" as out of v1.0 scope; the SRS/STP owners may want to update that row.

### #19 Backend unit and integration tests
- [x] Unit tests for validation, errors, queue, logger, rate limiter, persistence conversions
- [x] API endpoint responses and error contract
- [x] Database interactions (stored title/updatedAt/seq, restart persistence)
- [x] Validation and error handling
- [x] Tests pass consistently: full suite passed in 3 separate full runs today (129/129 each on the final code)

### #10 End-to-end tests
- [x] Critical workflows: existing 10 tests (drawing, sync, sharing, roles, versions, reconnection) + 6 new
- [x] Board creation and access, rename, persistence, invalid URLs, export
- [x] Real-time collaboration (existing tests + live rename)
- [x] Error scenarios (validation, empty export, offline, invalid boards)
- [x] Results documented here; no new defects found by the new tests

### #26 Final validation
- [x] All suites, lint, build, traceability run and passing (section 3)
- [x] Frontend–backend integration verified (E2E + production smoke)
- [x] Authentication, board management, collaboration verified by passing suites
- [x] No critical defects found in this session
- [ ] Cross-browser run (Chrome/Edge/Firefox) **not** executed here — only Chromium was available (issue #25 is Prithvi's)
- [ ] Hosted CI has never run; it will run on the first PR (`app-ci.yml`)

## 5. Defects and problems found today

| # | Description | Status |
|---|---|---|
| 1 | Repository missing ~90 % of the application (not runnable from GitHub) | Fixed on the integration branch (pending PR) |
| 2 | My first integration commit left out diagram PNGs → `check_trace.py` 33 failures | Fixed in `69f63fe` |
| 3 | Homebrew MongoDB install blocked (Xcode CLT outdated, needs sudo) | Worked around with MongoDB's official tarball in `~/.local/mongodb` and `MONGOD_BIN` |

No product defect was found by the new tests.

## 6. Pre-existing issues (not caused by this work)

- TC-109 (SEC-REQ-007) Blocked: no HTTPS deployment (unchanged, see `IMPLEMENTATION_STATUS.md`).
- `npm audit`: 30 advisories (3 low, 24 moderate, 3 high). High: `@playwright/test`/`playwright`
  (dev only) and `body-parser` (transitive via Express). `npm audit fix` changes the lockfile; suggest a
  separate PR with a full re-test.
- `docs/working/sad/04c2-api02-access.md` (API-02 table) does not list the new `PATCH /boards/{boardId}`
  and the FR-051 matrix has no "rename" row; left for the document owners (Prithvi/Krishna).
- `submission/final/` deliverables predate these changes.

## 7. Sprint status (from the code and tests; issues not closed — owners decide)

| Sprint | Issues | Observation |
|---|---|---|
| 1 Foundation | #7, #8, #9 | Present in the snapshot and covered by passing tests; land on `main` with PR 1 |
| 2 Core Whiteboard | #12, #13, #14, #15, #16, #17, #23 | #13, #16 done (PR 2). Others present in the snapshot with passing tests (#23 responsive layout: not separately tested here) |
| 3 Real-Time | #11, #18 | Present; sync/reconnection suites pass |
| 4 Testing & Finalization | #10, #19, #26 (done, PR 2); #20, #21, #22, #24, #25 | Others' issues: related suites pass, but their owners must confirm the acceptance criteria; #25 needs the multi-browser run |

## 8. How to reproduce

```sh
npm ci
npx playwright install chromium
export MONGOD_BIN=/path/to/mongod      # or have mongod on PATH
npm run lint && npm test && npm run build && npm run test:e2e
python3 tools/check_trace.py && python3 -m unittest discover -s tools/tests
```
