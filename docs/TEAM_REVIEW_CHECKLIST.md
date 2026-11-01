# Team review checklist (prepared 14-10-2026)

For all four members before the final documents are regenerated and signed. Nothing here changes a
test status. Background: `docs/IMPLEMENTATION_STATUS.md` and `docs/evidence/2026-10-14-*/`.

Detailed review documents (added 14-10-2026, later the same day; proposals only, nothing applied):
- `docs/reviews/TC022_CORRECTION_PROPOSAL.md`: issues A–G with the current wording, the actual test
  behaviour and proposed wording.
- `docs/reviews/TC021_EXECUTION_CHECKLIST.md`: manual stable-Firefox procedure and recording sheet.
- `docs/reviews/TC109_DEPLOYMENT_PLAN.md`: prerequisites, risks, commands and evidence for TC-109.
- `docs/reviews/SUBMISSION_CONSISTENCY_AUDIT.md`: 18 findings with severity and regeneration impact.
- §6 below: the proposed review and contribution plan for the four members.

State when prepared: branch `docs/setup`, base commit `82af885`, everything uncommitted. The six files
in `submission/final/` match the current document sources: a rebuild into a temporary folder differed
only in `docProps/core.xml` (build timestamp).

## 1. TC-022 (board size limit) — findings and limitations

- [ ] Read `docs/evidence/2026-10-14-tc022-investigation/README.md`.
- [ ] Understood: the 12-10 run-2 failure mechanism was **reproduced under artificial CPU load**
      (`NOT_READY`; both test sockets dropped with `ping timeout`; the delete was never sent). Test-harness
      fault, not an FR-008 fault. Run 2 itself is only *consistent with* this (its code was not recorded).
- [ ] Understood the fix: step 6 waits (≤ 60 s) for both clients to rejoin; expected results unchanged.
- [ ] Understood the limitations:
  - The **final** test version has **not** been run under load; only the first post-fix version passed
    under load.
  - Under that load the test used more than 286 s of its 300 s Jest timeout.
  - Why heartbeats are missed under load is **unexplained**.
  - The 60 s failure branches have never been exercised.
- [ ] **Decision:** keep TC-022 as Pass? Update the STP TC-022 record (requires regenerating the deliverables)?
- [ ] **Decision:** resolve the TC-022 record mismatches in §3 (fix the STP text, or record them as deviations).

## 2. Blocked tests

### TC-021 (NFR-006, NFR-007) — stable Firefox and manual checks

> **Update 17-10-2026 — current status:** TC-021 was executed and the team confirmed it as **Pass with
> limitations**. The result, the actual coverage and the limitations are in
> `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md`.
> - Coverage: manual checks in installed Firefox 158 and in Chrome; an automated Chrome/Edge run;
>   Edge was not checked by hand.
> - The automated run predates the stroke-width tooltip fix (D3). After the fix the tooltips were
>   re-checked by hand in Firefox only; no manual or automated Chrome/Edge check after the fix.
> - The text and boxes below are the original 14-10-2026 checklist, kept as history and not ticked.
> - TC-109 (below) is still outstanding.

Stable Mozilla Firefox is still **not installed** on the test machine (checked 14-10-2026).
Playwright 1.50 drives only its own patched Firefox build (`playwright.config.cjs`), so stable Firefox
has to be checked by hand.
- [ ] Install current stable Firefox and record the exact version.
- [ ] At 1280 × 720, run by hand: TC-001, TC-002, TC-013 step 1, TC-017.
- [ ] For each role (Owner, Editor, Viewer), check:
  - role badge and connection status visible;
  - all drawing tools directly on the toolbar;
  - every control has text or a tooltip;
  - Tab reaches every control; Enter/Space activates it;
  - no control cut off; no horizontal scroll.
- [ ] Save dated screenshots for **all three** roles. The existing automated evidence has Owner and
      Editor screenshots only; the test does not capture the Viewer.
- [ ] **Decision:** the STP calls TC-021 a *manual* test. The Chrome 154 / Edge 155 evidence is
      automated (session 1, 12-10; console logs not retained). Does that count, or must Chrome and Edge
      also be checked by hand?
- [ ] If the automated browser run is repeated, use `--output <other folder>` so the session-1
      screenshots in `test-results/` are not overwritten.

### TC-109 (SEC-REQ-007) — HTTPS deployment
Prerequisites (DECISIONS.md E3, owner: team):
- [ ] A non-local host with a DNS name and a valid certificate.
- [ ] Exactly **one** TLS-terminating reverse proxy in front of Node (the app trusts one hop:
      `trust proxy 1`). The proxy must:
  - allow TLS 1.2 and 1.3 only;
  - send `X-Forwarded-Proto`;
  - pass the WebSocket upgrade for `/socket.io/`;
  - keep port 80 open so the HTTP→HTTPS redirect can be observed.
