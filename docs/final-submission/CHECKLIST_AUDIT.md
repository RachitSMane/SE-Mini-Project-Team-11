# Evaluation checklist audit — Team 11

Every item of the two official documents, `02TheCheckList.pdf` (evaluation checklist, Parts 1–4) and
`01FAQs_MiniProjectDemo.pdf` (final demo and viva FAQs), checked against the repository, its Git
history and GitHub on **05-11-2026** (branch `docs/final-submission`; application code identical to
`main` `64876d8`).

Status values: **COMPLETE** (supported by evidence), **INCOMPLETE** (work remains), **BLOCKED** (needs
access, approval or an external action), **NOT APPLICABLE**. Evidence types: *repo* = file in the
repository; *GitHub* = GitHub data read with the CLI; *run 05-11* = executed for this audit;
*historical* = earlier logs or CI runs; *manual* = recorded human check.

## Part 1 — Requirements and design documents

The exported files were checked, not only the Markdown sources: `docs/final/Team11_{SRS,SAD,STP}.pdf`
open and parse (31, 65 and 45 pages; text extracted with `pypdf`), the DOCX files pass a ZIP integrity
test, and the embedded images were counted (SRS 2, SAD 31).

| # | Item | Status | Evidence |
|---|---|---|---|
| 1.1 | SRS in standard IEEE format | COMPLETE | `docs/final/Team11_SRS.pdf`: 1 Introduction (purpose, scope, audience, definitions, references), 2 Overall description, 3 External interfaces, 4 System features, 5 NFRs, 6 Acceptance, 7 Models, 8 RTM — IEEE 830-style structure, built from the supplied template (`tools/build_docs.py`) |
| 1.2 | SRS introductory and descriptive sections | COMPLETE | SRS §1.1–§1.5 and §2.1–§2.7 |
| 1.3 | FRs and NFRs specified clearly and measurably | COMPLETE | 35 FRs (SRS §4.1–§4.4) with IDs and acceptance criteria; 7 NFRs (§5) each with a quantity, threshold and measurement method (e.g. NFR-001 "95 % … ≤ 500 ms", NFR-004 "≤ 5 s") — `docs/working/srs/05-nfr.md` |
| 1.4 | At least 1 UML use-case diagram | COMPLETE | 2 diagrams embedded in the SRS PDF §7 (UC-01, UC-02); sources `docs/diagrams/src/uc-0{1,2}-*.puml`, images `docs/diagrams/png/uc-0{1,2}-*.png` |
| 1.5 | Security section: ≥ 2 objectives and ≥ 2 requirements | COMPLETE | SRS §5.1.1 SEC-OBJ-001–003 (3) and §5.1.2 SEC-REQ-001–008 (8) |
| 1.6 | Test plan in standard IEEE format | COMPLETE | `docs/final/Team11_STP.pdf`, IEEE 829 structure: §1 Introduction … §15 Approvals |
| 1.7 | Test plan sections 3, 4 and 5 completely filled | COMPLETE | §3 Features to be tested, §4 Features not to be tested, §5 Test approach — about 1,400 words of text in the PDF; no TBD/TODO anywhere in the three PDFs |
| 1.8 | Section 5.1 dedicated to security validation | COMPLETE | STP §5.1 "Security Validation" (`docs/working/stp/05-1-security-validation.md`) with TC-101–TC-109 |
| 1.9 | Clear traceability back to the SRS | COMPLETE | STP §13; RTM `docs/traceability/rtm.md`; `python tools/check_trace.py` → 1,483 checks passed, 0 failed (*run 05-11*, `docs/testing-reports/evidence/2026-11-05/05-check-trace.txt`) |
| 1.10 | 7–10 minimum test cases covering FRs and NFRs | COMPLETE | 34 test cases: TC-001–TC-025 (FRs and NFRs) and TC-101–TC-109 (security) |
| 1.11 | SAD in standard IEEE format | COMPLETE | `docs/final/Team11_SAD.pdf`, built from the supplied IEEE-format template (`tools/build_docs.py`): §1 Introduction, §2 Overview, §3 Architecture, §4 Design, §5 Appendices |
| 1.12 | Architecture: component diagrams/descriptions, pattern, traceability, security architecture | COMPLETE | SAD §3.3 component diagram, §3.4 descriptions (COMP-01–09), §3.5 pattern (layered client–server), §3.8 traceability, §3.9 security architecture (trust boundaries, STRIDE, control mapping) |
| 1.13 | Design: ≥ 2 UML sequence diagrams, API design, error handling | COMPLETE | SAD §4.2 five sequence diagrams SD-01–SD-05 (embedded images); §4.3 API-01/02/03; §4.4 error handling, logging and monitoring |

