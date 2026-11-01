# Team action tracker

Created 14-10-2026. **Every assignment is a proposal** until it is confirmed at the meeting
(`TEAM_REVIEW_AGENDA.md`, D-19). No task is complete.

Status values:
- **NOT STARTED**: can begin now; no unmet dependency.
- **BLOCKED**: waits for a listed dependency (a decision, another task or infrastructure).

Only the responsible person changes a status, after the reviewer has checked the evidence.

People (roles as in the approval tables):
- **RM** = Rachit S Mane (SRS Lead / Product Owner)
- **KR** = P Chinni Krishna Reddy (SAD Lead / Dev Lead)
- **PM** = Pranav V Menon (STP Lead / QA Lead)
- **PW** = Prithvi W (Security & Traceability Lead / Security Test Lead)

File short names used in the tables:
- STP-A1 = `docs/working/stp/tc-functional-nfr.md`
- STP-A2 = `docs/working/stp/tc-security.md`
- STP-13 = `docs/working/stp/13-traceability.md`
- STP-14 = `docs/working/stp/14-15-metrics-approvals.md`
- RTM = `docs/traceability/rtm.md`
- SRS-FM = `docs/working/srs/00-front-matter.md`
- SAD-FM = `docs/working/sad/01-02-introduction.md`
- DELIV = the six files in `submission/final/` (plus `docs/final/*.docx`)

## 1. Review tasks: every member reviews part of the SRS, the SAD and the STP

Each member has 3 review slices (one per document) and is second reviewer for 3 others. No document
has a single owner. Required output for every review task: the member's findings, added to one shared
issue list (document, section, ID, issue, proposed fix), or "no findings", signed off by the reviewer.

