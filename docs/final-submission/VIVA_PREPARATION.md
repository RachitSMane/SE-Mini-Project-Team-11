# Viva preparation — Team 11

Complements the presentation (`presentation/SPEAKER_NOTES.md`) and the demo guide (`DEMO_GUIDE.md` §4
technical explanation, §6 short answers). This file covers what the FAQ says assessors focus on and the
existing material covered only briefly: **SDLC, Agile process, individual contributions, PR process,
traceability, testing and coverage, deviations**. Every fact below comes from the repository, its Git
history or GitHub; where something is not on record it says so.

## 1. SDLC followed

| Phase | What the team did | Evidence |
|---|---|---|
| Requirements | SRS v1.0 in IEEE format: 35 FRs, 7 measurable NFRs, 3 security objectives, 8 security requirements, 2 use-case diagrams | `docs/final/Team11_SRS.pdf`; `docs/working/srs/` |
| Design | SAD v1.0: layered client–server architecture, 9 components, 5 sequence diagrams, 3 API contracts, STRIDE threat model, error protocol | `docs/final/Team11_SAD.pdf`; `docs/diagrams/` |
| Test planning | STP v1.0: 34 test cases (25 functional/NFR, 9 security in §5.1), RTM with traceability checker | `docs/final/Team11_STP.pdf`; `docs/traceability/rtm.md`; `tools/check_trace.py` |
| Part-1 submission | documents submitted 11-10-2026 (kept unchanged) | `submission/final/`; PR #1 (12-10-2026) |
| Implementation | MERN + Socket.IO, organised as 20 backlog issues in 4 sprint milestones; integrated through PRs #2–#33 | GitHub issues #7–#26, milestones 1–4 |
| Verification | STP executed 12-10-2026 and re-run after each integration; CI on every PR; final regression 02-11-2026; reports 05-11-2026 | `docs/IMPLEMENTATION_STATUS.md`; `docs/reports/`; `docs/testing-reports/` |
| Maintenance of documents | SRS/SAD/STP updated to the implementation with dated addenda; deviations recorded | `DOCUMENTATION_AUDIT.md`; `DEVIATIONS.md` |

**How to describe it in one sentence:** a document-first ("V-model-like") front end — requirements,
design and test plan written and traced before coding — followed by iterative, sprint-based
implementation with continuous integration and test execution against the plan.

## 2. Agile process — what to say honestly

- **Backlog:** 20 GitHub issues, each with a description, task list and acceptance criteria, labels for
  type and priority, one assignee each (5 per member). Created 30-10-2026 (`AGILE_AND_GITHUB_AUDIT.md` §3).
- **Sprints:** four two-week milestones (Foundation; Core Whiteboard; Real-Time Collaboration; Testing and
  Finalization), each with objective, scope and completion notes in the milestone description. For the
  course's "Sprint 1 / Sprint 2", use the mapping the team confirms (`sprint-videos/README.md` §1).
- **Estimation:** story points are **not on record** in the issues. If the team estimates them now in
  the GitHub Project, say they were estimated retrospectively. If you estimated informally during
  planning, say how (e.g. "we sized by priority labels and effort in days") — only if true.
