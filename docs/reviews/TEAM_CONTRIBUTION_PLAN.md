# Team contribution plan — four balanced workstreams (proposal)

Prepared 18-10-2026 from a read-only inspection of the repository.

**Status: proposal.** Nothing in this plan has been implemented. It does not change any assignment in
`TEAM_ACTION_TRACKER.md` or any decision in `TEAM_REVIEW_AGENDA.md`; the team confirms or changes it
(agenda D-16, D-19).

**Not run while preparing this plan:** no tests, builds, installs or Git commands that change state. Every
"acceptance" item below is a criterion to meet later, not a result.

Members (roles as in the approval tables):

| Short | Member | Role |
|---|---|---|
| RM | Rachit S Mane | SRS Lead / Product Owner |
| KR | P Chinni Krishna Reddy | SAD Lead / Dev Lead |
| PM | Pranav V Menon | STP Lead / QA Lead |
| PW | Prithvi W | Security & Traceability Lead / Security Test Lead |

## 1. Repository state at inspection (verified, 18-10-2026)

- **Branch and commits:**
  - Local branch `docs/setup` at `82af885` ("docs: add SRS SAD and STP deliverables").
  - Only two commits exist, both by the GitHub account `RachitSMane`.
  - Other branches: local `main` and `docs/readme`; remote `origin/main` and `origin/docs/setup`.
- **Working tree:** almost the whole project is uncommitted.
  - **Modified:** `README.md`, `submission/final/Team11_{SAD,SRS,STP}.docx`.
  - **Untracked:** `.github/`, `.gitignore`, `client/`, `docs/`, `e2e/`, `eslint.config.js`,
    `jest.config.js`, `package.json`, `package-lock.json`, `perf-results/`, `playwright.config.cjs`,
    `scripts/`, `server/`, `shared/`, `tools/`, and `submission/final/*.pdf`.
  - The uncommitted tree includes the stroke-width tooltip fix in `client/src/board/Toolbar.jsx`
    (17-10-2026, TC-021 D3).
- **Code size:**
  - Implementation, tests and tools: about 11,600 lines in 66 JS/JSX/CJS/PY/CSS files.
  - Server: about 2,600 lines. Client: about 2,600 lines. Shared: about 400 lines.
  - Tests: about 3,500 lines in Jest and Playwright. Tools: about 1,500 lines of Python.
- **Test status:** per `docs/IMPLEMENTATION_STATUS.md` §5, TC status is 33 Pass, 1 Blocked (TC-109), 0 Fail.
  Not re-run for this plan.
- **Hosted CI** (`.github/workflows/app-ci.yml`, `docs-check.yml`) has never run (DECISIONS E4).

### 1.1 Implemented features and how they connect (verified from code)

| Area | Main files | Connects to |
|---|---|---|
| Canvas editing: pen, eraser, shapes, text, select/move/restyle/delete | `client/src/board/{Canvas,Toolbar,BoardPage,render,geometry}.js(x)` | `shared/src/objects.js` (`applyOperation`, `LIMITS`) |
| Real-time sync and reconnection | `shared/src/syncClient.js` (client side); `server/src/realtime/{realtimeServer,boardEngine,boardQueue,boardStore}.js` | Socket.IO, WebSocket only; heartbeat 10 s + 10 s (`server/src/server.js`) |
| Board size limit (FR-008) | `boardEngine.js:50` uses `LIMITS.BOARD_CONTENT_LIMIT` (15,728,640 B) | `server/src/errors.js` `BOARD_FULL`; `client/src/api.js` `describeError` |
| Versions, restore, clear, recovery | `server/src/versions/versionService.js`, `server/src/recovery.js`, `server/src/faults.js` (test hooks) | SD-02, SD-05; `FAULT_INJECT` (test only) |
| Accounts, boards, members, share links, guests, ownership transfer | `server/src/auth/authService.js`, `server/src/access/{accessService,policy}.js`, `server/src/rest/app.js`; client `pages/{Auth,Dashboard,Join}.jsx`, `board/{OwnerDialogs,SidePanel}.jsx` | validation `server/src/validation.js` (display name 1–30, `LIMITS.MAX_DISPLAY_NAME`) |
| Security transport (SEC-REQ-007, local part) | `server/src/config.js` (FORCE_HTTPS requires TRUST_PROXY and https PUBLIC_URL), `rest/app.js` (redirect, HSTS, CSP `wss:`), `server.js` | tests `server/tests/integration/{transport,tls}.test.js`, `unit/config.test.js` |
| Logging and security events | `server/src/logger.js` | `server/tests/integration/securityLog.test.js` |
| Docs tooling | `tools/{build_docs,check_trace,size_model,render_diagrams}.py`, `tools/export_pdf.ps1` | `docs/working/**`, `docs/traceability/rtm.md` |

