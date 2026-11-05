# Agile planning and GitHub audit — Team 11

Checked on **05-11-2026** with the GitHub CLI as `RachitSMane` (token scopes `repo`, `read:org`,
`workflow`, `gist`) against `RachitSMane/SE-Mini-Project-Team-11`. Nothing on GitHub was created,
edited, reopened or closed by this audit.

## 1. Results at a glance

| Checklist item | Status | Evidence / reason |
|---|---|---|
| GitHub Project created and linked to the repository | **BLOCKED — not verifiable** | The token lacks the `read:project` scope: `gh project list` → "missing required scopes [read:project]"; the GraphQL `projectsV2` query is refused. Whether a Project exists is unknown to this audit |
| Backlog items created from SRS FRs and NFRs | **INCOMPLETE** | 20 issues (#7–#26) exist, but they are task-oriented: only #23 cites a requirement ID (NFR-006). No issue covers version history (FR-030–FR-035), ownership transfer (FR-050), presence (FR-052) or the security requirements by name (§4) |
| Story points assigned to all backlog items | **INCOMPLETE (as far as visible)** | No story points in any issue body, label or milestone. They may exist as a Project field, which could not be read (§2) |
| User stories assigned to individual team members | **COMPLETE** | every issue has exactly one assignee; 5 issues per member (§3) |
| Sprint 1 and Sprint 2 planned in the project board | **PARTLY COMPLETE** | four sprint milestones with dates, objectives and issues (§3); not verifiable on the Project board; four sprints vs the course's two (see `sprint-videos/README.md` §1) |
| GitHub Actions enabled | **COMPLETE** | Actions enabled (`allowed_actions: all`); `app-ci` and `docs-check` ran on every PR and push to `main`; latest runs on `64876d8` succeeded (41485597400, 41485597523) |
| PRs raised by the assigned team member | **MOSTLY COMPLETE** | every member raised PRs for their own issues; exceptions in §5 |
| PRs formally reviewed and committed by the repository owner | **INCOMPLETE** | **0 of 14 PRs has a GitHub review** (no approvals, no review comments, no PR comments). The owner merged 3 of the 7 teammate PRs (#27, #28, #30); #3, #4, #5 and #29 were merged by their own authors. `main` is not protected (DECISIONS.md E4) |

## 2. What to do about the GitHub Project (manual)

1. Give the CLI read access and re-run the check (one-time, interactive):
   `! gh auth refresh -s read:project` then
   `gh project list --owner RachitSMane` and
   `gh project item-list <number> --owner RachitSMane --format json`.
   Or open the repository on GitHub → **Projects** tab.
2. If **no Project exists**: GitHub → your profile → Projects → **New project** → *Board* template →
   name "Team 11 Whiteboard Backlog" → in the project, **⋯ → Settings → Manage access**, and on the
   repository page **Projects → Link a project**. Then **Add item → #** and add issues #7–#26.
3. Add fields (Project → **+** in the table header): **Story Points** (Number), **Sprint** (Iteration,
   or a single-select with "Sprint 1"/"Sprint 2"), **SRS Requirements** (Text).
4. Fill **Story Points** only with values the team actually agrees on (a short estimation meeting with
   planning poker on a Fibonacci scale 1, 2, 3, 5, 8, 13 is the usual method). If points were estimated
   earlier (chat, notes, a spreadsheet), copy those and keep the source. Do not back-fill numbers nobody
   estimated; if you estimate now, say so in the viva ("estimated retrospectively on <date>").
5. Fill **SRS Requirements** from the proposal in §4 after the team has checked it.
6. Group by **Sprint** (board view → *Group by: Sprint*) so Sprint 1 and Sprint 2 are visible.

These are Project fields, so the closed issues and milestones themselves do not have to be reopened or
edited.

## 3. Backlog, assignments and sprints (actual data)

| Member (GitHub) | Issues assigned | Milestones |
|---|---|---|
| Rachit S Mane (`RachitSMane`, owner) | #8, #14, #17, #21, #23 | S1, S2 ×3, S4 |
| P Chinni Krishna Reddy (`Chinni-Krishna-Reddy`) | #7, #11, #18, #22, #24 | S1, S3 ×2, S4 ×2 |
| Pranav V Menon (`pranav6126`) | #10, #13, #16, #19, #26 | S2 ×2, S4 ×3 |
| Prithvi W (`Prithviwar`) | #9, #12, #15, #20, #25 | S1, S2 ×2, S4 ×2 |

All 20 issues were created by `RachitSMane` on 30-10-2026 and closed on 02-11-2026. The four
milestones (all closed) carry planned dates 31-08 to 25-10-2026. Labels give type and priority
(`feature`, `Testing`, `Priority -High/-Medium`), not size.

**Be ready to explain in the viva:** the issues were created on 30-10-2026, after the planned sprint
dates, and the code reached GitHub via PRs between 26-10 and 02-11-2026. The planned sprint dates are
therefore the plan; the GitHub timestamps show when the backlog was recorded and the work was merged.
The presentation already says this (slide 15).

## 4. Proposed issue → SRS requirement mapping (for the team to confirm)

Derived by Claude from the issue titles, task lists and the code each PR changed, compared with the SRS
requirement list. It is a **proposal**; confirm or correct it before copying it into the Project.

| Issue | Proposed requirements |
|---|---|
| #7 Project structure | SRS §2.4–§2.5 constraints (no FR) |
| #8 Whiteboard frontend and canvas | FR-001–FR-006, NFR-007 |
| #9 Shared error handling | FR-026, SEC-REQ-005; SAD §4.4 |
| #10 E2E tests | STP TC-001–TC-018, TC-021, TC-023 (verification item) |
| #11 Real-time synchronisation | FR-020–FR-024, FR-027, FR-052, NFR-001, NFR-002 |
| #12 Sharing and access control | FR-045–FR-051, SEC-REQ-003, SEC-REQ-004 |
| #13 Board management and persistence | FR-042–FR-044, FR-008 (rename: outside baseline, E6) |
| #14 Authentication and sessions | FR-040, FR-041, SEC-REQ-001, SEC-REQ-002, SEC-REQ-006 |
| #15 Drawing tools | FR-001–FR-007 |
| #16 Export | none — outside the v1.0 baseline (DECISIONS.md E6) |
| #17 Frontend–API integration | FR-026, FR-043 (supporting) |
| #18 Connection lifecycle | FR-025, NFR-004 |
| #19 Backend tests | STP TC-001–TC-025, TC-101–TC-108 (verification item) |
| #20 Database validation | FR-008, FR-027, SEC-REQ-005 |
| #21 Frontend validation | FR-026, NFR-007 |
| #22 Multi-client sync tests | FR-020–FR-023, NFR-002 |
| #23 Responsive layout | NFR-006, NFR-007 |
| #24 Board-state consistency | FR-021–FR-023, FR-027, SEC-REQ-005 |
| #25 Cross-browser testing | NFR-006 (TC-021) |
| #26 Release validation | STP exit criteria (all) |

**Requirements with no backlog item:** FR-030–FR-035 (version history and restore), FR-050 (ownership
transfer), SEC-REQ-007 (TLS deployment), SEC-REQ-008 (security logging); NFR-003 and NFR-005 only
indirectly. They are implemented and tested (RTM status P except SEC-REQ-007), mostly in PR #27. If the
team adds backlog items for them now, label them clearly (e.g. "retrospective backlog entry, created
<date>") and link the PRs that implemented them — do not back-date them.

## 5. Pull Requests (actual data)

| PR | Author | Merged by | Review | Issues (from milestone descriptions / PR) |
|---|---|---|---|---|
| #1, #2, #6 | RachitSMane | RachitSMane | none | documents; #14 (PR #2) |
| #3 | pranav6126 | pranav6126 | none | #10 |
| #4 | Chinni-Krishna-Reddy | Chinni-Krishna-Reddy | none | backend board capacity |
| #5 | Prithviwar | Prithviwar | none | #9 |
| #27 | pranav6126 | **RachitSMane** | none | "restore missing app files" — 157 files, cited for #7, #8, #11–#15, #17 |
| #28 | pranav6126 | **RachitSMane** | none | #10, #13, #16, #19 (merged with a failing `app-ci` check, repaired in #31) |
| #29 | Prithviwar | Prithviwar | none | #9, #12, #15, #20, #25 |
| #30 | Chinni-Krishna-Reddy | **RachitSMane** | none | #7, #11, #18, #22, #24 |
| #31, #32, #33, #34 | RachitSMane | RachitSMane | none | #8, #18 (#31), #21, #23, #25, #26 (#33) |

Exceptions to "PR raised by the assigned member": **#17** (assigned to Rachit) is attributed only to
PRs #27 and #29 by other members; **#26** (assigned to Pranav) was completed in PR #33 by Rachit;
PR #27 by Pranav restored application files for issues assigned to all four members, so it does not by
itself show who wrote that code. Commit authorship inside each PR is the better evidence for
individual contributions (`git log --author=…`).

**What cannot be fixed afterwards:** reviews and merges that happened without a review. Do not add
approvals to merged PRs now and present them as the original review. Explain in the viva what the
review practice was (CI on every PR, owner merging most integration PRs) and what you would change
(branch protection with a required review and required checks, DECISIONS.md E4).

**What can still be done properly:** for the remaining PRs (this documentation branch and the video
upload), let a teammate raise the PR where it is their work, and let the owner review it on GitHub
(**Files changed → Review changes → Approve**, with a comment) before merging. Optionally enable branch
protection on `main` first (Settings → Branches → Add rule: *Require a pull request before merging*,
*Require approvals: 1*, *Require status checks: app-ci, docs-check*).
