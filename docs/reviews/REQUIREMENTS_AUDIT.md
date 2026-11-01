# Requirements audit (14-10-2026, sessions 4 and 5)

Every requirement of the SRS (35 FR, 7 NFR, 8 SEC-REQ; the IDs and test links come from the RTM,
`docs/traceability/rtm.md`) checked against the code and against tests **executed on 14-10-2026**.
The SE course brief ("Mini-Project Deliverables Part-1") is not in the repository or the project folder;
no requirement was added from any other source.

Scope and limits of every result below:
- Uncommitted working tree of branch `docs/setup`, base commit `82af885` (no commit hash, STP §13).
- Windows 10 Pro 19045, i7-7820HQ (8 threads), Node.js 26.7.0, npm 11.19.0, MongoDB 8.2.1,
  Playwright 1.50.1 (Chromium 133), Google Chrome 155.0.8059.41, Microsoft Edge 155.0.4283.45,
  Playwright Firefox build 1471 (patched, **not** stable Mozilla Firefox; stable Firefox is not installed).
- Local runs only. Hosted GitHub Actions has never run (0 workflows, 0 runs on GitHub).
- Evidence: `docs/evidence/2026-10-14-full-verification/` (README lists every command and exit code).

Classification rules: **IMPLEMENTED AND VERIFIED** = every linked STP test case is covered by automated
tests that exercise the running server (and the browser where the requirement is visible) and all of them
passed today; **BLOCKED BY AN EXTERNAL DEPENDENCY** = the implementation exists but the required
verification needs something not available here. No requirement was found PARTIALLY IMPLEMENTED or NOT
IMPLEMENTED; none is IMPLEMENTED BUT NOT VERIFIED. Code inspection was used only to locate the
implementation and to look for defects, never as verification.

| Classification | Count | Requirements |
|---|---|---|
| IMPLEMENTED AND VERIFIED | 47 | all except the three below |
| BLOCKED BY AN EXTERNAL DEPENDENCY | 3 | NFR-006, NFR-007 (TC-021: stable Firefox and the manual checklist); SEC-REQ-007 (TC-109: no deployed HTTPS instance) |
| IMPLEMENTED BUT NOT VERIFIED / PARTIALLY / NOT IMPLEMENTED | 0 | — |

This matches the RTM (47 **P**, 3 **N**); the audit changes no RTM status.

## Inspection findings (session 4)

- No TODO, FIXME, placeholder or mock data in `server/src`, `shared/src` or `client/src`.
- Undo/redo is out of scope (SRS §1, §2.2) and was not added.
- **Defects found and fixed (SEC-REQ-007, application side)**, each shown failing first:
  1. With `FORCE_HTTPS`, the redirect target was built from the client's `Host` header
     (`Location: https://attacker.example/…`). Now built from `PUBLIC_URL` (`server/src/rest/app.js`).
  2. With `FORCE_HTTPS`, plain (non-HTTPS) Socket.IO connections were accepted: Socket.IO bypasses the
     Express redirect. Now refused unless the proxy forwarded the request as HTTPS (`server/src/server.js`,
     `allowRequest`).
  3. The client CSP allowed `ws:` under `FORCE_HTTPS`. Now `connect-src 'self' wss:` only (`app.js`).
  4. `FORCE_HTTPS=true` without `TRUST_PROXY=true` (endless redirect) or with an `http://` `PUBLIC_URL`
     (insecure share links) was accepted. Now the server refuses to start (`server/src/config.js`).
  Regression tests: `server/tests/integration/transport.test.js` (5 tests), `server/tests/unit/config.test.js`
  (1 new test). Before: 3 failed / 2 passed and the config test failed; after: 9/9 passed.
- Reviewed with no defect found: token verification and revocation, login limiter and constant-cost login,
  ObjectId validation before queries, strict JSON schemas with `additionalProperties: false`, merged-object
  validation of updates, size limit before writes, persist-before-ack, per-board queue, link-token handling,
  guest-token checks on the socket handshake, text rendered without HTML sinks.
- CI configuration corrected (not run on GitHub): job timeouts, MongoDB service health check, manual
  trigger; Node.js floor raised to 22.12 (`package.json`), see the evidence README.

## Requirements