- [ ] Node bound to `127.0.0.1` (not reachable without the proxy).
- [ ] Settings: `NODE_ENV=production`, `TRUST_PROXY=true` **and** `FORCE_HTTPS=true` together, plus
      `PUBLIC_URL=https://…`, `CLIENT_DIST`, fresh secrets and a MongoDB.
  - `FORCE_HTTPS` without `TRUST_PROXY` makes every request look like HTTP behind the proxy, so every
    request is redirected again (an endless redirect loop).
  - With `FORCE_HTTPS`, health checks over plain HTTP get a 308.
- [ ] Use test accounts only; commit no secrets or certificates; tear the instance down afterwards.

Verification procedure (STP TC-109 steps; save every output with the date):
1. `curl -sI http://<host>/` → 308 (or the proxy's 301) with `Location: https://<host>/`;
   `curl -sI https://<host>/` → `Strict-Transport-Security` header present.
2. Browser developer tools, Security tab → TLS 1.2 or 1.3.
3. Developer tools, Network tab, filter WS → the connection is `wss://<host>/socket.io/…`.
4. `openssl s_client -connect <host>:443 -tls1_1 -cipher 'DEFAULT@SECLEVEL=0'` → handshake refused.
   The `SECLEVEL=0` option makes sure a refusal comes from the server and not from the client's own
   defaults. For comparison, `-tls1_2` should succeed.

Note: no automated test exercises `FORCE_HTTPS`/`TRUST_PROXY` at all. A local test would check the
redirect code; it would **not** satisfy TC-109. **Decision:** add one or not.

## 3. Document consistency — concrete findings (not yet fixed)

1. STP TC-022 step 1 says "cross-check M3 with `board_content_bytes` in the server log". No such log
   field exists in `server/src`; the test compares with the database field `Board.contentBytes`.
2. STP TC-022 step 1 says "at most 20 per second". The test pauses 40 ms after each acknowledgement,
   which allows up to 25 per second. That is still below the 30 ops/s limit.
3. STP TC-022 preconditions and step 5 ("wait one interval *T*", `mongosh` `Object.bsonsize`) differ
   from the test, which triggers the version directly and measures it with `BSON.calculateObjectSize`.
   `IMPLEMENTATION_STATUS.md` §5 lists the direct-trigger deviation for TC-005 and TC-012 but not TC-022.
4. The STP TC-022 actual result and STP §14 ("one intermittent TC-022 failure … open") predate the
   session-3 findings in `IMPLEMENTATION_STATUS.md` §6.
5. All STP actual results come from the 12-10 execution. Two test files changed afterwards
   (`boardLimit.test.js`, `syncClient.test.js`), so the recorded runs used the earlier versions. The
   planned rerun after committing (§9 step 4) covers this.

Checked and consistent: the RTM has 47 P and 3 N (NFR-006, NFR-007, SEC-REQ-007), matching the SRS
front matter and STP §14; the TC-109 record ("implemented but unverified") matches the code.
*Update 17-10-2026:* TC-021 is Pass with limitations, so the RTM now has 49 P and 1 N (SEC-REQ-007,
TC-109 Blocked). The SRS front matter and STP §14 state the same. This note does not replace the
four-member review below.

## 4. Approval and sign-off
- [ ] Each member has read the SRS, SAD and STP PDFs in `submission/final/` (30 / 61 / 38 pages).
- [ ] Agree what is signed: documents with TC-021 and TC-109 **Blocked** under an approved exception
      (STP §5 exit criteria), or only after they are executed. *Update 17-10-2026:* TC-021 is Pass
      with limitations; this item now concerns TC-109 only.
- [ ] Fill in the STP §15 approvals (QA Lead, Security Test Lead, Dev Lead, Product Owner) and the
      SRS/SAD approval tables. All signature fields are blank now.
- [ ] Confirm the deadline with the instructor (DECISIONS.md E2).

## 5. Hosted CI and Git workflow
- [ ] Agree who commits which files. The course requires each member's own commits; nothing is
      committed yet.
- [ ] After committing, rerun `npm run lint`, `npm test` and `npm run test:e2e`, and record the commit
      hash in the STP records (§9 step 4).
- [ ] Open a Pull Request (`app-ci.yml` runs only on PRs and pushes to `main`); confirm that
      `app-ci.yml` and `docs-check.yml` pass on GitHub (DECISIONS.md E4). Hosted CI has **never** run.
- [ ] Only then regenerate the deliverables, keeping backups of the current six files, and export the PDFs.

## 6. Review and contribution plan (proposal — not agreed by anyone yet)

Principles:
- Every member reviews part of **each** of the SRS, SAD and STP; no one owns a whole document.
- Each slice gets a second reader who did not write it. Names and roles are as in the approval tables.
- Report every issue in one shared list (document, section, ID, issue, proposed fix). Fix nothing in the
  STP, RTM or deliverables until the team has decided (§7).
- Everyone reads all three PDFs in full before signing (§4).

| Member (roles in the documents) | SRS sections | SAD sections | STP sections | Evidence to verify | Specific checks / issues to report |
|---|---|---|---|---|---|
| **Rachit S Mane** (SRS Lead / Product Owner) | §4.3 Version history, §4.4 Accounts, boards, sharing and access | §4.1.3–4.1.6 (reconciliation, reconnection, version triggers, test hooks), SD-02, SD-03 | App. A.2 TC-101–TC-108 | `docs/evidence/2026-10-14-final-checks/` (lint, unit 32/32, TC-022 alone, `npm test` 77/77): logs match the README | Heartbeat values missing from SAD/D6b (audit #14); FR-033/FR-034 vs. SD-02 |
| **P Chinni Krishna Reddy** (SAD Lead / Dev Lead) | §4.1 Canvas editing (FR-008), §4.2 Real-time synchronisation | §3.5–3.7 (size measures, risks), SD-01, SD-05, API-01 | App. A.1 TC-012–TC-025, **including the TC-022 record** | `docs/evidence/2026-10-14-tc022-investigation/` (logs 1–8 vs. README); `TC022_CORRECTION_PROPOSAL.md` A–G against `server/tests/integration/boardLimit.test.js` | Independent check of the TC-022 findings (the 12-10 Pass decision was Rachit's); audit #4, #6–#10 |
| **Pranav V Menon** (STP Lead / QA Lead) | §5 Non-functional requirements (NFR-006, NFR-007), §6 Acceptance tests | §3.1–3.4 (goals, stakeholders, components), §4.5 UX design | §1–§5, §6–§12, §14 metrics and exit criteria; App. A.1 TC-001–TC-011 | `test-results/` screenshots and `.last-run.json` (TC-021); `docs/evidence/2026-10-14-jest-open-handles/` | TC-021 manual vs. automated evidence (audit #11); exit criteria and blocked-test exception (audit #3); `TC021_EXECUTION_CHECKLIST.md` complete and correct |
| **Prithvi W** (Security & Traceability Lead / Security Test Lead) | §5.1 Security (SEC-REQ-001–008), §8 RTM | §3.8 Traceability, §3.9 Security architecture, §4.4 Errors and logging | §5.1 Security validation, §13 Traceability; App. A.2 TC-109 | `python tools/check_trace.py` output; RTM totals 47 P / 3 N; the deliverable rebuild comparison in the audit | `TC109_DEPLOYMENT_PLAN.md` vs. `server/src/rest/app.js`, `config.js`, `server.js`; SAD deployment note (audit #13); STP §13 commit-hash rule (audit #5) |

Second readers (cross-check one slice each): Rachit → Pranav's STP §14; Krishna → Prithvi's SRS §5.1;
Pranav → Krishna's TC-022 record review; Prithvi → Rachit's SAD §4.1.3–4.1.6.

Sign-off: each member signs their own row in the approval tables of **all three** documents (SRS:
SRS/SAD/STP/Security & Traceability Lead rows; SAD: the same four rows; STP §15: QA Lead, Security Test
Lead, Dev Lead (SAD), Product Owner (SRS)), and only after the decisions in §7. The SRS "Course
Coordinator" row is not the team's to fill.

## 7. Team decisions required (none taken yet)

| # | Decision | Input |
|---|---|---|
| 1 | TC-022: keep **Pass**? Accept the harness-fault conclusion? Approve the wording (proposal D); text or test for pacing (B); STP fixes or recorded deviations (A, C, F, G) | `TC022_CORRECTION_PROPOSAL.md` |
| 2 | TC-021 acceptance: does automated Chrome/Edge evidence satisfy the *manual* test? Who installs stable Firefox (software installation) and runs the checklist? | `TC021_EXECUTION_CHECKLIST.md` |
| 3 | TC-109: who provides the host, DNS, certificate and proxy (DECISIONS E3)? Does a non-public test host count as "deployed"? | `TC109_DEPLOYMENT_PLAN.md` |
| 4 | Blocked tests: execute both before signing, or approve and record an exception (STP §5 exit criteria)? | audit #3 |
| 5 | Add a local automated test for `FORCE_HTTPS`/`TRUST_PROXY` (code check only; does not satisfy TC-109)? Restrict the CSP to `wss:` under HTTPS (audit #17)? | TC-109 plan §6 |
| 6 | SAD additions: deployment note (audit #13), heartbeat values (audit #14); approval role titles (audit #15) | audit |
| 7 | Final regeneration: when, after which changes, who runs `tools/build_docs.py` and `tools/export_pdf.ps1`, with backups of the current six files | — |
| 8 | Deadline: confirm with the instructor (DECISIONS E2; the brief's 28-09-2026 has passed) | — |
| 9 | Git workflow: who commits which files (each member's own commits); rerun the checks on the commit and record the hash (STP §13); PR to trigger `app-ci.yml` and `docs-check.yml`; enable CI and branch protection (E4) | §5 above |
