# Final submission checklist — Team 11

Status as of 02-11-2026, updated 06-11-2026 (§A4), branch `docs/final-submission`. Legend: **[x]** done and checked; **[ ]** open.
Items prepared by Claude are marked done only when the preparation itself is complete; anything that needs
a person's review, approval, signature or presentation stays open in its own section.

## A. Completed by Claude (prepared and checked)

- [x] SRS, SAD and STP sources corrected against the implementation (`DOCUMENTATION_AUDIT.md` §1)
- [x] SAD API-02 lists `PATCH /boards/{boardId}`; API-01 lists `board:renamed` and `notice`
- [x] STP distinguishes Playwright Firefox/WebKit from stable Mozilla Firefox/Apple Safari
- [x] PNG export and board rename documented transparently as outside the v1.0 baseline (no requirement changed)
- [x] Word and PDF versions regenerated: `docs/final/Team11_SRS|SAD|STP.docx` and `.pdf`
- [x] Root `README.md` rewritten; every command checked against `package.json`
- [x] Traceability check passes (1,483 checks); documentation tool tests pass
- [x] Cross-document consistency check run (`audit/check_docs_consistency.txt`)
- [x] Demo guide (`DEMO_GUIDE.md`) with technical explanations and contingencies
- [x] Presentation, 17 slides, with speaker notes in the file and in `presentation/SPEAKER_NOTES.md`; PDF export; validated and visually checked in PowerPoint
- [x] 15 real screenshots of the running application (`screenshots/`)
- [x] Release readiness report and test evidence referenced (`docs/reports/RELEASE_READINESS_2026-11-02.md`, `docs/evidence/2026-11-02-final-validation/`)
- [x] Documentation audit with remaining issues and decisions (`DOCUMENTATION_AUDIT.md`)

### A2. Added 05-11-2026 (evaluation-checklist audit)

- [x] Every item of `02TheCheckList.pdf` and `01FAQs_MiniProjectDemo.pdf` audited with status and evidence (`CHECKLIST_AUDIT.md`); exported SRS/SAD/STP PDFs checked — no document correction needed
- [x] Test suites re-run on the `main` code (unit 110/110, integration 100/100, E2E Chromium 31/31; lint, traceability, documentation checks pass); logs in `docs/testing-reports/evidence/2026-11-05/`
- [x] Four testing reports generated from that run: `docs/testing-reports/UNIT_TESTING_REPORT.md`, `SYSTEM_VALIDATION_REPORT.md`, `CODE_COVERAGE_REPORT.md`, `BRANCH_COVERAGE_REPORT.md` (+ HTML coverage report)
- [x] GitHub backlog, milestones, PRs, reviews and Actions audited (`AGILE_AND_GITHUB_AUDIT.md`)
- [x] Deviations register for the demo (`DEVIATIONS.md`)
- [x] Sprint video recording scripts, format and destination (`sprint-videos/README.md`) — videos themselves not recorded
- [x] Viva preparation: SDLC, Agile, individual contributions from Git/GitHub, PR process, 16 likely questions (`VIVA_PREPARATION.md`)

### A2b. Added 05-11-2026 (GitHub Agile planning audit — no GitHub record changed)

- [x] All 20 issues read in full (bodies, comments, timelines, cross-references); inventory and four-sprint analysis (`AGILE_AND_GITHUB_AUDIT.md` §3–§5)
- [x] New evidence: a GitHub Project v2 exists and holds all 20 issues (timeline events); its fields remain unreadable without `read:project`
- [x] Missing and incomplete Agile fields listed with recommended actions (`AGILE_AND_GITHUB_AUDIT.md` §6)
- [x] Retrospective Fibonacci story-point **proposal** for all 20 issues, with rationale, confidence and sprint totals (`STORY_POINT_ESTIMATION.md`) — not team-agreed
- [x] Proposed issue → SRS mapping and coverage gaps (`ISSUE_REQUIREMENT_TRACEABILITY.md`) — not approved
- [x] Ownership vs contribution analysis from Git and GitHub (`AGILE_AND_GITHUB_AUDIT.md` §7)

### A3. Open from the 05-11-2026 audit (team action)

