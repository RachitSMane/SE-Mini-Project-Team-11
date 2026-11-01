# Submission consistency audit (14-10-2026)

Read-only audit of the SRS, SAD and STP sources (`docs/working/`), the RTM
(`docs/traceability/rtm.md`), `docs/IMPLEMENTATION_STATUS.md`, `docs/DECISIONS.md` and `README.md`,
against the code and the evidence folders. **Nothing was changed.** The STP, the RTM and the
deliverables are untouched.

## Baseline facts checked
- Branch `docs/setup`, base commit `82af885`, everything uncommitted (22 status entries).
- The six files in `submission/final/` match the current sources. A rebuild into a temporary folder
  (`python tools/build_docs.py --out-dir <temp>`, 14-10-2026) differed only in `docProps/core.xml`
  (timestamp). PDF pages: SRS 30, SAD 61, STP 38. `docs/final/*.docx` are identical to
  `submission/final/*.docx`.
- Deliverable sources: 40 files in `docs/working/` plus `docs/traceability/rtm.md` (included).
  `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, `README.md` and `docs/evidence/` are **not** part of the
  deliverables.
- RTM totals: requirements 47 **P**, 3 **N** (NFR-006, NFR-007, SEC-REQ-007), 0 **A**. Objectives:
  SEC-OBJ-001 **N**, SEC-OBJ-002/003 **P**. These agree with the SRS front matter, STP §13/§14,
  IMPLEMENTATION_STATUS §5 and DECISIONS E5. The RTM legend counts Blocked and Not executed both as
  **N**; that is documented (SRS §8, STP §13).
- Test cases: 34; 32 Pass, 0 Fail, 2 Blocked (TC-021, TC-109); stated the same in STP §14, DECISIONS
  E5 and IMPLEMENTATION_STATUS §5.

Severity scale: **critical** = blocks a valid submission; **major** = a record contradicts evidence or
a mandatory rule; **minor** = wording or procedure mismatch with no effect on a result;
**informational** = worth knowing, no change required. "Regen" = the DOCX/PDF would have to be
regenerated if the resolution is applied.

## Findings

| # | Document / section | ID | Actual implementation / evidence | Severity | Proposed resolution | Team approval | Regen |
|---|---|---|---|---|---|---|---|
| 1 | SRS, SAD, STP *Approvals* tables; SRS revision history "Approval: Pending" | E1 | All signature and date fields are blank. | **critical** | Members review, then sign (see TEAM_REVIEW_CHECKLIST). | Yes | Yes (signed versions) |
| 2 | DECISIONS E2 | — | "the brief's ETA of 28-09-2026 has passed"; current deadline still unconfirmed. | **critical** | Confirm the deadline with the instructor. | Yes | No |
| 3 | STP §5 exit criteria / §14 ("two test cases are Blocked without an approved exception") | TC-021, TC-109 | Both still Blocked; no exception approved. | **critical** (for exit criteria) | Execute the tests, or approve and record an exception. | Yes | Yes (§14 wording) |
| 4 | STP App. A.1 TC-022 *Actual result*; STP §14 | TC-022, FR-008 | The record says the step-6 failure cause is "not known" and §14 lists it as open. Session-3 evidence reproduced it as a test-harness fault (`NOT_READY` after heartbeat disconnects) and changed the test. Heartbeat misses under load remain unexplained. | **major** | Proposal D in `TC022_CORRECTION_PROPOSAL.md` (append, keep history). | Yes (TC-022 status) | Yes |
| 5 | STP §13 rule ("a result is recorded only from an actual run, together with the build (Git commit) and date") vs. every *Actual result* | all TCs | Results are recorded against "the uncommitted working tree … base commit 82af885"; no commit hash. IMPLEMENTATION_STATUS §1 acknowledges this. | **major** | Commit, rerun lint/unit/integration/E2E, record the hash (IMPLEMENTATION_STATUS §9 step 4). | Yes (Git workflow) | Yes |
| 6 | STP TC-022 record and the recorded unit-test runs vs. test files | TC-022; unit suite (`syncClient.test.js` is not named in any STP record) | `boardLimit.test.js` and `shared/tests/syncClient.test.js` changed on 14-10-2026, after the recorded 12-10 runs. The changed versions passed locally (TC-022 alone ×2; `npm test` 77/77 ×3). The final TC-022 version was **not** run under load. | **major** | Record the test change, rerun on the committed build (proposal E). | Yes | Yes |
| 7 | STP App. A.1 TC-022 step 1 | TC-022 | `board_content_bytes` does not exist in `server/src`; the test checks `boards.contentBytes` and `op.rejected.attemptedBytes`. Only the maximum M1 is recorded. | minor | Proposal A. | Yes | Yes |
| 8 | STP App. A.1 TC-022 step 1 | TC-022, SEC-REQ-006 | "at most 20 per second"; the test pauses 40 ms after each ack (< 25/s, below the 30/s limit). | minor | Proposal B (text or 50 ms). | Yes | Yes |
| 9 | STP App. A.1 TC-022 preconditions and step 5; IMPLEMENTATION_STATUS §5 deviation list | TC-022 | Periodic timer disabled; version triggered directly; measured with `BSON.calculateObjectSize`, not `mongosh`. §5 lists this deviation for TC-005/TC-012 but not TC-022. Preconditions also say "step 6" where step 5 is meant. | minor | Proposals C and F, or add TC-022 to the §5 deviations. | Yes | Yes (if the STP changes) |
| 10 | STP App. A.1 TC-022 expected result, step 3 ("shows the message") | TC-022, FR-008, FR-026 | The test checks removal of the optimistic object only; UI message not covered. The test also performs extra checks not listed. | minor | Proposal G. | Yes | Yes |
| 11 | STP App. A.1 TC-021 (*Type*: "manual") vs. *Actual result* | TC-021, NFR-006, NFR-007 | Chrome/Edge evidence is automated (Playwright, session 1, console logs not retained); no manual run is recorded in any browser; stable Firefox not installed (re-checked 14-10-2026). No Viewer screenshot exists. Status Blocked and RTM **N** are consistent. | major (requirement unverified) | Run `TC021_EXECUTION_CHECKLIST.md`; decide whether automated Chrome/Edge evidence counts as the manual check. | Yes | Yes (after execution) |
| 12 | STP TC-109; SRS SEC-REQ-007; RTM | TC-109, SEC-REQ-007, SEC-OBJ-001 | Consistent: "implemented but unverified", Blocked, **N**. No deployment exists (E3 Pending). No automated test covers `FORCE_HTTPS`/`TRUST_PROXY`. | informational (status consistent); blocking for verification | `TC109_DEPLOYMENT_PLAN.md`; decide E3 owner; optionally add a local test (does not satisfy TC-109). | Yes | Only after execution |
| 13 | SAD §3.9 / §4 (security, deployment) | SEC-REQ-007 | The SAD names "deployment configuration" but describes no TLS-terminating proxy. It omits the one-hop `trust proxy` assumption and the rule that `FORCE_HTTPS` requires `TRUST_PROXY` (otherwise a redirect loop). Only `README.md` mentions the two flags. | minor | Add a short deployment note to SAD §3.9 (or rely on README + the TC-109 plan and record that). | Yes | Yes (if the SAD changes) |
| 14 | SAD §4.1.3–§4.1.4; DECISIONS D6b | FR-025, NFR-004, TC-009 | The Socket.IO heartbeat (`pingInterval`/`pingTimeout` 10 s + 10 s, `server/src/server.js`) is documented only in a code comment and IMPLEMENTATION_STATUS §7.7, not in the SAD or D6b. It is the mechanism behind the TC-022 load disconnects. | minor | Add the values to D6b / SAD §4.1.4. | Yes | Yes (if the SAD changes) |
| 15 | Approval role titles across documents | E1 | SRS: Course Coordinator, SRS Lead, SAD Lead, STP Lead, Security & Traceability Lead. SAD: the same four leads. STP §15: QA Lead, Security Test Lead, Dev Lead (SAD), Product Owner (SRS). Same four people, different titles. | informational | Agree one set of titles (or keep them as role-specific). | Yes | Yes (if changed) |
| 16 | IMPLEMENTATION_STATUS §2/§3 tables | — | They hold the session-2 state; session-3 results are only in the header, §6 and the evidence folders (stated in the header). | informational | Keep it as is, or add a session-3 table when the post-commit rerun happens. | No | No (not a deliverable) |
| 17 | Built-client CSP (`server/src/rest/app.js:215`) | SEC-REQ-007 | `connect-src 'self' ws: wss:` also allows `ws:` in production; browsers block `ws:` from HTTPS pages (mixed content). | informational | Optional: allow only `wss:` when `FORCE_HTTPS` is on (code change, team decision). | Yes | No |
| 18 | Hosted CI (README, DECISIONS D16/E4, IMPLEMENTATION_STATUS §1) | — | Consistently stated as never run. STP §14 lists CI results per Pull Request as a reporting item, which does not exist yet. | major (process) | Commit, open a PR, confirm both workflows pass (E4). | Yes | No |

## Checked and found consistent
- RTM totals and the TC-021/TC-109 comments across the RTM, SRS §8 (generated from the RTM), STP §13,
  STP §14, IMPLEMENTATION_STATUS and DECISIONS.
- The TC-109 record vs. the code (`FORCE_HTTPS`/`TRUST_PROXY` present; no deployment).
- The size limits in the code (`shared/src/objects.js`: 15,728,640 B content, 65,536 B message,
  16,711,680 B version, 30 ops/s, 2,000 points, 500 characters) vs. FR-008, SEC-REQ-005, SEC-REQ-006,
  D1c and TC-022's expected results.
- SAD §4.1.3 step 6 (ack timeout 10 s → disconnect and reconnect) vs. `shared/src/syncClient.js`.
- README statements on CI and on Playwright's Firefox build.

## Not reconciled here
Any change to the STP, the RTM, the SRS or the SAD, and any regeneration, waits for team decisions
(see `docs/TEAM_REVIEW_CHECKLIST.md`).