### 1.2 Verified gaps

These were found by reading the code and tests, not the documentation alone.

| # | Gap | Evidence |
|---|---|---|
| G1 | The automated TC-021 checklist counts an `aria-label` as a "label". It does not check that a visible tooltip appears, and Tab reach is checked only for the 7 tool buttons. That is why the stroke-width +/− tooltip defect (TC-021 D3) was not caught automatically. | `e2e/usability.spec.cjs:11–27`, `:61–73` |
| G2 | No UI or E2E test shows the "Board is full" message (FR-026 with FR-008). | No match for `Board is full` or `BOARD_FULL` in `e2e/`, `client/tests/`; the mapping is in `client/src/api.js:39–40`; proposal G / IMP-9 |
| G3 | The display-name fields silently drop characters beyond 30. There is no counter and no message; only the empty name gets a message. | `client/src/pages/Join.jsx:62`, `:95` (`maxLength`), `Auth.jsx:69`, `:92`; TC-021 RESULTS D1 |
| G4 | The error-code contract is split. Codes and server texts are in `server/src/errors.js`; the client maps only 3 codes in `describeError`. No test checks that every server code has adequate user-facing text. | `server/src/errors.js:2–45`, `client/src/api.js:37–48` |
| G5 | The TC-009 offline test cannot cause an outage in Firefox engines (`setOffline()` does not close WebSockets), so it is skipped or fails there. A TCP-relay approach was only prototyped outside the repository. | `IMPLEMENTATION_STATUS.md` §5 "Skipped"; STP TC-021 record |
| G6 | `versions.test.js` `beforeAll` hooks pass no explicit timeout. A hook timed out once under CPU load (`IMPLEMENTATION_STATUS.md` §6 issue 1, IMP-4). Whether the project's `testTimeout: 120000` now also covers hooks has **not been verified**. | `server/tests/integration/versions.test.js:38`, `:66`; `jest.config.js` |
| G7 | Client unit tests cover only `geometry.js`. There is no React component test tooling, and adding packages is a team decision. | `client/tests/geometry.test.js`, `client/package.json` |
| G8 | Not investigated: in the TC-021 Owner screenshot (dark-themed Firefox window) most colour swatches are not visible. The stylesheet has no `color-scheme` rule. | `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md` D5; `client/src/styles.css` |

Already done, so **not** assigned again:
- IMP-6 (local FORCE_HTTPS/TRUST_PROXY test): `transport.test.js`.
- IMP-7 (start-up check): `config.js`.
- IMP-8 (CSP `wss:` only): `app.js:54`.
- The deployment note in the SAD: `03e-security-architecture.md:56`.

## 2. Allocation

Each member gets one implementation task with tests, one smaller code or test improvement, and the
documentation for their own files. Estimates are working hours, including PR review of one other member.