- [ ] Record and upload the 1-minute Sprint 1 and 2-minute Sprint 2 videos (`sprint-videos/README.md`); first agree the four-milestone → two-sprint mapping
- [ ] Check the GitHub Project (`gh auth refresh -s read:project`): it exists (issue timelines) but its fields and repository link are unverified (`AGILE_AND_GITHUB_AUDIT.md` §2)
- [ ] Estimate and enter story points for every backlog item (team decision — not invented); start from the revised 111-point proposal in `AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16 (pending team and mentor approval; `STORY_POINT_ESTIMATION.md` is the superseded first draft)
- [ ] Confirm the issue → SRS requirement mapping (`ISSUE_REQUIREMENT_TRACEABILITY.md` §2) and enter it in the Project
- [ ] Let the owner formally review (Approve) the remaining PRs before merging; consider branch protection
- [ ] Each member rehearses their contribution and PR walkthrough (`VIVA_PREPARATION.md` §3)
- [ ] Hold a retrospective estimation session; adopt, change or reject the proposed points of the revised proposal (`AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16; team and mentor approval pending)
- [ ] Decide the four-milestone → two-sprint mapping and record it in `docs/DECISIONS.md` (`AGILE_AND_GITHUB_AUDIT.md` §5.5)
- [ ] Decide whether to add clearly labelled retrospective backlog items for uncovered requirements (`ISSUE_REQUIREMENT_TRACEABILITY.md` §5)
- [ ] Prepare viva answers on the retrospective milestone dates, missing in-progress tracking, unreviewed PRs and the bulk-restore commits (`AGILE_AND_GITHUB_AUDIT.md` §5–§8)
- [ ] #25/#26 were closed with unrecorded manual checks: record results or state that they were not done

### A4. Added 06-11-2026 (deliverables completion pass — no GitHub record changed)

- [x] Part 1 re-verified from the exported PDFs:
  - SRS: 31 pages; 35 FRs, 7 NFRs, SEC-OBJ-001–003, 8 SEC-REQs, use cases UC-01 and UC-02.
  - SAD: 65 pages; SD-01–SD-05, API-01–API-03, COMP-01–COMP-09, layered pattern, STRIDE, error handling.
  - STP: 45 pages; §5.1 security validation; no TBD or TODO.