- **Blockages (real examples):** (1) the app code was in local working trees and had to be restored
  into the repository (PR #27, "restore missing application files from team working-tree snapshot");
  (2) a merge conflict broke `BoardPage.jsx` on `main` (PR #28, red CI) — repaired in PR #31;
  (3) MongoDB 8.0 would not start on the CI runner's new Linux kernel — fixed in commit `eeb07af`;
  (4) Firefox offline emulation does not close WebSockets — diagnosed, test step adjusted (`12d7e34`);
  (5) no HTTPS deployment environment — TC-109 Blocked.
- **Timeline honesty:** the sprint dates are the plan; issues were recorded on 30-10-2026 and code
  merged 26-10 to 02-11-2026 (presentation slide 15 already says this).

## 3. Individual contributions (from Git and GitHub only)

The large application baseline entered the repository in one commit, `7e1d2a2` (Pranav, PR #27,
"restore missing application files from team working-tree snapshot"). Git therefore does **not** show
who originally wrote each file of that snapshot. Each member should present the issues assigned to
them and the PRs and commits they authored, listed below, and be ready to walk through that code.

| Member | Issues assigned | PRs raised | Commits authored (non-merge, `main`) | Code to be ready to explain |
|---|---|---|---|---|
| **Rachit S Mane** (owner) | #8, #14, #17, #21, #23 | #1, #2, #6, #31, #32, #33, #34 | 17: documents, `7028ca0` canvas DPR/multi-pointer, `a5e57c7` BoardPage repair, `c08e63b` responsive top bar, `cc3e33c` readable errors + validation E2E, `d0b4937` compatibility fixes, `12d7e34` smoke test, `85da387` dependency security update, release reports | `client/src/board/Canvas.jsx`, `BoardPage.jsx`, `pages/Auth.jsx`, `e2e/validation.spec.cjs`, `e2e/responsive.spec.cjs`, `e2e/compat.spec.cjs`, `e2e/smoke.spec.cjs` |
| **P Chinni Krishna Reddy** | #7, #11, #18, #22, #24 | #4, #30 | `2e50004` backend board capacity, `efb2a98` real-time sync issues #7 #18 #22 #24, `b3a8f75` heartbeat test fix | `server/src/realtime/`, `shared/src/syncClient.js`, `server/tests/integration/multiClient.test.js`, `sync.test.js`, `shared/tests/syncLifecycle.test.js` |
| **Pranav V Menon** | #10, #13, #16, #19, #26 | #3, #27, #28 | `b4e95a6` E2E tests + STP, `7e1d2a2`/`69f63fe` baseline restore, `20097f4` board rename, `0f7cad0` PNG export, `50243ef` board E2E, `9578520` backend unit/integration tests, `b86de85` release report, `eeb07af` CI MongoDB fix | `client/src/board/exportImage.js`, `server/src/rest/app.js` (rename route), `e2e/boards.spec.cjs`, `server/tests/`, `.github/workflows/app-ci.yml` |
| **Prithvi W** | #9, #12, #15, #20, #25 | #5, #29 | `1c72bee` shared errors + traceability, `68b0e0c` baseline restore, `702838b` shared errors, DB validation, canvas fallback, E2E browser matrix | `shared/src/errorCodes.js`, `server/src/db/models.js`, `integrity.js`, `server/src/access/`, `scripts/e2e-browsers.js`, `server/tests/integration/dbIntegrity.test.js` |

Document roles (README "Team"): Rachit — SRS lead; Krishna — SAD lead; Pranav — STP lead; Prithvi —
security and traceability lead.

**Exceptions to know about:** #17 (Rachit) has no PR of his own on record; #26 (Pranav) was completed
in PR #33 by Rachit; PR #27 touched issues of all four members (`AGILE_AND_GITHUB_AUDIT.md` §5).

## 4. Pull Request and review process — what to say honestly

- Work was done on feature branches and merged into `main` through 14 PRs; the CI workflows were added in PR #27 (01-11-2026), and **every PR from then on ran CI**
  (`app-ci`, `docs-check`).
- The owner merged the integration PRs #27, #28 and #30; teammates merged #3, #4, #5 and #29 themselves.
- **No PR has a formal GitHub review recorded.** Do not claim otherwise. Say what you would change:
  branch protection with one required approval and required checks (DECISIONS.md E4), which would also
  have stopped PR #28 being merged with a failing check.

## 5. Requirements → design → code → test (how to show traceability live)

1. Pick a requirement, e.g. **FR-033** (Owner-only restore as a new version, crash-safe).
2. RTM row: `docs/traceability/rtm.md` → design SD-02, API-03 → tests TC-013, TC-024.
3. Design: SAD §4.2 SD-02 (`docs/diagrams/png/sd-02-version-restore.png`); API-03 `POST …/restore` with
   `Idempotency-Key`.
4. Code: `server/src/versions/versionService.js` (journal `pendingOp`, `completeRestore`),
   `server/src/access/policy.js` (Owner only).
5. Tests: `server/tests/integration/versions.test.js`, `recovery.test.js` (crash at every step).
6. Checker: `python tools/check_trace.py` → 1,483 checks pass (IDs, requirement ↔ test ↔ RTM ↔ SAD).

## 6. Architecture, API and error handling — key points

- **Pattern:** client–server with a layered server (interface → services → persistence); React SPA
  client; one Socket.IO room and one FIFO task queue per board (SAD §3.5).
- **Why:** a single authoritative server gives one order of operations, so all clients converge
  without merge logic; CRDTs rejected as too complex for the scope (DECISIONS.md D6, D12).
- **Consistency rules:** server sequence numbers; per-property last write wins; persist before
  acknowledge/broadcast; gap repair and full resync on reconnect (SAD §4.1).
- **APIs:** API-01 Socket.IO `/board` namespace (operations, acks, state, presence); API-02 REST
  `/api/v1` accounts, boards, members, links, ownership; API-03 versions and restore.
- **Errors:** one body `{code, message, requestId}`; shared code table (`shared/src/errorCodes.js`) used
  by server and client; 404 `BOARD_NOT_FOUND` for no role (hides existence), 403 `FORBIDDEN` for too low
  a role; rejected real-time operations are rolled back on the client with a message (SAD §4.4).
- **Security:** bcrypt cost 12; JWT 24 h with logout revocation; share tokens 32 random bytes stored as
  SHA-256; 5 failed logins per e-mail per 15 min; 30 ops/s per connection; 65,536-byte message limit;
  schema validation of every request and event; security log without secrets (SAD §3.9, STP §5.1).

## 7. Testing results and coverage — numbers to quote

| Item | Value | Source |
|---|---|---|
| Unit tests | 110 / 110 pass | `docs/testing-reports/UNIT_TESTING_REPORT.md` |
| Integration tests | 100 / 100 pass | `SYSTEM_VALIDATION_REPORT.md` |
| E2E (Chromium) | 31 / 31 pass; Chrome and Edge 31/31 on 02-11-2026 | same |
| STP | 33 Pass, 1 Blocked (TC-109), 0 Fail; 49 / 50 requirements verified | same |
| Line coverage | server 95.21 %, shared 97.11 %, whole code base 58.24 % | `CODE_COVERAGE_REPORT.md` |
| Branch coverage | server 90.00 %, shared 89.91 %, all measured 89.67 % | `BRANCH_COVERAGE_REPORT.md` |
| Performance | p95 latency 80 ms (target 500 ms) with 10 clients; restore ≤ 1.7 s (target 3 s) — 12-10-2026 | `docs/IMPLEMENTATION_STATUS.md` §4 |

**Coverage, explained correctly:** the React UI is tested end to end with Playwright, which does not
measure coverage, so it counts as 0 % in Jest; that is why the whole-code-base line figure is 58 %. The
branch figure covers only code Jest runs. Crash-recovery code runs in a child server process and is
tested, but not measured.

## 8. Likely viva questions and accurate answers

1. **Which SDLC model did you follow?** Document-first planning (SRS, SAD, STP with traceability) then
   iterative sprints with CI and test execution against the plan (§1).
2. **How did you plan sprints and estimate?** Four milestones with objectives and issues; priorities as
   labels. Story points: answer according to what the team actually did (§2) — none are on GitHub.
3. **Show your PRs.** Each member opens their PRs from §3 and explains one change in the code.
4. **Who reviewed the PRs?** CI checked every PR; the owner merged the integration PRs; no formal GitHub
   reviews were recorded — we would enforce them with branch protection next time.
5. **How do requirements reach the code?** Walk through §5 with FR-033.
6. **Why Socket.IO and not plain WebSockets?** Acknowledgements, rooms, reconnection and heartbeat, all
   used by the sync design.
7. **What happens when two users edit the same object at once?** The server orders both; the later
   sequence number wins per property; all clients converge (`multiClient.test.js`).
8. **What if the server crashes during a restore?** The restore is journalled before the first
   destructive step and completed on restart; the idempotency key prevents a double restore (TC-024).
9. **Why 404 instead of 403 for strangers?** So outsiders cannot learn that a board exists (D14a).
10. **How is a share link protected?** 256-bit random token in the URL fragment (browsers never send the fragment to the
    server, so it does not appear in request logs), stored only as a SHA-256 hash, revocable, with expiry.
11. **What is your code coverage, and why is it 58 %?** See §7 — server 95 %, UI measured by E2E only.
12. **What is not finished?** HTTPS verification (TC-109), Safari, manual device checks, the export /
    rename scope decision, document sign-off, the `notice` event in the UI.
13. **What deviated from your SRS/SAD?** `DEVIATIONS.md` §5 has a 30-second answer.
14. **Did you use AI tools?** Answer truthfully which tools each member used and for what. The FAQ
    allows it, provided the code matches the SRS/SAD/STP and you can explain it. The final
    documentation package states that parts were prepared with Claude (`SUBMISSION_CHECKLIST.md` §A).
15. **How do you know the tests test the requirements?** Each STP test case names its requirements, the
    automated tests name the test cases (e.g. `TC-024` in `recovery.test.js`), and `check_trace.py`
    verifies that the RTM, STP and SRS agree.
16. **What would you do with another sprint?** Deploy behind HTTPS and run TC-109; resend unconfirmed
    changes after reconnect; Socket.IO adapter for several servers; undo/redo; component tests with
    coverage for the UI.
