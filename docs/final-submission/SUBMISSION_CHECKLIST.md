# Final submission checklist — Team 11

Status as of 02-11-2026, branch `docs/final-submission`. Legend: **[x]** done and checked; **[ ]** open.
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

## B. Requires your review (Rachit)

- [ ] Read the corrected SRS §2.7, SAD API-01/API-02/§4.5–§4.6 and STP §4–§6, §14 (or their diffs on this branch)
- [ ] Review the new `README.md`, including the team responsibilities table (taken from the issue assignments)
- [ ] Open `docs/final/Team11_*.pdf` and check the layout of the new sections
- [ ] Rehearse with the presentation; adjust wording you would not say yourself
- [ ] Decide whether to add the missing TC-021 evidence (`DOCUMENTATION_AUDIT.md` R2) — crop the personal content out of `00-about-firefox.PNG` first
- [ ] Push `docs/final-submission` and open a Pull Request (not done by Claude, by instruction)
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
| Source code | GitHub `RachitSMane/SE-Mini-Project-Team-11`, `main` at `2b68907` (`app-ci` run 41476112779 and `docs-check` green) | done |
| Known limitations | README "Known limitations"; release readiness report §6 | documented |
| Remaining scope decisions | DECISIONS.md E6; SRS §2.7 | open (section C) |
