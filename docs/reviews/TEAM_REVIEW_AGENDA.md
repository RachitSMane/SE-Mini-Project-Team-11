# Team review meeting — agenda and decision record

Prepared 14-10-2026. **No decision below has been made.** All decision, rationale, approver and date
fields are blank on purpose; fill them in only during or after the meeting, from what the team
actually agrees.

> **Current state (added 17-10-2026):** the sentence above describes the agenda as prepared on 14-10-2026.
> - Since then, decisions D-03 to D-07 (TC-022) were recorded on 16-10-2026, and D-08 (TC-021) on
>   17-10-2026, in §4.
> - D-10 has a note only; no separate decision is recorded.
> - All other decisions (D-01, D-02, D-09, D-11 to D-19) are still open.
> - The meeting record and the four-member review are still pending.

Participants (names and roles as in the approval tables):
- Rachit S Mane (**RM**, SRS Lead / Product Owner)
- P Chinni Krishna Reddy (**KR**, SAD Lead / Dev Lead)
- Pranav V Menon (**PM**, STP Lead / QA Lead)
- Prithvi W (**PW**, Security & Traceability Lead / Security Test Lead)

Read before the meeting (everyone):
- `docs/reviews/SUBMISSION_READINESS_ACTION_PLAN.md`
- `docs/reviews/TC022_CORRECTION_PROPOSAL.md`
- `docs/reviews/TC021_EXECUTION_CHECKLIST.md`
- `docs/reviews/TC109_DEPLOYMENT_PLAN.md`
- `docs/reviews/SUBMISSION_CONSISTENCY_AUDIT.md`
- `docs/reviews/TEAM_ACTION_TRACKER.md`

## 0. Facts to confirm at the start (from the repository, 14-10-2026)

| Fact | Source |
|---|---|
| Branch `docs/setup`, base commit `82af885`; 22 uncommitted status entries; nothing of the implementation, tests or evidence is committed | `git status`, `git log` |
| The 2 existing commits are both by the GitHub account `RachitSMane`; the other three members have no commits yet | `git log` |
| Remote: `https://github.com/RachitSMane/SE-Mini-Project-Team-11.git` | `git remote -v` |
| 34 TCs: 32 Pass, 0 Fail, 2 Blocked (TC-021, TC-109); RTM 47 P / 3 N | STP §14, RTM, audit baseline |
| Hosted CI (`app-ci.yml`, `docs-check.yml`) has never run; `app-ci.yml` runs on pull requests and pushes to `main` | `.github/workflows/app-ci.yml`, DECISIONS E4 |
| All approval and signature fields in the SRS, SAD and STP are blank | audit #1 |
| The brief's deadline (28-09-2026) has passed; the current deadline is unconfirmed | DECISIONS E2 |
| The six deliverables in `submission/final/` match today's document sources | audit baseline (rebuild comparison) |

## 1. Questions for the instructor (send before the meeting if possible)

Record the answers verbatim with date and sender. Do not assume an answer.