| ID | Requirement | Source | Implementation | Test coverage | Latest result (14-10-2026, local) | Classification | Remaining work |
|---|---|---|---|---|---|---|---|
| FR-001 | Freehand stroke | SRS 4.1 | client/src (pages, board/*.jsx); shared/src/syncClient.js; server/src/realtime/* | TC-001: sync.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-002 | Colour and stroke width | SRS 4.1 | client/src (pages, board/*.jsx) | TC-001: sync.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-003 | Rectangle, ellipse, line | SRS 4.1 | client/src (pages, board/*.jsx); shared/src/syncClient.js; server/src/realtime/* | TC-002: whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-004 | Text objects | SRS 4.1 | client/src (pages, board/*.jsx); shared/src/syncClient.js; server/src/realtime/* | TC-002: whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-005 | Select, move, restyle, delete | SRS 4.1 | client/src (pages, board/*.jsx); shared/src/syncClient.js; server/src/realtime/* | TC-003: whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-006 | Object eraser | SRS 4.1 | client/src (pages, board/*.jsx); shared/src/syncClient.js; server/src/realtime/* | TC-004: geometry.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-007 | Owner-only clear; pre-clear content kept; recovery | SRS 4.1 | server/src/access/*; server/src/realtime/*; server/src/versions/versionService.js; server/src/db/models.js | TC-005: sync.test.js; whiteboard.spec.cjs; TC-025: recovery.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-008 | Board content size limit 15 MiB (M3) | SRS 4.1 | client/src (pages, board/*.jsx); server/src/realtime/* | TC-022: boardLimit.test.js | TC-022: idle pass (67.4 s after the session-5 persistence fix, battery); under 16-process load: passed in session 4 (295.6 s, AC power) and, in session 5 on battery, finished 3.7 s after the 300 s budget (not a clean pass) | IMPLEMENTED AND VERIFIED | Team review of the TC-022 record (D-03..D-07); rerun on a commit |
| FR-020 | Broadcast accepted operations | SRS 4.2 | shared/src/syncClient.js; server/src/realtime/* | TC-001: sync.test.js; whiteboard.spec.cjs; TC-002: whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-021 | Server sequence numbers and ordering | SRS 4.2 | shared/src/syncClient.js; server/src/realtime/* | TC-006: sync.test.js; TC-007: sync.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-022 | Independent edits preserved | SRS 4.2 | server/src/realtime/* | TC-006: sync.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-023 | Same-object last write wins | SRS 4.2 | shared/src/syncClient.js; server/src/realtime/* | TC-007: sync.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-024 | Full state on join | SRS 4.2 | server/src/realtime/*; server/src/db/models.js | TC-008: sync.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-025 | Disconnect indicator and resync | SRS 4.2 | shared/src/syncClient.js; server/src/realtime/* | TC-009: whiteboard.spec.cjs; perf browser.js | TC-009: max 2,330 ms Chromium, 2,119 ms Chrome 155; E2E pass | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-026 | Rejection feedback and rollback | SRS 4.2 | shared/src/syncClient.js; server/src/realtime/* | TC-010: sync.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-027 | Persist before broadcast | SRS 4.2 | server/src/realtime/*; server/src/db/models.js | TC-011: recovery.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-030 | Automatic versions, no-change rule | SRS 4.3 | server/src/versions/versionService.js; server/src/db/models.js | TC-005: sync.test.js; whiteboard.spec.cjs; TC-012: versions.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-031 | Version list for all roles | SRS 4.3 | client/src (pages, board/*.jsx); server/src/versions/versionService.js | TC-012: versions.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-032 | Read-only version preview | SRS 4.3 | client/src (pages, board/*.jsx); server/src/versions/versionService.js | TC-012: versions.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-033 | Owner-only restore as new version; recovery | SRS 4.3 | server/src/access/*; server/src/versions/versionService.js; server/src/db/models.js | TC-013: versions.test.js; whiteboard.spec.cjs; perf restore.js; TC-024: recovery.test.js; versions.test.js; TC-102: access.test.js | TC-013: max 835.8 ms; Jest and E2E pass | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-034 | Restored state pushed to all | SRS 4.3 | server/src/realtime/*; server/src/versions/versionService.js | TC-013: versions.test.js; whiteboard.spec.cjs; perf restore.js | TC-013: max 835.8 ms; Jest and E2E pass | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-035 | Retain at least 20 versions | SRS 4.3 | server/src/versions/versionService.js; server/src/db/models.js | TC-014: versions.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-040 | Register account | SRS 4.4 | server/src/rest/app.js; server/src/auth/authService.js | TC-015: auth.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-041 | Log in and log out | SRS 4.4 | server/src/rest/app.js; server/src/auth/authService.js | TC-015: auth.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-042 | Create board, creator is Owner | SRS 4.4 | server/src/rest/app.js; server/src/access/* | TC-016: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-043 | Dashboard of boards | SRS 4.4 | client/src (pages, board/*.jsx); server/src/rest/app.js; server/src/access/* | TC-016: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-044 | Owner-only board deletion | SRS 4.4 | server/src/access/*; server/src/realtime/* | TC-016: access.test.js; whiteboard.spec.cjs; TC-102: access.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-045 | Create share link with role and expiry | SRS 4.4 | server/src/access/* | TC-017: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-046 | Join via link (member or guest) | SRS 4.4 | server/src/auth/authService.js; server/src/access/* | TC-017: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-047 | Revoke share link | SRS 4.4 | server/src/access/*; server/src/realtime/* | TC-103: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-048 | Expired link rejected | SRS 4.4 | server/src/access/*; server/src/realtime/* | TC-103: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-049 | Change member role or remove | SRS 4.4 | server/src/access/*; server/src/realtime/* | TC-023: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-050 | Transfer ownership to a member | SRS 4.4 | server/src/rest/app.js; server/src/access/*; server/src/realtime/* | TC-018: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-051 | Permission matrix enforced | SRS 4.4 | server/src/rest/app.js; server/src/access/*; server/src/realtime/* | TC-101: access.test.js; TC-102: access.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| FR-052 | Participant presence list | SRS 4.4 | client/src (pages, board/*.jsx); server/src/realtime/* | TC-017: access.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| NFR-001 | 95% of updates visible within 500 ms | SRS 5 | shared/src/syncClient.js; server/src/realtime/*; server/src/logger.js | TC-019: perf latency.js | TC-019: p95 44.3 ms | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| NFR-002 | At least 10 concurrent participants | SRS 5 | server/src/realtime/* | TC-019: perf latency.js | TC-019: p95 44.3 ms | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| NFR-003 | TB-STD loads within 3 s | SRS 5 | client/src (pages, board/*.jsx); server/src/rest/app.js | TC-020: perf browser.js | TC-020: max 208.8 ms Chromium, 222 ms Chrome 155 | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| NFR-004 | Reconnect recovery within 5 s | SRS 5 | shared/src/syncClient.js; server/src/realtime/* | TC-009: whiteboard.spec.cjs; perf browser.js | TC-009: max 2,330 ms Chromium, 2,119 ms Chrome 155; E2E pass | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| NFR-005 | Restore visible to all within 3 s | SRS 5 | server/src/realtime/*; server/src/versions/versionService.js | TC-013: versions.test.js; whiteboard.spec.cjs; perf restore.js | TC-013: max 835.8 ms; Jest and E2E pass | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| NFR-006 | Chrome, Firefox, Edge support | SRS 5 | client/src (pages, board/*.jsx) | TC-021: usability.spec.cjs (automated part) + manual checklist | TC-021: automated checklist passed in Chrome 155 / Edge 155 / patched Firefox; stable Firefox absent, manual checklist not run | BLOCKED BY AN EXTERNAL DEPENDENCY | Install stable Mozilla Firefox (approval) and run the TC-021 manual checklist; decision D-08 |
| NFR-007 | Role/status visible, labelled toolbar | SRS 5 | client/src (pages, board/*.jsx) | TC-021: usability.spec.cjs (automated part) + manual checklist | TC-021: automated checklist passed in Chrome 155 / Edge 155 / patched Firefox; stable Firefox absent, manual checklist not run | BLOCKED BY AN EXTERNAL DEPENDENCY | Install stable Mozilla Firefox (approval) and run the TC-021 manual checklist; decision D-08 |
| SEC-REQ-001 | Password policy and salted hashing | SRS 5.1.2 | server/src/auth/authService.js; server/src/db/models.js | TC-105: auth.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| SEC-REQ-002 | Tokens required, expiry, logout | SRS 5.1.2 | server/src/rest/app.js; server/src/auth/authService.js; server/src/realtime/* | TC-106: auth.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| SEC-REQ-003 | Server-side authorisation of every request/event | SRS 5.1.2 | server/src/rest/app.js; server/src/access/*; server/src/realtime/* | TC-101: access.test.js; TC-102: access.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| SEC-REQ-004 | Link token entropy, hashing, expiry | SRS 5.1.2 | server/src/access/*; server/src/db/models.js | TC-103: access.test.js; whiteboard.spec.cjs; TC-104: securityLog.test.js; access.test.js; auth.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| SEC-REQ-005 | Schema validation, size limit, no HTML | SRS 5.1.2 | client/src (pages, board/*.jsx); server/src/rest/app.js; server/src/realtime/* | TC-107: sync.test.js; whiteboard.spec.cjs | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| SEC-REQ-006 | Login and operation rate limits | SRS 5.1.2 | server/src/rest/app.js; server/src/realtime/* | TC-108: auth.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |
| SEC-REQ-007 | TLS 1.2+ in deployment | SRS 5.1.2 | server/src/config.js, server/src/rest/app.js, server/src/server.js (app side); TLS proxy (deployment, absent) | TC-109: manual (deployment); supplementary transport.test.js, config.test.js | TC-109: not executed (no deployment); app-side controls pass locally (transport/config tests 9/9; real local TLS hop: verify-tls.js 7/7 checks) | BLOCKED BY AN EXTERNAL DEPENDENCY | Deployed HTTPS instance (host, DNS, certificate, proxy); run TC-109 (E3, D-11..D-13) |
| SEC-REQ-008 | Security event logging without secrets | SRS 5.1.2 | server/src/rest/app.js; server/src/auth/authService.js; server/src/access/*; server/src/realtime/*; server/src/versions/versionService.js; server/src/logger.js | TC-104: securityLog.test.js; access.test.js; auth.test.js | all linked automated tests passed (Jest 85/85, E2E 10/10 + 29/30; session 5) | IMPLEMENTED AND VERIFIED | Rerun on a commit and record the hash (STP §13); hosted CI |

## Session 5 additions

- Defect fixed (performance/reliability, FR-008/NFR-001 path): object additions and updates paid about ten
  times the write cost in Mongoose re-casting of already-validated point arrays; now written through the
  native driver (`boardEngine.js`, `models.js`), with `server/tests/integration/persistence.test.js`
  proving identical stored documents. The TC-022 heartbeat misses were explained (event-loop stalls in
  the shared test process; see IMPLEMENTATION_STATUS §11).
- SEC-REQ-007: `scripts/verify-tls.js` automates TC-109 steps 1–4; its local self-test through a real TLS
  1.2+ proxy (`server/tests/integration/tls.test.js`) passed all seven checks. Still not TC-109.
- One full `npm run perf` run failed TC-019 (p95 1,935.6 ms) with multi-second machine stalls on battery;
  three standalone repeats (both engine versions) and a full repeat passed (p95 56.8–81.9 ms). The
  classification of NFR-001 is unchanged; the failed run is recorded in the evidence.

## Remaining work

| Item | Type |
|---|---|
| TC-021: install stable Mozilla Firefox (needs approval), run the manual checklist in Chrome, Edge and Firefox at 1280 × 720 (D-08, D-09) | EXTERNAL BLOCKER / REQUIRED TESTING |
| TC-109: deployed HTTPS instance and owner (E3, D-11 to D-13), then the plan in `TC109_DEPLOYMENT_PLAN.md` | EXTERNAL BLOCKER |
| Commit (each member with their own commits), rerun on the commit, record the hash in the STP (STP §13) | REQUIRED TESTING / TEAM DECISION |
| Hosted CI: open a Pull Request and record both workflow runs | REQUIRED TESTING (needs repository access) |
| TC-022 record and the 300 s timeout margin under load (D-03 to D-07) | TEAM/INSTRUCTOR DECISION |
| Approvals, deadline, treatment of Blocked tests (E1, E2, D-02) | TEAM/INSTRUCTOR DECISION |