No Part-1 document needed a correction in this audit, so the SRS, SAD and STP were not regenerated.

## Part 2 — Agile planning and repository set-up

Details: [`AGILE_AND_GITHUB_AUDIT.md`](AGILE_AND_GITHUB_AUDIT.md).

| # | Item | Status | Evidence |
|---|---|---|---|
| 2.1 | GitHub Project created and linked to the repository | **BLOCKED** | not readable: the CLI token lacks `read:project`. Owner must check (audit §2) |
| 2.2 | Backlog items created from the SRS FRs and NFRs | **INCOMPLETE** | 20 issues exist (*GitHub*), but only #23 cites a requirement ID; version history (FR-030–035), FR-050, SEC-REQ-007/008 have no item. Proposed mapping in audit §4 for the team to confirm |
| 2.3 | Story points assigned to all backlog items | **INCOMPLETE** | none in issues/labels/milestones; Project fields unreadable. Team must estimate (never invented here) |
| 2.4 | User stories assigned to individual team members | COMPLETE | every issue #7–#26 has one assignee, five per member (*GitHub*) |
| 2.5 | Sprint 1 and Sprint 2 planned on the project board | **INCOMPLETE** | four dated sprint milestones exist (*GitHub*); the board itself is unverified (2.1) and the mapping of four milestones to two course sprints needs a team decision (`sprint-videos/README.md` §1) |
| 2.6 | GitHub Actions enabled for PRs and commits | COMPLETE | Actions enabled; `app-ci` and `docs-check` run on every PR and push to `main`; last runs on `64876d8` green (41485597400, 41485597523) (*historical*) |
| 2.7 | Code implemented by approved methods (incl. permitted GPT use) matching SRS/SAD | COMPLETE | implementation matches the SAD contracts (`audit/check_docs_consistency.txt`: every REST route and Socket.IO event is in the SAD; 57 checks pass, *run 05-11*); 49/50 requirements verified. AI-tool use is permitted; each member must be able to explain their code (VIVA_PREPARATION.md §8 Q14) |
| 2.8 | PRs raised by the specifically assigned team member | COMPLETE with exceptions | each member raised PRs for their issues (#3, #4, #5, #27–#30, #31–#33). Exceptions: #17 and #26, and PR #27 spanning all members' issues (audit §5) |
| 2.9 | PRs formally reviewed and committed by the repository owner | **INCOMPLETE** | 0 of 14 PRs has a GitHub review; the owner merged 3 of 7 teammate PRs (*GitHub*). Cannot be corrected retroactively; future PRs should be reviewed (audit §5) |
| 2.10 | Sprint 1: 1-minute working-product video uploaded to the repository | **INCOMPLETE** | no video file or link anywhere. Script, format and destination: [`sprint-videos/README.md`](sprint-videos/README.md) §3 |
| 2.11 | Sprint 2 development completed and development cycle frozen | COMPLETE | all 20 issues and 4 milestones closed (02-11-2026); last application change `85da387` (02-11-2026); release candidate validated (`docs/reports/RELEASE_READINESS_2026-11-02.md`). Formal "freeze" = no further feature PRs; recommended: tag `v1.0` (see "What to do next") |
| 2.12 | Deviations from initial SAD/SRS formally documented for the demo | COMPLETE | [`DEVIATIONS.md`](DEVIATIONS.md) (18 items with sources); SRS §2.7, SAD §4.5–4.6, STP records. Two scope items await approval (BLOCKED sub-item, see 4.2) |
| 2.13 | All remaining project documentation finalised | COMPLETE (sign-off open) | SRS/SAD/STP aligned and regenerated 02-11-2026; testing reports 05-11-2026. Approval tables unsigned (DECISIONS.md E1) — BLOCKED on the team |
| 2.14 | Sprint 2: 2-minute working-product video uploaded to the repository | **INCOMPLETE** | no video. Script: [`sprint-videos/README.md`](sprint-videos/README.md) §4 |

## Part 3 — Testing and quality assurance

| # | Item | Status | Evidence |
|---|---|---|---|
| 3.1 | Original test cases updated to reflect sprint changes | COMPLETE (one sub-item BLOCKED) | dated addenda in the STP test-case records (TC-021, TC-022, final regression), STP §4–§6 updated 02-11-2026 (DOCUMENTATION_AUDIT.md §1). Export/rename have automated tests but no STP test case until the scope decision (DECISIONS.md E6) |
| 3.2 | All tests executed according to the test plan | COMPLETE (TC-109 BLOCKED) | 33 Pass, 1 Blocked, 0 Fail (STP records; RTM). *Run 05-11*: unit 110/110, integration 100/100, E2E 31/31. *Historical*: performance 12-10, cross-browser 02-11. *Manual*: TC-021 17-10 |
| 3.3 | Unit Testing Report in the docs folder | COMPLETE | [`docs/testing-reports/UNIT_TESTING_REPORT.md`](../testing-reports/UNIT_TESTING_REPORT.md) (*run 05-11*) |
| 3.4 | System Validation Report in the docs folder | COMPLETE | [`docs/testing-reports/SYSTEM_VALIDATION_REPORT.md`](../testing-reports/SYSTEM_VALIDATION_REPORT.md) |
| 3.5 | Code Coverage Report in the docs folder | COMPLETE | [`docs/testing-reports/CODE_COVERAGE_REPORT.md`](../testing-reports/CODE_COVERAGE_REPORT.md) + HTML report |
| 3.6 | Branch Coverage Report in the docs folder | COMPLETE | [`docs/testing-reports/BRANCH_COVERAGE_REPORT.md`](../testing-reports/BRANCH_COVERAGE_REPORT.md) |

## Part 4 — Final evaluation

| # | Item | Status | Evidence |
|---|---|---|---|
| 4.1 | Application functions as designed and fulfils the core use cases | COMPLETE (repository evidence); demo itself pending | UC-01/UC-02 flows pass in E2E (*run 05-11*); release smoke test passes; DEMO_GUIDE.md §3 script. The live demo is for the team to give |
| 4.2 | Team explains permitted deviations | INCOMPLETE (team to rehearse); export/rename **BLOCKED** on mentor approval | material ready: DEVIATIONS.md §5 (30-second answer) |
| 4.3 | Codebase accessible, readable and under version control | COMPLETE | public GitHub repository; lint clean (*run 05-11*); README with setup/run/test; 14 PRs; branch protection not enabled (E4) |
| 4.4 | Members explain individual contributions and demonstrate assigned PRs | INCOMPLETE (team preparation) | per-member issues, PRs and commits from Git/GitHub: VIVA_PREPARATION.md §3 |
| 4.5 | Understanding of the Agile/SDLC process (estimation, sprint planning, blockages) | INCOMPLETE (team preparation); estimation evidence missing (2.3) | VIVA_PREPARATION.md §1–§2 |
| 4.6 | Justify architecture, API design and automated test results | COMPLETE (material ready) | SAD; DEMO_GUIDE.md §4, §6; VIVA_PREPARATION.md §5–§8; testing reports |

## FAQ (`01FAQs_MiniProjectDemo.pdf`)

| # | FAQ requirement | Status | Evidence |
|---|---|---|---|
| F1 | Focus on SDLC adherence: requirements → architecture, agile workflow across sprints, structured testing | COMPLETE (material); agile evidence partly INCOMPLETE (2.2, 2.3, 2.9) | traceability (1.9), VIVA_PREPARATION.md §1, §5, testing reports |
| F2 | Individual contributions verified through version control and the project board: backlog items, story points, PRs raised, owner's review and commit logs | INCOMPLETE | assignments and PRs exist (*GitHub*); story points missing; board unverified; no formal reviews |
| F3 | Deviations from SRS/SAD/Test Plan documented and explained in the demo | COMPLETE (documented) | DEVIATIONS.md; explanation is for the team at the demo |
| F4a | Updated IEEE-format SRS, SAD and Test Plan in the repository | COMPLETE | `docs/final/Team11_{SRS,SAD,STP}.{docx,pdf}` (02-11-2026) |
| F4b | Well-maintained GitHub backlog with assigned story points | INCOMPLETE | see 2.2, 2.3 |
| F4c | 1-minute and 2-minute outcome videos for Sprints 1 and 2 | INCOMPLETE | see 2.10, 2.14 |
| F4d | Unit, System Validation, Code Coverage and Branch Coverage reports in the docs folder | COMPLETE | `docs/testing-reports/` |
| F5 | AI tools allowed if code aligns with SRS/SAD/STP and the team can explain it | COMPLETE (alignment) / team preparation | consistency and traceability checks pass; VIVA_PREPARATION.md §8 Q14 |

## Summary

| Status | Count |
|---|---|
| COMPLETE (incl. "with exceptions"/"sub-item blocked") | 34 |
| INCOMPLETE | 12 |
| BLOCKED | 1 (plus blocked sub-items in 2.12, 2.13, 3.1, 3.2, 4.2) |
| NOT APPLICABLE | 0 |

The INCOMPLETE items are all outside what can be done by editing the repository without inventing
evidence: GitHub Project, story points, requirement IDs on the backlog, PR reviews, the two videos and
the team's own viva preparation. The steps are in `AGILE_AND_GITHUB_AUDIT.md` §2 and
`sprint-videos/README.md`.
