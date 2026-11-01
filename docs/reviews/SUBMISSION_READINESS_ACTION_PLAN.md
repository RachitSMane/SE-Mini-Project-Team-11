# Submission-readiness action plan (review only)

Prepared 14-10-2026 from the existing review documents. **Nothing was changed**: no STP, RTM, SRS,
SAD or deliverable edits, no status changes, no installation or deployment, no Git operations, no
approvals. **The project is not submission-ready:**
- two test cases are Blocked;
- all approvals are blank;
- the deadline is unconfirmed;
- hosted CI has never run;
- no result is bound to a Git commit.

Inputs:
- `docs/TEAM_REVIEW_CHECKLIST.md` (§1–§7);
- `docs/reviews/TC022_CORRECTION_PROPOSAL.md` (A–G);
- `docs/reviews/TC021_EXECUTION_CHECKLIST.md`;
- `docs/reviews/TC109_DEPLOYMENT_PLAN.md`;
- `docs/reviews/SUBMISSION_CONSISTENCY_AUDIT.md` (#1–#18);
- `docs/IMPLEMENTATION_STATUS.md` (§6 open issues);
- the evidence folders under `docs/evidence/`.

State when prepared: branch `docs/setup`, base commit `82af885`, 22 uncommitted status entries.
SHA-256 checks confirm the six files in `submission/final/` and all SRS/SAD/STP/RTM sources are
unchanged since the start of the review phase.

Abbreviations used for people (names as in the approval tables):
- **RM** = Rachit S Mane (SRS Lead / Product Owner)
- **KR** = P Chinni Krishna Reddy (SAD Lead / Dev Lead)
- **PM** = Pranav V Menon (STP Lead / QA Lead)
- **PW** = Prithvi W (Security & Traceability Lead / Security Test Lead)
- **All** = all four members

"Maintainer" means the person who would make an agreed edit, following the ownership rules already
stated in the documents (STP §13: TC-001–TC-099 STP lead, TC-101–TC-199 security lead; RTM: PW). Every
edit needs at least one other reviewer, and every document is approved by all four.

---

## 1. Test evidence ledger: completed vs. not executed

### 1.1 Completed (local only; none bound to a Git commit)

| Date | What | Result | Evidence |
|---|---|---|---|
| 12-10 (session 1) | STP execution: 34 TCs | 32 Pass, 0 Fail, 2 Blocked | STP records; console output **not retained**; `perf-results/*.csv`; `test-results/` |
| 12-10 (session 1) | E2E three browsers (Chrome 154, Edge 155, Playwright Firefox 134) | 29 passed, 1 skipped | `test-results/` screenshots, `.last-run.json` = `passed` |
| 12-10 (session 1) | Performance TC-009, TC-013, TC-019, TC-020 | all PASS | `perf-results/*.csv` |
| 12-10 (session 1) | Production build | exit 0 | log **not retained** |
| 12-10 (session 2) | `npm test` ×5 | run 1: 73/77 (hook timeout); run 2: 76/77 (TC-022 step 6 failed); runs 3–5: 77/77 | `docs/evidence/2026-10-12-reverification/` |
| 12-10 (session 2) | lint, unit, Chromium E2E (10 passed), doc checks | passed | same folder |
| 14-10 | TC-022 investigation: alone ×2 (diag), CPU load ×2 (1 **fail** reproduced, 1 pass with the first post-fix version) | as stated | `docs/evidence/2026-10-14-tc022-investigation/` |
| 14-10 | Open-handles investigation; unit after fix; `npm test` ×2 | 32/32; 77/77 ×2; no warning | `docs/evidence/2026-10-14-jest-open-handles/` |
| 14-10 | Final checks: lint; unit 32/32; TC-022 alone 1/1 (65.9 s); `npm test` 77/77 | all exit 0 | `docs/evidence/2026-10-14-final-checks/` |

### 1.2 Not executed / proposed only

| Item | Status |
|---|---|
| TC-021 in stable Mozilla Firefox (manual) | not executed; Firefox not installed |
| TC-021 manual checks in Chrome/Edge | not executed (only automated evidence exists) |
| TC-109 on a deployed HTTPS instance | not executed; no deployment |
| Final TC-022 test version under CPU load | not executed (300 s timeout risk) |
| E2E, performance and production build after the 14-10 test changes | not executed |
| Any run on a committed build (STP §13) | not executed; nothing committed |
| Hosted CI (`app-ci.yml`, `docs-check.yml`) | **never run** |
| Local automated test of `FORCE_HTTPS`/`TRUST_PROXY` | does not exist; proposed only |

---

## 2. Findings by category

Columns:
- **Affects**: which documents change if the action is applied (S = SRS, A = SAD, T = STP,
  R = RTM, D = final deliverables, i.e. regeneration). "—" = none.
- **Review / approve**: the reviewer(s) and who approves.

### 2.1 Documentation-only corrections (apply only after the decisions in §2.4)

| ID | File / section | Evidence | Proposed action | Review / approve | Affects |
|---|---|---|---|---|---|
| DOC-1 | `docs/working/stp/tc-functional-nfr.md` App. A.1 TC-022 step 1 (`board_content_bytes`) | no such field in `server/src`; test lines 112, 128, 133 (proposal A; audit #7) | adopt proposal A wording | maintainer PM; review KR; approve All | T, D |
| DOC-2 | same, step 1 pacing "at most 20 per second" | test line 77 (40 ms → < 25/s) (proposal B; audit #8) | B option 1 (text). If option 2 is chosen, see IMP-1 instead | PM; review KR; approve All | T, D |
| DOC-3 | same, preconditions and step 5 (`mongosh`, wait *T*, "step 6") | test lines 46, 143, 145; `realtimeServer.js:200` (proposals C, F; audit #9) | adopt C (and F), **or** add TC-022 to IMPLEMENTATION_STATUS §5 deviations | PM; review KR | T, D (if STP); — (if deviation only) |
| DOC-4 | same, step 3 expected "shows the message"; extra checks not listed | test lines 127, 134–137, 150 (proposal G; audit #10) | list the extra checks; state that the message is not covered by TC-022, or name UI evidence | PM; review RM (FR-026 is SRS) | T, D |
| DOC-5 | same, *Actual result*; `14-15-metrics-approvals.md` §14 line 23 | `docs/evidence/2026-10-14-tc022-investigation/` (proposal D; audit #4) | append proposal D wording; keep the 12-10 text as history | PM + KR; review PW; **approve All** (depends on DEC-1) | T, D |
| DOC-6 | TC-022 *Actual result*: test version and commit | proposal E; audit #5, #6 | record the 14-10 test change; after the commit rerun (TEST-4), record hash, date, values | PM; review PW | T, D |
| DOC-7 | SAD §3.9 (`docs/working/sad/03e-security-architecture.md`) | `app.js:50, 60–64`; `README.md` (audit #13) | short deployment note: TLS-terminating proxy, one hop, `FORCE_HTTPS` needs `TRUST_PROXY` | maintainer KR; review PW | A, D |
| DOC-8 | SAD §4.1.4 (`04a-design-overview.md`) and `docs/DECISIONS.md` D6b | `server/src/server.js` heartbeat 10 s + 10 s (audit #14) | add the heartbeat values and rationale | KR; review RM | A, D (D6b itself is not a deliverable) |
| DOC-9 | Approval tables: SRS/SAD front matter, STP §15 | role titles differ (audit #15) | agree one set of titles or keep them as they are | All | S, A, T, D (if changed) |
| DOC-10 | `docs/IMPLEMENTATION_STATUS.md` §2/§3 tables | session-2 state (audit #16) | add a results table after TEST-4 | PM; review PW | — (not a deliverable) |
| DOC-11 | TC-021 / TC-109 records, RTM rows NFR-006, NFR-007, SEC-REQ-007, SEC-OBJ-001, STP §13/§14 counts, SRS front matter, DECISIONS E5 | follow from TEST-1/TEST-2 | update **only** after execution and a team status decision | PM (TC-021), PW (TC-109, RTM); approve All | T, R, S, D |

### 2.2 Test execution still required

| ID | Test | Evidence of the gap | Proposed action | Review / approve | Affects |
|---|---|---|---|---|---|
| TEST-1 | **TC-021** stable Firefox, manual (and Chrome/Edge by hand if DEC-2 requires it) | STP record "manual"; Firefox absent (re-checked 14-10); no Viewer screenshot (audit #11) | install Firefox (agreed first), then run `TC021_EXECUTION_CHECKLIST.md`; evidence in `docs/evidence/<date>-tc021-firefox/` | executor: one member (DEC-2); two other members check `RESULTS.md`; status: All | T, R, S, D |
| TEST-2 | **TC-109** on a deployed HTTPS instance | no deployment; E3 Pending (audit #12) | after INF-1, run plan §5; evidence in `docs/evidence/<date>-tc109-https/` | executor: PW (security lead) or the E3 owner; second checker: another member; status: All | T, R, S, D |
| TEST-3 | **TC-022 final version under CPU load** (optional) | only the first post-fix version passed under load, at > 286 s of 300 s | decide (DEC-1) whether a loaded run is needed. If yes, first agree how to keep it within the timeout (IMP-2); a run that times out proves nothing | KR, PM | T (record only) |
| TEST-4 | **Full rerun on the committed build**: `npm run lint`, `npm test`, `npm run test:e2e` (and, if required, `npm run test:e2e:browsers` with `--output <new folder>`, `npm run perf`, `npm run build`) | STP §13 commit rule (audit #5); test files changed 14-10 (audit #6) | run after FIN-1; save logs in a new dated evidence folder; record the hash in the STP records | PM coordinates; each member runs at least one command on their own machine or witnesses one | T, D |
| TEST-5 | **Hosted CI** | never run (audit #18) | open a PR (FIN-2); record the workflow run URLs and outcomes | repository owner + All | — (evidence only) |

### 2.3 Implementation changes potentially required (none decided; all optional unless the team decides otherwise)

| ID | Area | Evidence | Option | Review / approve | Affects |
|---|---|---|---|---|---|
| IMP-1 | `server/tests/integration/boardLimit.test.js` line 77 pacing | DOC-2 / proposal B | 50 ms pause so "≤ 20 per second" holds; no assertion change; rerun needed | KR (code), PM (STP) | T (only if adopted), D |
| IMP-2 | TC-022 timeout margin under load | run 5 of the investigation: > 286 s of `jest.setTimeout(300000)` | e.g. a higher test timeout, or accept the risk. Changing a timeout is not weakening an assertion, but it needs agreement | KR; review PM | — |
| IMP-3 | Heartbeat misses under CPU load (unexplained) | investigation README "Not established" | further investigation, or accept as an environment limitation; no code change proposed | KR, RM | A (if documented) |
| IMP-4 | `server/tests/integration/versions.test.js` `beforeAll` hook timeout under load | IMPLEMENTATION_STATUS §6 issue 1 | longer hook timeout or accept; not investigated | PM; review KR | — |
| IMP-5 | Session-2 run 1 never exited (cause unknown) | IMPLEMENTATION_STATUS §6 issue 3 | watch for it in TEST-4; investigate only if it recurs | PM | — |
| IMP-6 | Local automated test of `FORCE_HTTPS`/`TRUST_PROXY` | none exists (TC-109 plan §6) | add a supertest test (code check only; does **not** satisfy TC-109) | PW; review KR | T (if added to the plan), D |
| IMP-7 | Startup check: `FORCE_HTTPS=true` without `TRUST_PROXY=true` | redirect-loop risk (TC-109 plan §4) | fail fast in `server/src/config.js`, or document only (DOC-7) | PW, KR | A (if documented) |
| IMP-8 | CSP `connect-src … ws:` in production | `app.js:215` (audit #17) | allow only `wss:` when `FORCE_HTTPS` is on | PW; review KR | — |
| IMP-9 | UI evidence for the "Board is full" message | proposal G | add an E2E check, or record it as not covered | RM (FR-026), PM | T, D (if added) |

### 2.4 Team or instructor decisions required

| ID | Decision | Evidence / input | Decided by | Blocks |
|---|---|---|---|---|
| DEC-0 | **Submission deadline** (DECISIONS E2: the brief's 28-09-2026 has passed) | audit #2 | instructor, asked by the team | the whole schedule |
| DEC-1 | **TC-022**: keep Pass? accept the harness-fault conclusion? approve the D wording; B text or test; A/C/F/G in the STP or as deviations; loaded rerun (TEST-3) needed? | `TC022_CORRECTION_PROPOSAL.md` | All (KR independent reviewer, PM second) | DOC-1–DOC-6, IMP-1, IMP-2 |
| DEC-2 | **TC-021 acceptance**: does the automated Chrome/Edge evidence satisfy the *manual* test? who installs stable Firefox and executes? | `TC021_EXECUTION_CHECKLIST.md` §1 | All | TEST-1 |
| DEC-3 | **TC-109 / E3**: who provides the host, DNS, certificate and proxy, and when? does a non-public test host count as "deployed"? | `TC109_DEPLOYMENT_PLAN.md` §3 | All (instructor if unclear) | INF-1, TEST-2 |
| DEC-4 | **Blocked tests**: execute TC-021/TC-109 before signing, or approve and record an exception (STP §5 exit criteria)? | audit #3 | All; instructor confirmation advisable | FIN-4 |
| DEC-5 | Optional code/test changes IMP-1, IMP-2, IMP-6–IMP-9 | §2.3 | All | TEST-4 scope |
| DEC-6 | SAD additions (DOC-7, DOC-8) and approval titles (DOC-9) | audit #13–#15 | All | regeneration scope |
| DEC-7 | **Git workflow**: who commits which files (each member's own commits); branch and PR; enabling CI and branch protection (E4) | checklist §5 | All + repository owner | FIN-1, TEST-4, TEST-5 |
| DEC-8 | **Regeneration**: when, who, and from which commit (see §4) | — | All | FIN-3 |

Infrastructure (follows DEC-3): **INF-1**, provide the deployment per `TC109_DEPLOYMENT_PLAN.md` §3.
Nothing may be deployed or exposed before DEC-3.

### 2.5 Final approval and submission tasks

| ID | Task | Evidence | Who | Affects |
|---|---|---|---|---|
| FIN-1 | Commit the agreed changes (each member's own commits; nothing committed yet) | `git status`: 22 uncommitted entries | All, per DEC-7 | — |
| FIN-2 | Open a PR; confirm `app-ci.yml` and `docs-check.yml` pass on GitHub | never run | repository owner + All | — |
| FIN-3 | Regenerate the DOCX/PDF from the committed sources (procedure in §4) | the current six match today's sources | per DEC-8, witnessed by a second member | D |
| FIN-4 | Each member reads all three regenerated PDFs and signs their own rows (SRS, SAD, STP §15). The SRS "Course Coordinator" row is not the team's | audit #1; checklist §6 | each member personally | S, A, T, D |
| FIN-5 | Submit as the course requires, by the confirmed deadline (DEC-0); give repository access as agreed (DECISIONS E4: "Add collaborators…") | DECISIONS E2, E4 | All | — |

---

## 3. Priority for the three open test cases

| Priority | Case | Why first | Next concrete step | Gate |
|---|---|---|---|---|
| **1** | **TC-022** | Its Pass is already recorded, but the record contradicts newer evidence (audit #4). The fix is a decision plus text, with no infrastructure. | Meeting: DEC-1, using the proposal; KR presents the independent review | DOC-1–DOC-6 can then be drafted |
| **2** | **TC-021** | Executable within a day once Firefox is installed; turns 2 RTM rows (NFR-006, NFR-007) from N to a real result | DEC-2 → agreed installation → TEST-1 | needs a member's time and agreement to install software |
| **3** | **TC-109** | Needs infrastructure (host, DNS, certificate, proxy) that does not exist; may not be achievable before the deadline | DEC-3 owner and date, otherwise DEC-4 exception | INF-1 |

If DEC-0 shows the deadline is very close, DEC-4 (exception for TC-109, possibly TC-021) becomes the
critical decision and should be confirmed with the instructor.

---

## 4. Safe regeneration procedure (for FIN-3; do not run before the decisions)

The tools overwrite files:
- `python tools/build_docs.py` writes to `docs/final/` by default;
- `tools/export_pdf.ps1` (defaults `-SourceDir docs/final -OutDir submission/final`) **copies the DOCX
  into `submission/final/` with `-Force` and exports the PDFs there**, replacing all six deliverables.
  It needs Microsoft Word and refuses to run while a Word window is open.

Procedure:
1. Copy all six current files of `submission/final/` and the three of `docs/final/` to a dated backup
   folder outside both (e.g. `submission/backup-<date>/`). Record their SHA-256 hashes.
2. Build into a staging folder first: `python tools/build_docs.py --out-dir <staging>`.
3. Export the PDFs from staging into another staging folder:
   `powershell -ExecutionPolicy Bypass -File tools/export_pdf.ps1 -SourceDir <staging> -OutDir <staging-pdf>`.
4. Check page counts and headings. A second member visually inspects every page. Then copy the six
   files into `submission/final/`.
5. Run `python tools/check_trace.py` and `python -m unittest discover -s tools/tests`; record the
   outputs.

---

## 5. Contribution across SRS, SAD and STP (all four members, no exclusive owner)

| Member | SRS | SAD | STP | Actions in this plan |
|---|---|---|---|---|
| RM | review §4.3, §4.4 | review §4.1.3–4.1.6, SD-02, SD-03; second reader of DOC-8 | review App. A.2 TC-101–TC-108; second reader of PM's §14 | DOC-4 review (FR-026), IMP-3, IMP-9; verifies the `2026-10-14-final-checks` evidence |
| KR | review §4.1 (FR-008), §4.2 | maintainer DOC-7, DOC-8; review §3.5–3.7 | **independent TC-022 reviewer** (App. A.1 TC-012–TC-025) | presents DEC-1; reviews DOC-1–DOC-6; IMP-1/IMP-2 if chosen |
| PM | review §5 (NFR-006/007), §6 | review §3.1–3.4, §4.5 | maintainer of TC-001–TC-099 records, §14; review §1–§12 | DOC-1–DOC-6, DOC-10, DOC-11 (TC-021); coordinates TEST-4; checks the TC-021 checklist |
| PW | review §5.1, §8 (RTM) | review §3.8, §3.9; second reader of DOC-7 | maintainer of TC-101–TC-199 records, §13; RTM | TEST-2 / IMP-6–IMP-8; DOC-11 (TC-109, RTM); verifies `check_trace` and the deliverable hashes |

Each member signs their own rows in **all three** documents (FIN-4). No one signs for another member.

---

## 6. Prioritized checklist before final document regeneration

Blocking decisions first; nothing below has been done.

1. [ ] **DEC-0:** confirm the submission deadline with the instructor. (All)
2. [ ] **DEC-4:** decide how Blocked tests are treated: execute, or an approved and recorded
       exception; confirm with the instructor if possible. (All)
3. [ ] **DEC-1 (TC-022):** keep Pass?; accept the harness-fault conclusion; choose B option 1 or 2;
       STP fixes or deviations for A/C/F/G; decide on a loaded rerun (TEST-3) and the timeout (IMP-2).
       KR presents, PM second reader, All decide.
4. [ ] **DEC-2 (TC-021):** acceptance of the automated Chrome/Edge evidence; name the executor; agree
       the Firefox installation.
5. [ ] **DEC-3 (TC-109):** name the E3 owner and date, or fall back to DEC-4.
6. [ ] **DEC-5 / DEC-6:** accept or reject IMP-1, IMP-2, IMP-6–IMP-9 and DOC-7–DOC-9.
7. [ ] **TEST-1:** execute TC-021 per the checklist (if DEC-2/DEC-4 require it); two members check.
8. [ ] **INF-1 → TEST-2:** deploy and execute TC-109 (if DEC-3/DEC-4 require it); second member checks.
9. [ ] Draft the agreed documentation corrections DOC-1–DOC-9 in the sources (maintainer + reviewer
       per §2.1). Update the TC-021/TC-109 records and the RTM only from actual results (DOC-11).
10. [ ] **DEC-7 → FIN-1:** commit (each member's own commits).
11. [ ] **TEST-4:** rerun lint, unit + integration, E2E (+ browsers/perf/build if required) on the
        commit; record the hash and outputs (DOC-6, DOC-10).
12. [ ] **FIN-2 / TEST-5:** PR and hosted CI green, recorded with run links. Do not claim CI passed
        without them.
13. [ ] Run `python tools/check_trace.py`; resolve any failure.
14. [ ] **DEC-8:** agree who regenerates; then FIN-3 using §4 (backups, staging, inspection).

After regeneration: FIN-4 (each member reads and signs) and FIN-5 (submit).
