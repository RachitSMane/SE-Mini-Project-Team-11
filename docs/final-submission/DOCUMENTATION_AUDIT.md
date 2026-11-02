# Documentation consistency audit — 02-11-2026

Scope: SRS, SAD, STP (Markdown sources in `docs/working/`), RTM and ID registry, `docs/DECISIONS.md`,
`docs/IMPLEMENTATION_STATUS.md`, the release readiness report, `docs/README.md` and the root `README.md`,
compared with the implementation on `main` at `2b68907` (identical to the validated commit `48051d8`).
Method: the documents were read in full and compared with the code; mechanical checks were scripted
(section 4). This audit complements the team's earlier `docs/traceability/consistency-audit.md`.

## 1. Corrections made

| Document | Correction | Reason |
|---|---|---|
| SAD API-02 (`04c2-api02-access.md`) | Added `PATCH /boards/{boardId}` (rename): Owner only, `{title}` with the creation schema, `200 {id, title, role, updatedAt}`, errors, `board:renamed` notification, plus a note on queueing, policy and logging | Endpoint implemented in `server/src/rest/app.js` (issue #13) but undocumented |
| SAD API-01 (`04c1-api01-realtime.md`) | Added server events `board:renamed` and `notice` (`VERSION_NOT_SAVED`), the latter with its known client gap | Both emitted by `realtimeServer.js`, neither documented |
| SAD §3.9.3 (`03e-security-architecture.md`) | Recorded the Owner-only `rename` policy action | `policy.js` has an action the matrix did not mention |
| SAD §4.5–§4.6 (`04e-ux-open-issues.md`) | Export PNG button, icon top bar below 1024 px, dashboard rename; CI now runs on GitHub; 02-11 validation results; open item for the `notice` event; future work "PNG/PDF export" → "PDF export" | UI and status had changed since v1.0 |
| SAD status line | Dated update note | Traceable change |
| SRS §2.7 (`02-overall-description.md`) | Transparent note: PNG export and board rename are implemented outside the v1.0 baseline; scope decision pending | §1.2/§2.2 list export as a candidate enhancement; no approval recorded (section 3) |
| SRS front matter, §6 | Dated 02-11-2026 status addenda (statuses unchanged) | Final regression result |
| STP §4 (`03-04-features.md`) | Note under "Features not to be tested" that export and rename are implemented and covered by automated tests outside the test-case set | Contradiction with the implementation |
| STP §5 | CI is configured and runs (`app-ci`, `docs-check`) | Text said "once CI is configured" |
| STP §6 | Browser builds stated precisely: Playwright Chromium (CI), installed stable Chrome and Edge, Playwright Firefox ≠ stable Mozilla Firefox, Playwright WebKit ≠ Apple Safari; how stable Firefox evidence was obtained; Safari not tested | Requested distinction; avoids over-claiming |
| STP TC-021 record, §1/§14, test-case header | 02-11-2026 addenda (no status change), final regression metrics | Final regression result |
| `docs/DECISIONS.md` | D16 updated (two workflows run on GitHub); E4 set to "Partly done" with the verified repository state; new external action **E6** (scope decision) | E4 said "not verified"; scope decision needed an owner |
| `docs/README.md` | Status no longer claims "no test executed / system not implemented"; CI and collaborator state verified; layout lists `final/`, `final-submission/`, `reports/`, `evidence/` | Outdated status |
| `README.md` | Rewritten (section 6 of the final report) | Requested |
| Generated documents | `docs/final/Team11_{SRS,SAD,STP}.{docx,pdf}` rebuilt from the sources with `tools/build_docs.py` and `tools/export_pdf.ps1` | Word/PDF versions of the corrected sources |

No requirement, requirement ID, test case, test-case status or RTM status was changed. No ID was
allocated.

## 2. Remaining inconsistencies (not corrected, with reason)

| # | Inconsistency | Why not corrected | Who can resolve it |
|---|---|---|---|
| R1 | PNG export and board rename exist in the code and tests but not in the requirement baseline; SRS §1.2/§2.2 and STP §4 still list export as a candidate enhancement | Changing the requirement baseline needs team and mentor approval (no approval recorded) | Team + mentor (DECISIONS.md E6) |
| R2 | Three evidence files are cited but not in the repository: `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md` (the TC-021 record), `docs/evidence/2026-10-14-full-verification/15-tc022-cpuload-final.txt`, `docs/evidence/2026-10-14-tc022-performance/10-cpuload-after.txt` | They exist only in an older local clone. The TC-021 folder also holds a screenshot showing personal desktop content (location widget, taskbar, notifications, news images); publishing it needs the owner's review | Rachit: add the files (cropping `00-about-firefox.PNG`) or reword the citations |
| R3 | SRS §2.5 states development uses "a protected `main`"; `main` is not protected and PR #28 was merged with a failing check | The SRS constraint is correct as intent; the repository setting is what differs | Repository owner: enable branch protection (DECISIONS.md E4) |
| R4 | The server's `notice` event (`VERSION_NOT_SAVED`) is never displayed: `shared/src/syncClient.js` does not subscribe to it | Application code is outside this documentation task; now documented in SAD API-01 and §4.6 | Developer: subscribe in `syncClient.js` and show it in `BoardPage.jsx` |
| R5 | Approval tables of SRS, SAD and STP are unsigned; the two TC-021 reviewers' names are not recorded | Signatures cannot be produced by the authors' tools | All four members (DECISIONS.md E1) |
| R6 | `submission/final/Team11_*.docx` are the Part-1 versions of 11-10-2026 (before implementation) | Kept unchanged as the historical Part-1 submission; the current versions are in `docs/final/` | Submit from `docs/final/` (see the checklist) |
| R7 | Several documents cite logs "outside the repository" (`C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\...`) | These are already marked as outside the repository in the documents; they are local working logs | Optional: keep them locally for questions |
| R8 | The SRS revision-history table has no row after v1.0 (11-10-2026); later changes are dated addenda in the text | Matches the team's practice since 12-10-2026; adding a version would change "version 1.0" references across documents | Team decision at sign-off |

## 3. PNG export scope — evidence searched

- Searched `docs/DECISIONS.md`, `docs/reviews/*`, `docs/TEAM_REVIEW_CHECKLIST.md`, `docs/traceability/*`,
  the SRS, SAD, STP, the ID registry and GitHub issue #16 with its comments: **no recorded approval** to
  bring export into version 1.0, no requirement ID, no test case, no RTM row.
- What exists: issue #16 "Implement board export and download functionality" (created 30-10-2026 in
  milestone "Sprint 2 – Core Whiteboard", closed as completed on 02-11-2026), implemented in PR #28
  (`0f7cad0`), tested by `client/tests/exportImage.test.js` (6 tests), three E2E tests in
  `e2e/boards.spec.cjs` and the release smoke test.