- [x] All 135 relative links in the 81 Markdown files resolve to tracked files once this pass is committed (repository-wide check, including `docs/testing-reports/`)
- [x] Browser claims checked: Firefox 159 (experimental BiDi) reported as 22 passed / 7 failed, and Apple Safari as not tested, wherever they appear
- [x] Branch `docs/final-submission` pushed (`a2ffc10`); the documentation PR is not opened yet (owner's approval)
- [x] Every task that needs a person, with the evidence it requires and where to save it: [`MANUAL_PENDING_DELIVERABLES.md`](MANUAL_PENDING_DELIVERABLES.md) (M1–M15), including the PR review, contribution verification and video pre-flight checklists

## B. Requires your review (Rachit)

- [ ] Read the corrected SRS §2.7, SAD API-01/API-02/§4.5–§4.6 and STP §4–§6, §14 (or their diffs on this branch)
- [ ] Review the new `README.md`, including the team responsibilities table (taken from the issue assignments)
- [ ] Open `docs/final/Team11_*.pdf` and check the layout of the new sections
- [ ] Rehearse with the presentation; adjust wording you would not say yourself
- [ ] Decide whether to add the missing TC-021 evidence (`DOCUMENTATION_AUDIT.md` R2) — crop the personal content out of `00-about-firefox.PNG` first
- [ ] Open the Pull Request from `docs/final-submission` into `main` (branch pushed 06-11-2026 at `a2ffc10`; PR not opened, by instruction) and have a teammate review it (`MANUAL_PENDING_DELIVERABLES.md` M7)
- [ ] Optional: enable branch protection on `main` (DECISIONS.md E4)

## C. Requires mentor or team approval

- [ ] Scope decision for PNG export and board rename (DECISIONS.md E6; `DOCUMENTATION_AUDIT.md` §6)
- [ ] Acceptance of SEC-REQ-007 / TC-109 as Blocked (no HTTPS deployment)
- [ ] Sign the approval tables of SRS, SAD and STP (E1); add the names of the two TC-021 reviewers
- [ ] Confirm the submission deadline and format with the instructor (E2)
- [ ] Team review of the test summary (STP exit criterion)

## D. Requires you to demonstrate or present

- [ ] Prepare the demo environment and the two fake accounts (`DEMO_GUIDE.md` §1)
- [ ] Do one full dry run of the demo (about 15 minutes) and one of the presentation
- [ ] Present the slides; answer questions with the demo guide §4 and §6
- [ ] Record the results of any manual checks you have done: issues #25 and #26 were closed on 02-11-2026
  without results, so nothing below can be marked done yet (`DOCUMENTATION_AUDIT.md` R9)
- [ ] Manual checks that only a person can do (optional before the demonstration, release readiness report §8):
  installed stable Firefox (double-click text editing, PNG download, offline banner), Safari if a Mac is
  available, 125 % display scaling, a touch screen, the Windows high-contrast theme, a second device over
  plain HTTP

## E. Submission package contents

| Item | Location | Status |
|---|---|---|
| Final SRS | `docs/final/Team11_SRS.docx` / `.pdf` (source `docs/working/srs/`) | generated; sign-off open |
| Final SAD | `docs/final/Team11_SAD.docx` / `.pdf` (source `docs/working/sad/`) | generated; sign-off open |
| Final STP | `docs/final/Team11_STP.docx` / `.pdf` (source `docs/working/stp/`) | generated; sign-off open |
| Part-1 versions (historical, 11-10-2026) | `submission/final/` | unchanged |
| README | `README.md` | rewritten |
| Architecture diagrams | `docs/diagrams/png/` (sources `docs/diagrams/src/`) | unchanged, verified against the code |
| Presentation | `docs/final-submission/presentation/Team11_Whiteboard_Final_Presentation.pptx` / `.pdf` | ready for review |
| Speaker notes | `docs/final-submission/presentation/SPEAKER_NOTES.md` and the PPTX notes | ready for review |
| Demo walkthrough | `docs/final-submission/DEMO_GUIDE.md` | ready for review |
| Documentation audit | `docs/final-submission/DOCUMENTATION_AUDIT.md` | done |
| Test evidence | `docs/evidence/2026-11-02-final-validation/`, `docs/reports/RELEASE_READINESS_2026-11-02.md`, `docs/IMPLEMENTATION_STATUS.md` | done |
| Source code | GitHub `RachitSMane/SE-Mini-Project-Team-11`, `main` at `64876d8` (merge of PR #34; `app-ci` and `docs-check` green, re-checked 06-11-2026). Application code unchanged since `85da387` (02-11-2026) | done |
| Known limitations | README "Known limitations"; release readiness report §6 | documented |
| Remaining scope decisions | DECISIONS.md E6; SRS §2.7 | open (section C) |
| Unit Testing Report | `docs/testing-reports/UNIT_TESTING_REPORT.md` | done 05-11-2026 |
| System Validation Report | `docs/testing-reports/SYSTEM_VALIDATION_REPORT.md` | done 05-11-2026 |
| Code Coverage Report | `docs/testing-reports/CODE_COVERAGE_REPORT.md` (+ `coverage-html/`) | done 05-11-2026 |
| Branch Coverage Report | `docs/testing-reports/BRANCH_COVERAGE_REPORT.md` | done 05-11-2026 |
| Sprint 1 video (1 min) | `docs/final-submission/sprint-videos/Team11_Sprint1_Demo_1min.mp4` | **not recorded** — script ready |
| Sprint 2 video (2 min) | `docs/final-submission/sprint-videos/Team11_Sprint2_Demo_2min.mp4` | **not recorded** — script ready |
| Deviations register | `docs/final-submission/DEVIATIONS.md` | done 05-11-2026 |
| Evaluation checklist audit | `docs/final-submission/CHECKLIST_AUDIT.md` | done 05-11-2026 |
| Agile / GitHub audit | `docs/final-submission/AGILE_AND_GITHUB_AUDIT.md` | done; Project and story points open |
| Retrospective estimate proposal (111 points; academic sprints 49 / 62) | `docs/final-submission/AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16 | proposal; team and mentor approval pending (M1, M2) |
| Issue ↔ SRS traceability proposal | `docs/final-submission/ISSUE_REQUIREMENT_TRACEABILITY.md` | proposal; team confirmation pending (M4) |
| Individual contribution assessment | `docs/final-submission/INDIVIDUAL_CONTRIBUTION_ASSESSMENT.md` | done; confirmation dates and mentor review pending (M8, M9) |
| Manual pending deliverables | `docs/final-submission/MANUAL_PENDING_DELIVERABLES.md` | done 06-11-2026; tasks M1–M15 open |
| Viva preparation | `docs/final-submission/VIVA_PREPARATION.md` | ready for review |