| Member | Workstream | Implementation | Tests | Documentation / traceability | Est. |
|---|---|---|---|---|---|
| **Rachit** | Requirements + client feature | **R1** display-name length feedback (G3): live "n / 30" counter and an explicit message when typed or pasted text exceeds 30 characters, on the Join and Register pages; pure helper `client/src/displayName.js`. **R2** investigate G8; if reproducible, minimal CSS fix | unit test for the helper; new E2E `e2e/names.spec.cjs` (0, 30, 31-by-paste) | SRS: FR-026 acceptance wording (04b), acceptance mapping (06), revision history (00); SAD 04d user-facing messages (with PW's table) | ~12 h |
| **Krishna** | Backend feature + architecture docs | **K1** test-only hook `BOARD_LIMIT_OVERRIDE_BYTES` (honoured only with `NODE_ENV=test`, like `LINK_EXPIRY_OVERRIDE_SEC`) used by `boardEngine` instead of the 15 MiB limit, so UI tests can reach `BOARD_FULL` quickly. **K2** G6: verify hook timeouts in `versions.test.js`; add explicit timeouts only if needed | new integration test for the hook (rejects at the override, ignored outside test); `config.test.js` case | SAD §4.1.6 test hooks (04a), §4.6 open issues (04e), §3.7 risk note if relevant (03c) | ~12 h |
| **Pranav** | Reliability + automated tests | **P1** strengthen `e2e/usability.spec.cjs` (G1): every toolbar control must show visible text or a visible tooltip on hover **and** keyboard focus; Tab reaches every toolbar control. **P2** G5: TCP-relay helper `e2e/relay.cjs` so the TC-009 outage also works in Firefox engines; adapt only the TC-009 test in `e2e/whiteboard.spec.cjs` | the strengthened spec itself; TC-009 in Chrome/Edge (regression) and Playwright Firefox | STP records (sole editor of the files he owns): TC-009, TC-021 automated-check description, and the records others' changes need (TC-015/017 names, FR-026/TC-022 note); `IMPLEMENTATION_STATUS.md` | ~13 h |
| **Prithvi** | Shared contracts + E2E | **W1** shared error-code contract (G4): new `shared/src/errorCodes.js` (codes, HTTP status, default texts), used by `server/src/errors.js` and `client/src/api.js`; `describeError` covers every user-facing code. **W2** board-full E2E (G2) using K1 | contract unit test `shared/tests/errorCodes.test.js` (every code has status and text; client covers every code); new E2E `e2e/boardfull.spec.cjs` | RTM rows for new tests (`rtm.md`); STP §13 (`13-traceability.md`); SRS 04d FR-046 guest-name wording for R1; SAD 04c2 error codes if affected; run `check_trace.py` | ~12 h |

**Why this is balanced:**
- Each member has one cross-layer feature or test improvement of 3–4 h and one smaller code task of
  1.5–3 h.
- Each has at least 2 h of tests and 2–3 h of documentation in files they already own (see the
  `Owner:` comments at the top of each source file).
- Pranav has the most STP editing, because he is the STP owner and enters the other members' TC changes.
  To compensate, his code tasks are test-only, with no product code.
- Krishna and Prithvi change product code on the server and in `shared/`. Rachit changes product code in
  the client.
- Nobody has documentation-only work.

## 3. File ownership (one owner per file)

A file listed here is edited **only** by its owner during this plan. Anyone else who needs a change
asks the owner in the PR, and the owner makes it. New files are listed under their author.

| Member | Code and test files | Documentation files |
|---|---|---|
| Rachit | `client/src/pages/Join.jsx`, `client/src/pages/Auth.jsx`, `client/src/styles.css`, **new** `client/src/displayName.js`, **new** `client/tests/displayName.test.js`, **new** `e2e/names.spec.cjs` | `docs/working/srs/00-front-matter.md` (revision history only), `04b-fr-sync.md`, `06-acceptance.md`; `docs/working/sad/04d-errors-logging.md`; `README.md` (only if a run step changes) |
| Krishna | `server/src/config.js`, `server/src/realtime/boardEngine.js`, `server/src/server.js` (pass config to the engine), `server/tests/unit/config.test.js`, `server/tests/integration/versions.test.js`, **new** `server/tests/integration/boardLimitOverride.test.js` | `docs/working/sad/04a-design-overview.md` (§4.1.6), `04e-ux-open-issues.md`, `03c-pattern-stack-risks.md` |
| Pranav | `e2e/usability.spec.cjs`, `e2e/whiteboard.spec.cjs` (TC-009 test only), **new** `e2e/relay.cjs`, `playwright.config.cjs` (only if a project setting is needed) | `docs/working/stp/tc-functional-nfr.md`, `05-strategy.md`, `06-12-environment-to-suspension.md`, `14-15-metrics-approvals.md`; `docs/IMPLEMENTATION_STATUS.md` |
| Prithvi | **new** `shared/src/errorCodes.js`, `shared/package.json` (export entry), `server/src/errors.js`, `client/src/api.js`, **new** `shared/tests/errorCodes.test.js`, `e2e/helpers.cjs`, `e2e/globalSetup.cjs` (sets the K1 override for the E2E server), **new** `e2e/boardfull.spec.cjs`, `.github/workflows/app-ci.yml` (only if new specs need a step) | `docs/traceability/rtm.md`, `docs/working/stp/13-traceability.md`, `docs/working/srs/04d-fr-access.md`, `docs/working/sad/04c2-api02-access.md` |

Excluded for everyone during this plan: `server/tests/integration/boardLimit.test.js` (TC-022 was decided
on 16-10-2026: D-03 to D-07).

## 4. Dependencies and integration points

| # | Dependency | Who waits | Coordination |
|---|---|---|---|
| D0 | **Baseline commit.** Nothing except two documentation commits is in Git. Until the current tree is committed and pushed, no member can branch from shared history. | everyone | Team decision D-16 (still open). Recommendation: one PR "baseline: existing implementation, tests and docs (pre-allocation)", made by the repository owner. State in the PR that it is shared prior work. See §7. |
| D1 | W2 (board-full E2E) needs K1 (override hook) merged first. | Prithvi | KR merges K1 first; PW then sets `BOARD_LIMIT_OVERRIDE_BYTES` in `e2e/globalSetup.cjs`. Agree the value (proposal 1 MiB) so other E2E tests stay well below it; record it as an E2E deviation in the STP (PM). |
| D2 | W1 changes `server/src/errors.js`, which `boardEngine.js` (K1) imports (`AppError`). | Krishna, Prithvi | Keep `AppError` and its constructor unchanged; merge W1 and K1 in either order, then rebase the second. |
| D3 | R1 messages and W1 error texts both appear in SAD 04d (Rachit's file). | Rachit | PW gives the final code→text table in the W1 PR; RM updates 04d after W1 merges. |
| D4 | P1 (stricter usability check) runs against all toolbar controls, including any control R1 or K1 might add. | Pranav | P1 merges last, or is rerun after the R1 and W1 merges. |
| D5 | Every member's change needs an STP record update (PM) and possibly RTM rows (PW). | Pranav, Prithvi | Authors put the proposed record text in their PR description; PM and PW apply it in their own doc PRs. |
| D6 | Deliverables `docs/final/*.docx` and `submission/final/*` must not be rebuilt by this plan. | everyone | Regeneration stays a separate, later task (tracker FIN-03, FIN-04a; four-member review first). |

## 5. Commands and acceptance criteria

The commands come from the root `package.json`. **None was run while preparing this plan.**

| Purpose | Command |
|---|---|
| Lint | `npm run lint` |
| Unit tests (shared, server unit, client) | `npm run test:unit` |
| Integration tests (starts a temporary `mongod`) | `npm run test:integration` |
| Full Jest suite | `npm test` |
| E2E, Chromium (rebuilds the test client first) | `npm run test:e2e` |
| E2E, installed Chrome and Edge (+ Playwright Firefox) | `npm run test:e2e:browsers -- --output <new folder>` (never overwrite `test-results/`) |
| One spec only | `npx playwright test e2e/<file>.cjs` after `npm run build:test` |
| Traceability | `python tools/check_trace.py` |

| Task | Acceptance criteria (to be shown in the PR) |
|---|---|
| R1 | Counter visible on Join and Register; a 31st character (typed or pasted) is refused with a visible message, not silently dropped; 1–30 still accepted; server validation unchanged; `displayName.test.js` and `names.spec.cjs` pass in Chromium; lint clean. |
| R2 | Either a reproduction plus a minimal CSS fix with before/after screenshots, or a written "not reproducible" note with the environment used. |
| K1 | With the override set and `NODE_ENV=test`, an addition that exceeds the override is rejected with `BOARD_FULL`. Outside `NODE_ENV=test` the override is ignored (unit test). The default limit is unchanged. `npm run test:integration` passes. |
| K2 | Documented check of whether hook timeouts are covered; change only if needed; `versions.test.js` passes alone and in `npm test`. |
| P1 | The spec fails against a build with a control that has only an `aria-label` (show this once, e.g. on the pre-fix `Toolbar.jsx` from history). It passes on the current build in Chromium, Chrome and Edge. Tab reaches every toolbar control. |
| P2 | The TC-009 test causes a real outage through the relay in Chromium **and** Playwright Firefox; no skip needed; it still passes in Chrome/Edge. |
| W1 | Contract test: every code in `errorCodes.js` has an HTTP status and default text, and `describeError` gives non-empty text for every code. Server responses unchanged (existing integration tests pass). |
| W2 | `boardfull.spec.cjs` shows the "Board is full" message to the submitting user and the change is rolled back on both boards, in Chromium. |
| Docs (all) | Each changed source has an updated STP/RTM/SAD/SRS entry as listed in §3; `python tools/check_trace.py` exits 0. |

## 6. Definition of done (per member)

A member's contribution is done when **all** of the following hold. The reviewer ticks after checking.

- [ ] Code merged to `main` through the member's own PR, with commits authored by the member's own
      GitHub account.
- [ ] New and changed tests are in the same PR and pass. The PR quotes the actual command output; never
      claim a run that did not happen.
- [ ] `npm run lint` clean; `npm test` passes; the relevant E2E spec passes in at least Chromium.
- [ ] Documentation in the member's own files updated. Requested STP/RTM text handed to PM/PW and
      applied.
- [ ] A peer reviewer (§8) approved the PR.
- [ ] No file outside the member's ownership in §3 was edited. No protected file was changed (§9).

## 7. Branches and commit messages (recommendation)

Branch from `main` after the baseline (D0) is merged:

| Member | Branches |
|---|---|
| Rachit | `feat/rm-display-name-feedback`, `fix/rm-swatch-contrast` (only if G8 reproduces), `docs/rm-srs-fr026` |
| Krishna | `feat/kr-board-limit-test-hook`, `test/kr-versions-hook-timeouts`, `docs/kr-sad-test-hooks` |
| Pranav | `test/pm-usability-tooltips`, `test/pm-tc009-relay`, `docs/pm-stp-records` |
| Prithvi | `feat/pw-error-code-contract`, `test/pw-board-full-e2e`, `docs/pw-rtm-updates` |

Commit message examples (imperative, with requirement or TC IDs):
- `feat(client): show display-name length counter and refuse 31st character (FR-040, FR-046)`
- `feat(server): add test-only BOARD_LIMIT_OVERRIDE_BYTES hook (SAD 4.1.6, FR-008)`
- `test(e2e): require visible tooltip on hover and focus for every toolbar control (TC-021, NFR-007)`
- `feat(shared): single error-code contract for server and client (FR-026)`
- `docs(stp): record TC-009 relay outage in Firefox engines`

## 8. Pull requests and peer review

- One PR per branch, into `main`. Small PRs; no force-push after review starts.
- Each PR description contains:
  - what changed and why, with the gap ID from §1.2;
  - the commands run and their real output, including exit codes;
  - the proposed STP/RTM text for PM/PW (D5);
  - a list of the files changed, all from the author's §3 list.
- Reviewer pairs (each member reviews one other member, and is reviewed by a different one):

| Author | Reviewer | Focus |
|---|---|---|
| Rachit | Pranav | test quality of `names.spec.cjs`; STP impact |
| Krishna | Prithvi | hook is test-only; no production behaviour change |
| Pranav | Rachit | spec is strict but not flaky; acceptance wording |
| Prithvi | Krishna | `errors.js` and `AppError` compatibility; server response unchanged |

- Hosted CI (`app-ci.yml`) must pass on each PR once enabled (DECISIONS E4). Until then, the author
  attaches local output.
- Merge order recommendation: D0 → K1 → W1 → R1 → W2 → P2 → P1 → doc PRs (PM, PW, KR, RM).

## 9. Protected files (do not overwrite)

- `submission/final/*` (six DOCX/PDF deliverables) and `docs/final/*.docx`, `docs/staged/*`. They are
  regenerated only in tracker FIN-03/FIN-04a, after the four-member review.
- Existing evidence folders `docs/evidence/*`: add new dated folders; never edit or replace earlier
  evidence.
- `test-results/`, `perf-results/` (existing results): use `--output <new folder>` for new runs.
- `server/.env` (local secrets; ignored by Git) — never commit.
- Accepted decision records (`DECISIONS.md` rows, agenda §4 D-03 to D-08): add dated addenda only.

## 10. Personal completion checklist

Each member ticks their own column; the named reviewer confirms.

| Item | Rachit | Krishna | Pranav | Prithvi |
|---|---|---|---|---|
| Own GitHub account added as collaborator and able to push a branch | [ ] | [ ] | [ ] | [ ] |
| Branch created from `main` after D0 | [ ] | [ ] | [ ] | [ ] |
| Implementation task done (R1 / K1 / P1 / W1) | [ ] | [ ] | [ ] | [ ] |
| Second code task done (R2 / K2 / P2 / W2) | [ ] | [ ] | [ ] | [ ] |
| Tests added and passing; output pasted in PR | [ ] | [ ] | [ ] | [ ] |
| Own documentation files updated | [ ] | [ ] | [ ] | [ ] |
| STP/RTM text handed to PM/PW and applied | [ ] | [ ] | [ ] | [ ] |
| Reviewed the assigned peer's PR (§8) | [ ] | [ ] | [ ] | [ ] |
| Own PRs approved and merged; at least one commit authored by self on `main` | [ ] | [ ] | [ ] | [ ] |
| Reviewer confirmation (name, date) | | | | |

## 11. Open points and uncertainty

- **D0 (baseline commit)** and the Git workflow are team decisions (agenda D-16, D-17; tracker FIN-01).
  The plan cannot start in parallel before them.
- **G6** may already be fixed by `testTimeout: 120000`; K2 starts by verifying this. If it is, K2 shrinks
  to the documentation note, and KR takes the review of W2 in addition.
- **G8** may be caused by the tester's Firefox theme or settings rather than the app. R2 ends with a
  written result either way.
- **The K1 override value in E2E** changes the E2E environment for all specs. The team should agree the
  value and record it as an E2E deviation (FR-008 itself stays covered by `boardLimit.test.js`).
- **Effort estimates** are judgement, not measurements. Rebalance at the first check-in if one task
  grows. Candidate moves: K2 docs to Rachit, or the W1 client part to Rachit.
- **Repository visibility:** `.gitignore` says "repository is public", while the course asks for a
  private repository shared with faculty. Check the GitHub setting (repository owner, DECISIONS E4).