- Handling chosen: the original requirements are unchanged; the documents state transparently that the
  function exists and that its scope decision is pending (SRS §2.7, STP §4 note, SAD §4.5, README).
- Board rename (issue #13) is in the same position: implemented and tested, not in FR-042 to FR-044 or
  the FR-051 matrix.

## 4. Automated checks run (02-11-2026, on this branch)

| Check | Command | Result |
|---|---|---|
| Traceability (IDs, requirement ↔ test ↔ RTM, SAD ↔ RTM) | `python tools/check_trace.py` | 1,483 checks passed, 0 failed |
| Documentation tool tests | `python -m unittest discover -s tools/tests` | 14 tests, OK |
| Lint (unchanged code) | `npx eslint .` | no findings |
| Cross-document consistency | `python docs/final-submission/audit/check_docs_consistency.py` | 56 passed, 0 failed, 4 known exceptions (`audit/check_docs_consistency.log`): every REST route of `app.js` is in SAD API-02/03; every Socket.IO event emitted or handled by `realtimeServer.js` is in API-01; every `npm run` command in the README and demo guide exists in `package.json`; relative Markdown links resolve; quoted test counts and package versions match the evidence and `node_modules`; cited file paths exist except R2 and the git-ignored `tools/plantuml/plantuml.jar` |
| Word documents | `python tools/build_docs.py` | SRS 37 headings / 16 tables / 2 images; SAD 51 / 27 / 31; STP 55 / 47 / 0 |
| PDF export | `tools/export_pdf.ps1 -SourceDir docs/final -OutDir docs/final` (Microsoft Word) | SRS 31 pages, SAD 65 pages, STP 45 pages |
| Diagrams | visual comparison of `docs/diagrams/png/component-diagram.png` with the code | matches: nine components, two interfaces, MongoDB; no diagram changed |

## 5. Unverified requirements

| Requirement | Status | Reason | What is needed |
|---|---|---|---|
| SEC-REQ-007 (HTTPS/WSS, TLS ≥ 1.2) | **N** — TC-109 Blocked | No deployed HTTPS instance; application-side controls tested locally (`transport.test.js`, `tls.test.js`) | Deploy behind a TLS proxy and run `node scripts/verify-tls.js https://<host>` |

All other 49 requirements have RTM status P (unchanged). Qualifications that do not change a status but
should be stated when presenting: NFR-006 for stable Mozilla Firefox rests on the manual TC-021 run (Firefox
158) and partial automation (Firefox 159, BiDi driver); NFR-001 to NFR-005 were measured on one laptop on
12-10-2026 and were not re-measured after later changes.

## 6. Decisions requiring mentor or team approval

1. **Scope of PNG export and board rename (E6):** approve as version 1.0 requirements (new IDs, test
   cases, RTM rows) or record as accepted additions outside the baseline.
2. **Acceptance of TC-109 as Blocked** (SEC-REQ-007 unverified) for the final evaluation, given that no
   deployment environment was provided (E3).
3. **Sign-off** of the SRS, SAD and STP approval tables (E1) and the confirmation of the submission
   deadline (E2).
4. **Publishing the missing TC-021 evidence** (R2), after removing personal content from the screenshot.
