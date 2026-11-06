# Deviations from the original SRS, SAD and STP — Team 11

One page for the final demo (checklist Part 2 "Any deviations from initial SAD/SRS documents formally
documented for the demo"; Part 4 "The team clearly explains any permitted deviations"). Each row points
to where the deviation is recorded in detail. Status as of 05-11-2026. Baseline: SRS, SAD and STP
version 1.0 of 11-10-2026 (the Part-1 versions are kept unchanged in `submission/final/`).

## 1. Scope and requirements

| # | Deviation | Why | Where documented | Status |
|---|---|---|---|---|
| D-1 | **PNG export** implemented (issue #16), although SRS §1.2/§2.2 list export only as a candidate enhancement | requested in the sprint backlog; small, self-contained client feature | SRS §2.7; STP §4 note; SAD §4.5; DECISIONS.md E6; DOCUMENTATION_AUDIT.md §3 | **pending mentor/team approval** — not counted in requirement coverage |
| D-2 | **Board rename** implemented (issue #13): `PATCH /api/v1/boards/{boardId}`, Owner only; not in FR-042–FR-044 or the FR-051 matrix | usability of the dashboard | SRS §2.7; SAD API-02, §3.9.3; DECISIONS.md E6 | **pending mentor/team approval** |
| D-3 | Responsive layout below the 1,280 px minimum of NFR-006 (icon top bar, dialogs at 800 × 600) | issue #23; the minimum is unchanged, smaller sizes are an extra | SAD §4.5; `e2e/responsive.spec.cjs` | implemented, no requirement change |

## 2. Architecture and design

| # | Deviation | Where documented | Status |
|---|---|---|---|
| D-4 | Two server events added to API-01: `board:renamed` and `notice` (`VERSION_NOT_SAVED`) | SAD API-01; DOCUMENTATION_AUDIT.md §1 | documented 02-11-2026 |
| D-5 | The client does not display the `notice` event yet | SAD §4.6; DOCUMENTATION_AUDIT.md R4 | known gap, open |
| D-6 | CI extended: `app-ci.yml` (lint, unit, integration, build, E2E) added to the planned `docs-check.yml` | DECISIONS.md D16; STP §5 | done |
| D-7 | SRS §2.5 assumes a protected `main`; branch protection is not enabled and PR #28 was merged with a failing check | DECISIONS.md E4; DOCUMENTATION_AUDIT.md R3; presentation slide 14 | open (repository owner) |

No architectural pattern, component, data model or security control of the SAD was replaced. The
nine components (COMP-01–COMP-09), the layered client–server pattern and the API contracts are as
designed; `docs/final-submission/audit/check_docs_consistency.py` checks that every implemented route and
event is documented in the SAD.

## 3. Testing

| # | Deviation | Where documented | Status |
|---|---|---|---|
| D-8 | **TC-109 (SEC-REQ-007) Blocked** — no deployed HTTPS environment; application-side controls tested locally | STP TC-109; DECISIONS.md E3; System Validation Report §8 | needs mentor acceptance |
| D-9 | **TC-021 Pass with limitations** — manual in Firefox 158 and Chrome, automated in Chrome/Edge; Safari not tested; Playwright Firefox/WebKit are engine builds only | STP TC-021 record and §6; RELEASE_READINESS_2026-11-02 §4 | accepted by the team 17-10-2026 |
| D-10 | TC-005, TC-012: some automatic versions triggered directly rather than by waiting for the interval (same code path; timer tested with T = 1 s). TC-006/007 paced at ≥ 50 ms (rate limit). TC-024/025 object counts. TC-104 log scan in its own server | STP test-case records; IMPLEMENTATION_STATUS.md §5 | recorded |
| D-11 | TC-022 description corrected after the loaded-run investigation (16-10-2026) | STP TC-022 record; DECISIONS.md change history | team decision |
| D-12 | STP entry criterion "documents signed off" not met — tests executed before sign-off | STP §5, §11; IMPLEMENTATION_STATUS.md §5 | sign-off still open (E1) |
| D-13 | Performance (NFR-001–NFR-005) measured once, 12-10-2026, not re-measured after later changes | DOCUMENTATION_AUDIT.md §5; System Validation Report §8 | disclosed |
| D-14 | Coverage measured for Jest only; the React UI is tested by E2E without coverage | Code/Branch Coverage Reports | disclosed |

## 4. Process

| # | Deviation | Where documented | Status |
|---|---|---|---|
| D-15 | Four sprint milestones instead of the course's two sprints | `sprint-videos/README.md` §1; AGILE_AND_GITHUB_AUDIT.md §5.5; AGILE_ESTIMATION_AND_PLANNING_AUDIT.md §12 (mapping options; first-draft figures 46 / 62) and §16.4 (revised proposal: 49 / 62 points) | mapping to be confirmed by the team and accepted by the mentor (MANUAL_PENDING_DELIVERABLES.md M1) |
| D-16 | Backlog issues created on 30-10-2026, after the planned sprint dates; code merged 26-10 to 02-11-2026 | AGILE_AND_GITHUB_AUDIT.md §3; presentation slide 15 | disclosed |
| D-17 | No formal GitHub reviews on PRs; some teammate PRs self-merged | AGILE_AND_GITHUB_AUDIT.md §5 | cannot be changed retroactively; explain in viva |
| D-18 | No story points visible on the backlog | AGILE_AND_GITHUB_AUDIT.md §1–§2; retrospective proposal (111 points) in AGILE_ESTIMATION_AND_PLANNING_AUDIT.md §16 | open: proposal awaiting team and mentor approval; not written to GitHub (MANUAL_PENDING_DELIVERABLES.md M2) |

## 5. How to explain deviations in the demo (30 seconds)

"Our requirements did not change, but the implementation went slightly beyond them in two places —
PNG export and board rename — which we documented in SRS section 2.7 and are waiting for your decision
on. One security requirement, HTTPS in deployment, could not be verified because we have no deployed
server; the application side is implemented and tested locally. Every other deviation, mostly in how
some tests were executed, is recorded in the test-case records, and the SAD was updated for the two
new events and the rename endpoint."