| # | Question | Why it matters | Answer (verbatim) | Received from / date |
|---|---|---|---|---|
| Q1 | What is the current submission deadline for the SRS, SAD, STP and repository? | DECISIONS E2; schedules everything | | |
| Q2 | May test cases that cannot be executed (TC-109: no HTTPS deployment; TC-021 if stable Firefox cannot be tested in time) be submitted as **Blocked** with a recorded exception? | STP §5 exit criteria not met (audit #3) | | |
| Q3 | For SEC-REQ-007, what counts as a "deployed (non-local) environment"? Is a temporary test host with a public certificate sufficient? Is a deployment expected at all? | TC-109 scope (DEC-3) | | |
| Q4 | For TC-021 (a manual test), is automated browser evidence (Playwright in Chrome and Edge) acceptable, or is manual execution expected in every browser? | DEC-2 | | |
| Q5 | In what form should approvals be given (typed name and date, scanned signature, e-mail confirmation)? | FIN-4 | | |
| Q6 | What exactly must be submitted (DOCX, PDF, repository link, access for whom)? Must results be tied to a specific commit? | FIN-5, STP §13 | | |

## 2. Agenda

| # | Item | Lead | Time | Decision IDs |
|---|---|---|---|---|
| 1 | Facts (§0) and instructor answers (§1) so far | RM | 10 min | — |
| 2 | Deadline and the treatment of Blocked tests | RM | 10 min | D-01, D-02 |
| 3 | **TC-022**: independent review of the findings and the correction proposal | KR presents, PM second reader | 20 min | D-03 – D-07 |
| 4 | **TC-021**: acceptance criteria, executor, Firefox installation | PM | 10 min | D-08 – D-10 |
| 5 | **TC-109**: deployment owner and feasibility, or exception | PW | 15 min | D-11 – D-13 |
| 6 | Optional code/test changes and SAD additions | KR, PW | 10 min | D-14, D-15 |
| 7 | Git workflow, hosted CI, regeneration | RM (repository) | 10 min | D-16 – D-18 |
| 8 | Confirm the assignments in `TEAM_ACTION_TRACKER.md` | PM | 5 min | D-19 |

## 3. Decisions required, with the evidence each needs

### General
| ID | Decision | Options | Evidence to have open |
|---|---|---|---|
| D-01 | Planning deadline | the instructor's answer to Q1; no internal date replaces it | Q1 answer; DECISIONS E2 |
| D-02 | Treatment of Blocked tests (TC-021, TC-109) | (a) execute both before signing; (b) execute TC-021, exception for TC-109; (c) exception for both | STP §5 exit criteria, STP §14; audit #3; Q2 answer |

### TC-022 (`TC022_CORRECTION_PROPOSAL.md`)
| ID | Decision | Options | Evidence to have open |
|---|---|---|---|
| D-03 | Keep TC-022 as **Pass** and accept the conclusion "test-harness fault, not FR-008" | yes / no / defer until a rerun | `docs/evidence/2026-10-14-tc022-investigation/README.md` (run 4: `NOT_READY` after `ping timeout`; run 5: pass with the first post-fix version); `docs/evidence/2026-10-14-final-checks/` (final version passed alone and in `npm test`); limitation: the final version was not run under load; the heartbeat cause is unexplained. **Update 15-10-2026 (session 6 audit):** this limitation is out of date — the final version has since been run under the 16-process load twice (`2026-10-14-full-verification/15-…`: Jest 295.6 s; `2026-10-14-tc022-performance/10-…`: 303.7 s measured inside the test, Jest 327.5 s, reported as passed although above the 300 s timeout), and the heartbeat misses were traced to event-loop stalls in the shared test process (`2026-10-14-tc022-performance/README.md`). Session-7 reruns on AC power (idle ×3: Jest 38.6–39.0 s; loaded: 174.6 s): `TEAM_ACTION_TRACKER.md`, evidence note of 15-10-2026. Session 8 on battery: idle 101.2 s (two disconnects without artificial load) and 58.6 s; loaded 290.6 s (9.4 s below the timeout); all runs collected, with a measurement of the version write, in `C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\reports\TC022_DECISION_EVIDENCE_D03-D07.md`. |
| D-04 | Wording for *Actual result* and STP §14 | adopt proposal D as written / amend / defer | proposal D; STP §14 line 23 |
| D-05 | Mismatches A, C, F, G | correct the STP text / record as deviations in IMPLEMENTATION_STATUS §5 / mixed | proposals A, C, F, G with test line numbers |
| D-06 | Pacing (B) | option 1: change the text to "< 25 per second"; option 2: change the test to 50 ms and rerun | proposal B; test line 77 |
| D-07 | Loaded rerun of the final version and the 300 s timeout | no loaded rerun / loaded rerun after agreeing a timeout change / accept the risk; session-5 options: (a) run TC-022's server in a child process outside Jest's sandbox (as `recovery.test.js` does; removes the ~15× BSON slowdown and the shared event loop; changes the test procedure), (b) compute the D11b defensive size from the tracked content sizes instead of a full BSON pass (design change to D11b / SAD §3.6), (c) accept the risk | investigation run 5 (> 286 s of 300 s); `docs/evidence/2026-10-14-full-verification/15-…` (295.6 s, AC); `docs/evidence/2026-10-14-tc022-performance/` (after the persistence fix: idle 67.4 s; loaded on battery 303.7 s, not a clean pass) |

### TC-021 (`TC021_EXECUTION_CHECKLIST.md`)
| ID | Decision | Options | Evidence to have open |
|---|---|---|---|
| D-08 | Does the session-1 automated Chrome/Edge evidence satisfy the *manual* checklist? | yes / no, repeat by hand in Chrome and Edge too | STP TC-021 *Type* "manual"; `test-results/` screenshots (no Viewer screenshot; console logs not retained); Q4 answer |
| D-09 | Who installs stable Firefox (software installation on which machine) and executes TC-021; who are the two checkers | names | checklist §1 and §6 |
| D-10 | Build to test: run after the commit (preferred by STP §13) or on the uncommitted tree | after commit / now | STP §13 rule |

### TC-109 (`TC109_DEPLOYMENT_PLAN.md`)
| ID | Decision | Options | Evidence to have open |
|---|---|---|---|
| D-11 | Deployment owner for E3 (currently only "Team") and the target date | a named member / external provider / none (go to D-02 exception) | DECISIONS E3; plan §3 |
| D-12 | Acceptable environment (host, DNS, public certificate, single reverse proxy); costs and accounts | plan §3 items 1–6 | Q3 answer |
| D-13 | Who executes the §5 verification, and who is the second checker | names (proposal: PW executes, as security test lead) | plan §5 |

### Other
| ID | Decision | Options | Evidence to have open |
|---|---|---|---|
| D-14 | Optional code/test changes IMP-1, IMP-2, IMP-4, IMP-6, IMP-7, IMP-8, IMP-9 | accept / reject each | action plan §2.3 |
| D-15 | SAD additions DOC-7 (deployment note), DOC-8 (heartbeat); approval role titles DOC-9 | accept / reject each | audit #13–#15 |
| D-16 | Git workflow: who commits which files so that each member has their own commits; branch and PR; who enables CI and branch protection (E4, "Repository owner") | — | `git log` (only `RachitSMane` so far); DECISIONS E4 |
| D-17 | Order: corrections → commit → rerun on the commit → PR/CI → regeneration | confirm / change | action plan §6; validation gate in the tracker |
| D-18 | Who regenerates the deliverables, from which commit; who witnesses | names | action plan §4 |
| D-19 | Confirm or change the assignments in `TEAM_ACTION_TRACKER.md` | — | tracker |

## 4. Decision record (fill in only what the team actually decides)

| ID | Decision taken | Rationale | Approved by (each member's name) | Dissent / notes | Date |
|---|---|---|---|---|---|
| D-01 | | | | | |
| D-02 | | | | | |
| D-03 | Keep TC-022 as **Pass**. "Test-harness fault, not FR-008" accepted as the working explanation: the step-6 failure mechanism was reproduced (14-10-2026); it is not confirmed for run 2 of 12-10-2026, and the harness explanation of the timing overrun is not proven | Apart from run 2 of 12-10-2026, every expected result the test checks held in every run; no recorded value changed (proposal D, E) | Not recorded individually: team decision communicated to the documentation session on 16-10-2026; no minutes or signatures | The loaded run of 14-10-2026 took 303.7 s against the 300 s Jest budget; recorded as **not a clean pass** and kept in the record | 16-10-2026 |
| D-04 | Amend: proposal D's content was already in the TC-022 record (14-10 and 15-10 addenda); a dated decision summary was appended instead, and STP §14 states the decision | Avoids duplicating the existing addenda; keeps the history | as D-03 | — | 16-10-2026 |
| D-05 | Correct the STP text for A, C, F (superseded by C) and G | Description only; no test or value changes. C adapted to the current test, which measures M4 with MongoDB's `$bsonSize` (changed 14-10-2026), not `BSON.calculateObjectSize` | as D-03 | — | 16-10-2026 |
| D-06 | Option 1: text changed to "fewer than 25 per second"; test unchanged | No rerun needed | as D-03 | — | 16-10-2026 |
| D-07 | Option (c), accept the risk: no further loaded rerun; TC-022 stays Pass and the submission goes ahead with the unresolved timing margin under load disclosed in the TC-022 record (303.7 s loaded run against the 300 s budget, not a clean pass) | Confirmed by the team after the 16-10-2026 decision on D-03 | as D-03 | Options (a) and (b) not adopted for this submission | 16-10-2026 |
| D-08 | Accepted with limitations. Coverage: the automated Chrome/Edge run of 17-10-2026 plus manual checks in Firefox 158 and Chrome. Edge was not checked by hand; the automated run predates the stroke-width tooltip fix. TC-021 confirmed as **Pass with limitations** | Recorded in `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md` §6 (D7) and §8 | Not recorded individually: two-member review (names not recorded); team confirmation communicated to the documentation session on 17-10-2026; no minutes or signatures | — | 17-10-2026 |
| D-09 | | | | | |
| D-10 | No separate decision recorded. TC-021 was tested on the uncommitted working tree (base commit 82af885) on 17-10-2026; this is covered only by the team's general acceptance of the documented TC-021 limitations | `RESULTS.md` §6 (D8) and §8 ("not decided individually") | Not recorded (no individual approval for this item) | Commit and rerun on the commit remain open under D-16/D-17 | 17-10-2026 (note) |
| D-11 | | | | | |
| D-12 | | | | | |
| D-13 | | | | | |
| D-14 | | | | | |
| D-15 | | | | | |
| D-16 | | | | | |
| D-17 | | | | | |
| D-18 | | | | | |
| D-19 | | | | | |

Meeting held on: ____________ Present: ____________ Minutes taken by: ____________

After the meeting:
- copy agreed decisions into `docs/DECISIONS.md`;
- update task statuses in `TEAM_ACTION_TRACKER.md`;
- do not edit the STP, RTM, SRS or SAD before the corresponding decision is recorded here.