| Task ID | Description | Responsible | Reviewer | Dependencies | Required evidence | Status | Approval needed | Affected files |
|---|---|---|---|---|---|---|---|---|
| RV-01 | SRS §4.3 Version history, §4.4 Accounts, boards, sharing and access | RM | PW | — | findings list | NOT STARTED | no (findings only) | `docs/working/srs/04c-fr-versions.md`, `04d-fr-access.md` (read only) |
| RV-02 | SAD §4.1.3–4.1.6, SD-02, SD-03; check heartbeat gap (audit #14) | RM | PW | — | findings list | NOT STARTED | no | `docs/working/sad/04a-design-overview.md`, `04b2-…`, `04b3-…` (read only) |
| RV-03 | STP App. A.2 TC-101–TC-108 records vs. tests and evidence | RM | PM | — | findings list | NOT STARTED | no | STP-A2 (read only) |
| RV-04 | SRS §4.1 Canvas editing (FR-008), §4.2 Real-time synchronisation | KR | RM | — | findings list | NOT STARTED | no | `docs/working/srs/04a-fr-canvas.md`, `04b-fr-sync.md` (read only) |
| RV-05 | SAD §3.5–3.7 (size measures, risks), SD-01, SD-05, API-01 | KR | PW | — | findings list | NOT STARTED | no | `docs/working/sad/03c-…`, `04b1-…`, `04b5-…`, `04c1-…` (read only) |
| RV-06 | STP App. A.1 TC-012–TC-025, **independent review of the TC-022 record and proposal A–G** against the test | KR | PM | — | findings list; written opinion on D-03 | NOT STARTED | no (input to D-03 – D-07) | STP-A1, `server/tests/integration/boardLimit.test.js` (read only) |
| RV-07 | SRS §5 Non-functional requirements (NFR-006, NFR-007), §6 Acceptance | PM | KR | — | findings list | NOT STARTED | no | `docs/working/srs/05-nfr.md`, `06-acceptance.md` (read only) |
| RV-08 | SAD §3.1–3.4 (goals, stakeholders, components), §4.5 UX | PM | RM | — | findings list | NOT STARTED | no | `docs/working/sad/03a-…`, `03b-…`, `04e-…` (read only) |
| RV-09 | STP §1–§12, §14 (metrics, exit criteria), App. A.1 TC-001–TC-011 | PM | RM | — | findings list | NOT STARTED | no | `docs/working/stp/01-02-…`–`06-12-…`, STP-14, STP-A1 (read only) |
| RV-10 | SRS §5.1 Security (SEC-REQ-001–008), §8 RTM | PW | KR | — | findings list; RTM totals 47 P / 3 N confirmed | NOT STARTED | no | `docs/working/srs/05-1-security.md`, `08-rtm.md`, RTM (read only) |
| RV-11 | SAD §3.8 Traceability, §3.9 Security architecture, §4.4 Errors and logging; check deployment gap (audit #13) | PW | KR | — | findings list | NOT STARTED | no | `docs/working/sad/03d-…`, `03e-…`, `04d-…` (read only) |
| RV-12 | STP §5.1 Security validation, §13 Traceability (commit-hash rule, audit #5), App. A.2 TC-109 | PW | PM | — | findings list | NOT STARTED | no | `docs/working/stp/05-1-…`, STP-13, STP-A2 (read only) |

Reviewer load: RM 3 (RV-04, RV-08, RV-09), KR 3 (RV-07, RV-10, RV-11), PM 3 (RV-03, RV-06, RV-12),
PW 3 (RV-01, RV-02, RV-05).

## 2. Evidence verification tasks

| Task ID | Description | Responsible | Reviewer | Dependencies | Required evidence | Status | Approval needed | Affected files |
|---|---|---|---|---|---|---|---|---|
| EV-01 | Check that `docs/evidence/2026-10-14-final-checks/` logs match its README (exit codes, counts, times) | RM | PW | — | short note "matches / differs: …" | NOT STARTED | no | none (read only) |
| EV-02 | Check that the TC-022 investigation logs 1–8 match `docs/evidence/2026-10-14-tc022-investigation/README.md` | KR | PM | — | note | NOT STARTED | no | none |
| EV-03 | Check the TC-021 automated evidence (`test-results/`, `.last-run.json`) and `docs/evidence/2026-10-14-jest-open-handles/` | PM | RM | — | note | NOT STARTED | no | none |
| EV-04 | Run `python tools/check_trace.py`; check the SHA-256 of the six deliverables against the audit | PW | KR | — | command output saved with the date | NOT STARTED | no | none |

## 3. Decisions (made at the meeting; see agenda §3–§4)

| Task ID | Description | Responsible (prepares) | Reviewer | Dependencies | Required evidence | Status | Approval needed | Affected files |
|---|---|---|---|---|---|---|---|---|
| DC-01 | Ask the instructor Q1–Q6 and record the answers verbatim | RM | PM | — | e-mail/message with date | NOT STARTED | — | agenda §1 |
| DC-02 | D-01 deadline, D-02 Blocked-test treatment | RM | PW | DC-01 (Q1, Q2) | agenda record | BLOCKED | All (+ instructor) | agenda §4, `docs/DECISIONS.md` (E2) |
| DC-03 | D-03 – D-07 TC-022 | KR | PM | RV-06, EV-02 | agenda record | BLOCKED | All | agenda §4 |
| DC-04 | D-08 – D-10 TC-021 | PM | RM | DC-01 (Q4) desirable | agenda record | NOT STARTED. Note 17-10-2026: D-08 recorded in agenda §4; D-10 not decided individually (covered by the team's general acceptance of the TC-021 limitations); D-09 still open (executor and checker names not recorded) | All | agenda §4 |
| DC-05 | D-11 – D-13 TC-109 | PW | KR | DC-01 (Q3) desirable | agenda record | NOT STARTED | All | agenda §4, `docs/DECISIONS.md` (E3) |
| DC-06 | D-14, D-15 optional changes and SAD additions | KR | PW | RV-02, RV-11 | agenda record | BLOCKED | All | agenda §4 |
| DC-07 | D-16 – D-18 Git workflow, order, regeneration | RM | PM | — | agenda record | NOT STARTED | All + repository owner (E4) | agenda §4, `docs/DECISIONS.md` (E4) |

## 4. Test execution and infrastructure

| Task ID | Description | Responsible | Reviewer | Dependencies | Required evidence | Status | Approval needed | Affected files |
|---|---|---|---|---|---|---|---|---|
| TE-01 | **TC-021** manual run in stable Firefox (+ Chrome/Edge if D-08 requires it) | executor from D-09 (not yet named) | two members from D-09 | DC-04; agreed Firefox installation; preferably FIN-01 (commit) | `docs/evidence/<date>-tc021-firefox/` per checklist §5 | BLOCKED. Note 17-10-2026: the work was performed — TC-021 executed (manual Firefox 158 and Chrome; automated Chrome and Edge), two-member review held, team confirmed Pass with limitations (`docs/evidence/2026-10-17-tc021-firefox/RESULTS.md`; executor and reviewer names not recorded). This is not formal tracker completion: D-09 names and the responsible person's/reviewer's confirmation are not recorded | All (status decision) | new evidence folder only |
| TE-02 | Provide the HTTPS deployment (INF-1) | owner from D-11 (not yet named; E3 says "Team") | PW | DC-05; host, DNS, certificate, proxy | deployment record (host, proxy, versions, settings without secrets) | BLOCKED | All | none in the repo (no secrets committed) |
| TE-03 | **TC-109** verification per plan §5 | executor from D-13 (proposal: PW) | second checker from D-13 | TE-02 | `docs/evidence/<date>-tc109-https/` | BLOCKED | All (status decision) | new evidence folder only |
| TE-04 | TC-022 final version under CPU load (optional) | KR | PM | DC-03 (D-07); IMP-02 if a timeout change is chosen | new evidence folder; never overwrite existing ones | BLOCKED | All | new evidence folder only |
| TE-05 | Full rerun on the committed build: `npm run lint`, `npm test`, `npm run test:e2e` (+ `test:e2e:browsers --output <new>`, `perf`, `build` if required) | PM (coordinates); each member runs or witnesses at least one command | RM | FIN-01 | new dated evidence folder with commit hash | BLOCKED | no (evidence) | new evidence folder |
| TE-06 | Hosted CI: open a PR; record the `app-ci.yml` and `docs-check.yml` run links and outcomes | repository owner (confirm; account `RachitSMane`) | PW | FIN-01, DC-07 | workflow run URLs and results | BLOCKED | All | none |

## 5. Documentation corrections (only after the matching decision; maintainer per STP §13 ownership)

| Task ID | Description | Responsible | Reviewer | Dependencies | Required evidence | Status | Approval needed | Affected files |
|---|---|---|---|---|---|---|---|---|
| DO-01 | TC-022 step 1 cross-check wording (proposal A) | PM | KR | DC-03 (D-05) | diff + check_trace | BLOCKED | All | STP-A1 → DELIV |
| DO-02 | TC-022 pacing wording (proposal B option 1) | PM | KR | DC-03 (D-06 = option 1) | diff | BLOCKED | All | STP-A1 → DELIV |
| DO-03 | TC-022 preconditions/step 5 (C, F), or a deviation entry | PM | KR | DC-03 (D-05) | diff | BLOCKED | All | STP-A1 → DELIV, or `docs/IMPLEMENTATION_STATUS.md` §5 |
| DO-04 | TC-022 extra checks / message coverage (G) | PM | RM | DC-03 (D-05) | diff | BLOCKED | All | STP-A1 → DELIV |
| DO-05 | TC-022 *Actual result* + STP §14 (proposal D, appended) | PM with KR | PW | DC-03 (D-03, D-04) | diff | BLOCKED | All | STP-A1, STP-14 → DELIV |
| DO-06 | TC-022 test version and commit hash (E) | PM | PW | TE-05 | diff citing the TE-05 evidence | BLOCKED | All | STP-A1 → DELIV |
| DO-07 | SAD §3.9 deployment note | KR | PW | DC-06 (D-15) | diff | BLOCKED | All | `docs/working/sad/03e-security-architecture.md` → DELIV |
| DO-08 | SAD §4.1.4 heartbeat values (+ DECISIONS D6b) | KR | RM | DC-06 (D-15) | diff | BLOCKED | All | `docs/working/sad/04a-design-overview.md`, `docs/DECISIONS.md` → DELIV |
| DO-09 | Approval role titles | RM | PW | DC-06 (D-15) | diff | BLOCKED | All | SRS-FM, SAD-FM, STP-14 → DELIV |
| DO-10 | TC-021 record, RTM NFR-006/007, counts | PM (TC-021), PW (RTM) | RM | TE-01 + status decision | diff citing TE-01 evidence | BLOCKED. Note 17-10-2026: the working sources were updated (STP-A1, RTM, STP-13, STP-14, SRS-FM, `docs/DECISIONS.md` E5); DELIV not regenerated (FIN-03, FIN-04a). This is not formal tracker completion: confirmation by the responsible people and the reviewer's check are not recorded | All | STP-A1, RTM, STP-13, STP-14, SRS-FM, `docs/DECISIONS.md` (E5) → DELIV |
| DO-11 | TC-109 record, RTM SEC-REQ-007 / SEC-OBJ-001, counts | PW | KR | TE-03 + status decision | diff citing TE-03 evidence | BLOCKED | All | STP-A2, RTM, STP-13, STP-14, SRS-FM → DELIV |
| DO-12 | Exception records for Blocked tests (if D-02 chooses an exception); since 17-10-2026 only TC-109 (TC-021 is Pass, no exception needed) | PM (TC-021), PW (TC-109) | RM | DC-02 | diff | BLOCKED | All (+ instructor if required) | STP-A1/A2, STP-14 → DELIV |
| DO-13 | IMPLEMENTATION_STATUS results table after TE-05 | PM | PW | TE-05 | diff | BLOCKED | no | `docs/IMPLEMENTATION_STATUS.md` (not a deliverable) |

## 6. Optional implementation changes (only if accepted in D-14)

| Task ID | Description | Responsible | Reviewer | Dependencies | Required evidence | Status | Approval needed | Affected files |
|---|---|---|---|---|---|---|---|---|
| IM-01 | TC-022 pacing 50 ms (B option 2) | KR | PM | DC-03 (D-06 = option 2) | test run log | BLOCKED | All | `server/tests/integration/boardLimit.test.js` |
| IM-02 | TC-022 timeout margin | KR | PM | DC-03 (D-07) | test run log | BLOCKED | All | same |
| IM-03 | `versions.test.js` hook timeout under load | PM | KR | DC-06 (D-14) | test run log | BLOCKED | All | `server/tests/integration/versions.test.js` |
| IM-04 | Local test of `FORCE_HTTPS`/`TRUST_PROXY` (does not satisfy TC-109) | PW | KR | DC-06 (D-14) | test run log | BLOCKED | All | new test file under `server/tests/` |
| IM-05 | Startup check `FORCE_HTTPS` requires `TRUST_PROXY` | PW | KR | DC-06 (D-14) | unit test + log | BLOCKED | All | `server/src/config.js` |
| IM-06 | CSP `wss:` only under HTTPS | PW | KR | DC-06 (D-14) | test run log | BLOCKED | All | `server/src/rest/app.js` |
| IM-07 | E2E check for the "Board is full" message | RM | PM | DC-06 (D-14) | E2E log | BLOCKED | All | `e2e/whiteboard.spec.cjs` |

## 7. Final tasks

| Task ID | Description | Responsible | Reviewer | Dependencies | Required evidence | Status | Approval needed | Affected files |
|---|---|---|---|---|---|---|---|---|
| FIN-01 | Commit the agreed changes; each member commits their own work (today only `RachitSMane` has commits) | All | RM (repository) | DC-07 | `git log` showing each member's commits | BLOCKED | All | repository |
| FIN-02 | Validation gate (§9) complete | PM | PW | all tasks above that the decisions require | completed §9 | BLOCKED | All | this file |
| FIN-03 | Staged build of the DOCX/PDF into a staging folder (action plan §4 steps 1–3); `submission/final/` untouched | person from D-18 | second member from D-18 | FIN-02 | backup hashes; staging outputs; page check | BLOCKED | All | staging folder only |
| FIN-04 | Each member reads the **staged** PDFs in full and gives individual approval in the form the instructor accepts (Q5); the approval tables are filled in from these approvals only — no one signs for another member | RM, KR, PM, PW (each personally) | — | FIN-03 | each member's approval record | BLOCKED | each member individually | SRS-FM, SAD-FM, STP-14 |
| FIN-04a | Final build including the approval tables, into staging again; second-member page check; then copy the six files into `submission/final/` | person from D-18 | second member from D-18 | FIN-04 | staging outputs; hashes of the new six files | BLOCKED | All | DELIV, `docs/final/*.docx` |
| FIN-05 | Submit by the confirmed deadline; give repository access as agreed (E4) | All | — | FIN-04a, DC-02 | submission confirmation | BLOCKED | All | — |

---

## 8. Execution prerequisites

### 8.1 TC-021 (manual, stable Firefox) — `TC021_EXECUTION_CHECKLIST.md`
Prerequisites:
1. Decision D-08 (are automated Chrome/Edge results accepted?) and D-09 (executor, two checkers, who
   installs Firefox and on which machine).
2. Current stable Mozilla Firefox installed by a member after agreement. Not installed as of 14-10-2026.
3. Build: preferably the committed build (STP §13); otherwise record "uncommitted tree on 82af885" and
   the date.
4. Local app running: `server/.env` with fresh secrets, `npm run db:start` (if no MongoDB service), then
   `npm run dev` → `http://localhost:5173`.
5. Test accounts O, E, V, a non-member R, and one not-logged-in browser; separate Firefox profiles or
   private windows.
6. Viewport 1280 × 720 at 100 % zoom (Responsive Design Mode or window size; record which).

Evidence to collect, in `docs/evidence/<date>-tc021-firefox/`:
- `00-about-firefox.png` (exact version) and `01-viewport-1280x720.png`;
- one board screenshot per role (O, E, **V**);
- example tooltips;
- the end state of TC-001, TC-002, TC-013 step 1 and TC-017;
- `RESULTS.md` with the Pass/Fail table, tester, date, build and environment;
- a failure screenshot and defect for any failed item.

### 8.2 TC-109 (deployed HTTPS) — `TC109_DEPLOYMENT_PLAN.md`
- **Deployment owner:** *not assigned*. DECISIONS E3 names only "Team (implementation phase)", status
  Pending. Decision D-11 must name a person (or choose an exception, D-02). Proposal for the
  verification executor: PW (Security Test Lead), with a second checker (D-13).
- **Infrastructure prerequisites:**
  - a non-local host with a DNS name, ports 80/443;
  - a public CA certificate with the full chain;
  - exactly one TLS-terminating reverse proxy that:
    - allows TLS 1.2/1.3 only;
    - sends `X-Forwarded-Proto` / `X-Forwarded-For` and passes `Host`;
    - passes the WebSocket upgrade for `/socket.io/` (the client is WebSocket-only);
    - has an idle timeout > 20 s;
  - Node on `127.0.0.1`;
  - `NODE_ENV=production`, `TRUST_PROXY=true` **and** `FORCE_HTTPS=true`, `PUBLIC_URL=https://<host>`,
    `CLIENT_DIST`, a non-public `MONGO_URL`, fresh `JWT_SECRET`/`LOGIN_HMAC_KEY` (≥ 32 characters),
    `BCRYPT_COST ≥ 12`, empty `CLIENT_ORIGIN`;
  - test data only; teardown afterwards.
- **Security checks:**
  - HTTP → HTTPS redirect (308 from the app or the proxy's 301/308);
  - HSTS header;
  - no redirect loop;
  - TLS 1.2/1.3 in the browser and with `openssl -tls1_2/-tls1_3`;
  - `wss://…/socket.io/` with status 101;
  - TLS 1.1 refused (`openssl … -tls1_1 -cipher 'DEFAULT@SECLEVEL=0'`; inconclusive if the local
    client cannot offer TLS 1.1);
  - Node port not reachable directly.
- **Evidence** in `docs/evidence/<date>-tc109-https/`:
  - text outputs of every command;
  - screenshots of the TLS details and the WS request;
  - `RESULTS.md` with tester, date, host, proxy and versions, settings (no secrets).

### 8.3 TC-022 — documentation discrepancies and the decision each needs before the STP is edited

| Proposal | Discrepancy (STP App. A.1 TC-022) | Decision needed (agenda) | Effect |
|---|---|---|---|
| A | step 1 cites `board_content_bytes` (does not exist); only the maximum M1 is recorded | D-05: correct the text or record a deviation | description |
| B | step 1 "at most 20 per second" vs. a 40 ms pause (< 25/s) | D-06: text (option 1) or test 50 ms (option 2, rerun) | description / test change |
| C | preconditions and step 5: wait *T* + `mongosh` vs. direct trigger + `BSON.calculateObjectSize` | D-05: text or deviation (IMPLEMENTATION_STATUS §5 omits TC-022) | description |
| D | *Actual result* and §14 say "cause not known" / "open" vs. the 14-10 investigation | D-03 (keep Pass; harness-fault conclusion) and D-04 (wording) | record narrative |
| E | recorded values from the 12-10 test version; no commit hash (STP §13) | D-16/D-17 (commit, then rerun TE-05) | record |
| F | preconditions say "step 6" for the interval (step 5 meant) | D-05 (editorial) | description |
| G | extra checks not listed; "shows the message" not covered by the test | D-05 (scope wording) and D-14 (IM-07 optional) | description / optional new check |

---

## 9. Final validation gate: everything must be checked before the six deliverables are regenerated into `submission/final/`

Order: all sections below except the last → staged build (FIN-03) → individual approvals on the
staged PDFs (FIN-04) → final build and copy (FIN-04a).

Each line needs the name of the person who checked it, the date, and a link to the evidence. Do not
tick a line on the basis of a plan or a past run that does not apply to the commit being regenerated.

**Deadline and decisions**
- [ ] Instructor deadline confirmed in writing (Q1; DECISIONS E2 updated). Checked by ____ date ____
- [ ] All decisions D-01 – D-19 recorded in agenda §4 with approvers and dates; copied to `docs/DECISIONS.md`.
- [ ] Treatment of TC-021 and TC-109 decided (executed, or exception approved and recorded per D-02).

**Actual test execution and evidence**
- [ ] TC-021 executed per checklist with complete evidence, **or** an exception recorded (D-02).
- [ ] TC-109 executed on a real deployment with complete evidence, **or** an exception recorded (D-02).
- [ ] TC-022: decisions D-03 – D-07 applied; a loaded rerun done if D-07 requires it.
- [ ] Every result recorded in the STP comes from an actual run, with evidence in `docs/evidence/`.
      Past runs are kept; nothing is overwritten.

**Results tied to the correct commit**
- [ ] All agreed changes committed (FIN-01); each member has their own commits.
- [ ] TE-05 rerun (lint, unit + integration, E2E, and any additional suites agreed) executed **on that
      commit**; the hash is recorded in the evidence and in the STP records.
- [ ] No source change after the TE-05 commit, or TE-05 repeated on the new commit.

**Hosted CI**
- [ ] PR opened; `app-ci.yml` and `docs-check.yml` completed on GitHub; run URLs and outcomes recorded.
      "Passed" only if the hosted runs show it.

**Traceability and consistency**
- [ ] `python tools/check_trace.py` passes on the final sources (output saved).
- [ ] `python -m unittest discover -s tools/tests` passes (output saved).
- [ ] The RTM status of every requirement matches the STP test statuses (P / A / N per STP §13).
- [ ] TC counts identical in STP §13, STP §14, the SRS front matter, DECISIONS E5 and IMPLEMENTATION_STATUS.
- [ ] Audit findings #4–#15 each resolved as decided (corrected, or recorded as a deviation).
- [ ] Shared review issue list from RV-01 – RV-12 closed; each issue fixed or explicitly accepted.

**Backups and staged generation**
- [ ] Backup of the current six `submission/final/` files and `docs/final/*.docx` in a dated folder,
      SHA-256 recorded.
- [ ] Build into staging (`python tools/build_docs.py --out-dir <staging>`), export PDFs into staging
      (`tools/export_pdf.ps1 -SourceDir <staging> -OutDir <staging-pdf>`, no Word window open).
- [ ] Page counts and headings of the staged files checked; every page inspected by a second member.

**Review and individual approval**
- [ ] RV-01 – RV-12 and EV-01 – EV-04 completed and reviewed.
- [ ] Each of RM, KR, PM, PW has personally read all three **staged** PDFs (FIN-04).
- [ ] Each member has given individual approval for **their own** rows in the SRS, SAD and STP, in the
      form the instructor accepts (Q5). No one approves or signs for another member.
- [ ] Only then: final build with the approval tables (FIN-04a), second-member page check, copy into
      `submission/final/`, new hashes recorded.

## Evidence note, 15-10-2026 (session 7; tool-assisted run on Rachit's machine — no task status changed)

The runs below were made by the AI assistant, not by the members named in the rows above, so no row is
marked done; they are inputs for EV-02/EV-03, RV-06, DC-03 and TE-04/TE-05. Logs, screenshots and staged
documents are outside the repository in `C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\` (copy them into
`docs/evidence/2026-10-15-session7/` if the team wants them versioned). Uncommitted working tree (base
`82af885`), Node.js 26.7.0, AC power. All local; no hosted CI.

| Check | Result |
|---|---|
| `npm run lint` | no findings |
| `npm test` | 14 suites, 85 passed (Jest 308 s) |
| TC-022 alone ×3, idle | all passed; Jest 39.0 / 38.6 / 38.6 s; no disconnects; one 4.1–4.2 s stall per run in the version step |
| TC-022 under `cpuload.cjs 16 330` | passed; Jest 174.6 s (before the persistence change, also AC: 295.6 s); 36.2 s stall in the version step; 2 `ping timeout` disconnects, both rejoined |
| Client builds (into the output folder) | test build JS/CSS identical to `client/dist`; production build: 0 files with `__wbTest` |
| E2E Chromium | 10 passed |
| E2E Chrome 155 / Edge 155 / Playwright Firefox | 29 passed, 1 skipped (TC-009 offline, Playwright Firefox) |
| TC-021 reference screenshots, Owner/Editor/**Viewer**, 1280 × 720, three browsers | captured (9 PNG); not the manual check — human judgement and stable Firefox still required |
| TLS self-test + transport + config tests | 10 passed; `verify-tls.js` 7/7 checks PASS (local self-signed proxy — **not** TC-109) |
| Doc-tool tests / `check_trace.py` / `size_model.py` | 14 OK / 1,483 passed, 0 failed / `bound_holds True` |
| Staged SRS/SAD/STP DOCX + PDF | valid; SRS content identical to `submission/final`; SAD and STP differ in `word/document.xml` only; PDF pages 30 / 61 / 40 (final: 30 / 61 / 38) |

Source edits for review (team approval needed before any final build): SAD §3.6 `boardObjects` row
(native-driver write path), STP App. A.1 TC-022 *Actual result* (15-10-2026 addendum, status unchanged),
`TEAM_REVIEW_AGENDA.md` D-03 (out-of-date "not run under load" note).

## Evidence note, 15-10-2026 later (session 8; tool-assisted, no task status changed)

Same working tree, **battery** power. Logs: `C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\logs\2026-10-15-session8\`.

| Check | Result |
|---|---|
| `npm run lint` | no findings |
| `npm test` (per-test JSON: `08-npm-test-results.json`) | 14 suites, 86 passed, 0 failed |
| New test `transport.test.js` "multi-valued X-Forwarded-Proto" | passes; fails against a deliberate last-value mutation of `forwardedProto()` (reverted, hash verified) |
| TLS self-test + transport + config | 11 passed; self-test 7/7 PASS |
| E2E Chromium / Chrome 155 + Edge 155 + Playwright Firefox | 10 passed / 29 passed, 1 skipped |
| TC-022 alone ×2 / under load | passed 101.2 s (2 disconnects, no artificial load) and 58.6 s / passed 290.6 s (9.4 s below the timeout) |
| Version-write measurement | stall dominated by BSON processing; native driver saves about 100 ms in plain Node.js — not changed |
| Diagrams | 9 sources re-render to 33 PNGs, byte-identical to `docs/diagrams/png/` |
| Workflows | static check OK (YAML, scripts, files, pinned actions, timeouts); `npm ci --dry-run` up to date; **no hosted run** |

Inputs prepared for DC-03 (D-03 – D-07): `…\reports\TC022_DECISION_EVIDENCE_D03-D07.md`. IM-04 note: a local
`FORCE_HTTPS`/`TRUST_PROXY` test exists since 14-10 (`transport.test.js`, `tls.test.js`); the row stays as the
team left it until D-14 is decided.
