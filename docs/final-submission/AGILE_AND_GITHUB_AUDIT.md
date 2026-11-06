# Agile planning and GitHub audit — Team 11

Repository `RachitSMane/SE-Mini-Project-Team-11`. Audit date **05-11-2026** (first version earlier the
same day; this version extends and corrects it). Read with the GitHub CLI as `RachitSMane`. Token
scopes: `repo`, `read:org`, `workflow`, `gist`. **Nothing on GitHub was created, edited, labelled,
reopened, closed or moved.**

Companion reports:
- `AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16: the revised retrospective estimate proposal (111 points). It is still subject to team and mentor approval.
- [`STORY_POINT_ESTIMATION.md`](STORY_POINT_ESTIMATION.md): the superseded first draft (108 points).
- [`ISSUE_REQUIREMENT_TRACEABILITY.md`](ISSUE_REQUIREMENT_TRACEABILITY.md): the issue ↔ SRS mapping proposal.

## 1. Results at a glance

| Checklist / FAQ item | Status | Evidence |
|---|---|---|
| GitHub Project created and linked | **PARTLY VERIFIED** | every issue's timeline has `added_to_project_v2` events (30-10-2026, 05:46 UTC) and `project_v2_item_status_changed` events by `github-project-automation[bot]`. So **a Project v2 exists and holds all 20 issues**. Its name, fields, views and whether it is linked to the repository are **unable to verify** (§2) |
| Backlog items derived from SRS FRs/NFRs | **INCOMPLETE** | 20 issues; only #23 names a requirement (NFR-006); 12 of 50 requirements have no issue, including the whole version-history feature (traceability report §3) |
| Story points on all items | **INCOMPLETE** | none in issue bodies, comments, labels or milestones. Project fields unable to verify; the repository owner reports none on the Project. Retrospective proposal: **111 points** (`AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16; Krishna 31 · Pranav 29 · Prithvi 29 · Rachit 22). It supersedes the earlier 108-point draft (`STORY_POINT_ESTIMATION.md`) and is **still subject to team and mentor approval**. Equivalent individual contribution (27 / 31 / 27 / 26 = 111, not story points): `INDIVIDUAL_CONTRIBUTION_ASSESSMENT.md` |
| Stories assigned to individual members | **COMPLETE** | each of the 20 issues has exactly one assignee; five per member |
| Sprint 1 and Sprint 2 planned on the board | **INCOMPLETE** | four sprint milestones, all created on 30-10-2026 with due dates in the past (§5); course mapping undecided |
| GitHub Actions enabled | **COMPLETE** | `app-ci` and `docs-check` on every PR and push to `main` since PR #27; latest runs on `64876d8` green |
| PRs raised by the assigned member | **MOSTLY** | see §7; exceptions #17, #26, and the bulk-restore PRs #27 and #29 |
| PRs formally reviewed and merged by the owner | **INCOMPLETE** | 0 of 14 PRs reviewed; teammates self-merged #3, #4, #5, #29 (§8) |

## 2. GitHub Project access and what could still be established

| Question | Answer | How it was established |
|---|---|---|
| Can the Project be read? | **No.** `gh project list` → "missing required scopes [read:project]"; GraphQL `projectsV2` refused; `gh issue view --json projectItems` returns an empty list. Anonymous requests to `https://github.com/users/RachitSMane/projects/1`–`5` return 404, so the Project is private or uses other numbers | CLI and HTTP, 05-11-2026 |
| Does a Project exist? | **Yes, at least one Project v2.** All 20 issues show two `added_to_project_v2` events at the same second (05:46:26 UTC on 30-10-2026, 8 minutes to 1¾ hours after the issues were created). That means either two projects or a duplicated event; the timeline does not say which | issue timeline API |
| Were statuses tracked? | Each issue has exactly **two** status changes, both by `github-project-automation[bot]`: one on adding (to the default column) and one on closing (to the "Done" column). There are **no manual status moves** (e.g. to "In Progress") on any issue | issue timeline API |
| Project name, fields (Status values, Sprint/Iteration, Story Points, dates), views, repository link | **Unable to verify** | needs `read:project` |
| Owner's own inspection | The owner reports that all four sprints on the Project lack estimates | statement in the request, not independently verified |

To complete the check: `! gh auth refresh -s read:project`, then
`gh project list --owner RachitSMane` and `gh project item-list <number> --owner RachitSMane --format json`.
This only reads data.

## 3. Issue inventory (all 20 issues; no other issues exist)

Every issue was created by `RachitSMane` on 30-10-2026 (04:02–05:38 UTC) and closed by `RachitSMane` on
02-11-2026, all with state reason "completed". Every issue has a description, a task list, acceptance
criteria and a completion comment (owner, 02-11-2026). "Closed via" separates a formal PR closing
reference from a manual close.

| # | Title (short) | Milestone | Assignee | Labels | Closed (UTC) / via | PR evidence | Requirement IDs in issue | Proposed SP |
|---|---|---|---|---|---|---|---|---|
| 7 | Project structure and dev environment | S1 | Chinni-Krishna-Reddy | frontend, Backend, Priority -High | 13:07 manual | cited #27, #30 | — | 3 |
| 8 | Whiteboard frontend and canvas | S1 | RachitSMane | frontend, Priority -High, feature | 13:08 manual | x-ref #32; cited #27, #29, #31 | NFR-006 (comment) | 5 |
| 9 | Shared error handling | S1 | Prithviwar | frontend, Backend, Integration, feature | 13:08 manual | x-ref #29; cited #5 | — | 3 |
| 10 | End-to-end testing | S4 | pranav6126 | frontend, Testing, Priority -High | 13:08 manual | cited #3, #28 | — | 8 |
| 11 | Real-time sync (Socket.IO) | S3 | Chinni-Krishna-Reddy | Backend, Integration, Priority -High, feature | 13:08 manual | cited #27, #30 | FR-025 (comment) | 13 |
| 12 | Board sharing and access control | S2 | Prithviwar | frontend, Backend, Priority -High, feature | 13:08 manual | x-ref #29; cited #27 | — | 8 |
| 13 | Board management and persistence | S2 | pranav6126 | frontend, Backend, Priority -High, feature | 13:08 manual | cited #27, #28 | — | 5 |
| 14 | Authentication and sessions | S2 | RachitSMane | frontend, Backend, Priority -High, feature | 13:09 manual | cited #2, #27 | SEC-REQ-007 (comment, as blocked) | 8 (first draft: 5, superseded) |
| 15 | Drawing tools | S2 | Prithviwar | frontend, Priority -High, feature | 13:09 manual | x-ref #29; cited #27, #32 | — | 8 |
| 16 | Export and download | S2 | pranav6126 | frontend, Priority -Medium, feature | 13:09 manual | cited #28 | — (outside baseline) | 3 |
| 17 | Frontend–API integration | S2 | RachitSMane | frontend, Integration, Priority -High, feature | 13:09 manual | cited #27, #29 | — | 3 |
| 18 | Connection lifecycle | S3 | Chinni-Krishna-Reddy | Backend, Integration, Priority -Medium, feature | 13:10 manual | cited #30, #31 | — | 5 |
| 19 | Backend unit and integration tests | S4 | pranav6126 | Backend, Testing, Priority -High | 13:10 manual | cited #28 | — | 8 |
| 20 | Database validation and integrity | S4 | Prithviwar | Database, Testing, Priority -Medium | 13:11 manual | x-ref #29 | — | 5 |
| 21 | Frontend validation and feedback | S4 | RachitSMane | frontend, Testing, Priority -Medium, feature | 15:53 **closed by PR #33** | closes #33 | — | 3 |
| 22 | Multi-client sync testing | S4 | Chinni-Krishna-Reddy | Integration, Testing, Priority -High | 13:11 manual | cited #30 | — | 5 |
| 23 | Responsive layout | S2 | RachitSMane | frontend, Priority -Medium, feature | 15:53 **closed by PR #33** | closes #33 | **NFR-006 (body)** | 3 |
| 24 | Board-state consistency | S4 | Chinni-Krishna-Reddy | Backend, Integration, Testing, Priority -High | 13:11 manual | cited #30 | — | 5 |
| 25 | Cross-browser testing | S4 | Prithviwar | frontend, Testing, Priority -Medium | 15:54 manual | x-ref #29, #33, #34 | — (TC-021 cited → NFR-006/007) | 5 |
| 26 | Final validation and release readiness | S4 | pranav6126 | Integration, Testing, Priority -High | 15:54 manual | x-ref #33, #34 | SEC-REQ-007 (comment, as blocked) | 5 |

"Proposed SP" = the revised retrospective proposal (`AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16; total 111). It is **not** a recorded value and is still subject to team and mentor approval. The superseded first draft (`STORY_POINT_ESTIMATION.md`, 108) had #14 at 5.
Acceptance criteria: 3–4 per issue; #21, #23, #25 and #26 later gained "Remaining verification" or
"Final checks" lists in their descriptions (02-11-2026).

## 4. Complexity and dependencies (summary; detail in the estimation report §4)

- **Explicit dependencies (prose in the issue):** #26 → #21, #23, #25; #21 → #9, #17; #23 → #8, #15;
  #25 → #10, #8, #15; #11 related to #18, #22, #24; #8 → #23; #10 → #25. **No GitHub "blocked by"
  relationships or sub-issues are set on any issue** (dependencies API: empty).
- **Inferred dependencies:** #12 needs #13, #14 and, for revocation propagation, #11 (Sprint 3). That is
  a dependency **forward** in time from Sprint 2 to Sprint 3. Also #16 → #15 (renderer); #17 → #9, #13,
  #14; #18, #22, #24 → #11.
- **Overlaps:** #8/#15 (toolbar and drawing), #8/#23 (responsiveness), #11/#18 (reconnection),
  #11/#22 (multi-user verification), #22/#24 (consistency checks), #9/#17/#21 (errors and feedback).
- **Unusually large:** #11 (13). Also large: #12, #15, #10, #19 (8 each).
- **Should have been split:** #11 into four, #12 into two, #15 into two, #19 into two. #22 and #24 could
  have been merged.
- **Hard to estimate from the description alone:** #17 (generic), #12 (minimal text, broad delivery),
  #22, #25 and #26 (open-ended "identify and fix" scopes).

## 5. Sprint milestone audit

All four milestones were **created on 30-10-2026 (03:39–03:43 UTC)** with due dates between 13-09 and
25-10-2026, i.e. already in the past. The earliest commit in the repository is `22e73fb` (10-10-2026);
SRS/SAD/STP v1.0 are dated 11-10-2026. The planned dates of milestones 1–3 (31-08 to 11-10) are
therefore **earlier than any recorded activity** and earlier than the requirements baseline. They cannot
be verified from the repository. This is consistent with the presentation (slide 15): "the sprint dates
are the plan".

| | Sprint 1 – Project Foundation | Sprint 2 – Core Whiteboard | Sprint 3 – Real-Time Collaboration | Sprint 4 – Testing and Finalization |
|---|---|---|---|---|
| Planned dates (milestone text) | 31-08 → 13-09 | 14-09 → 27-09 | 28-09 → 11-10 | 12-10 → 25-10 |
| Closed (UTC) | 02-11 13:31 | 02-11 16:00 | 02-11 13:31 | 02-11 15:59 |
| Issues | #7, #8, #9 | #12, #13, #14, #15, #16, #17, #23 | #11, #18 | #10, #19, #20, #21, #22, #24, #25, #26 |
| Count (open / closed) | 3 (0 / 3) | 7 (0 / 7) | 2 (0 / 2) | 8 (0 / 8) |
| Assignees | Krishna 1, Rachit 1, Prithvi 1 | Rachit 3, Prithvi 2, Pranav 2 | Krishna 2 | Pranav 3, Krishna 2, Prithvi 2, Rachit 1 |
| Missing estimates | 3 of 3 | 7 of 7 | 2 of 2 | 8 of 8 |
| Proposed SP (retrospective, audit §16) | 11 | 38 (first draft: 35, superseded) | 18 | 44 |
| Dependencies | #8 → #23 (S2), i.e. forward | #23 → #8 (S1); #12 → #11 (S3), forward | #11 ↔ #18; #22, #24 (S4) verify it | #26 → #21, #23 (S2), #25 |
| Objective vs tasks | broadly consistent, but #8 is a full frontend, more than "foundation" | "core whiteboard" also contains authentication (#14) and sharing/access control (#12), which are not whiteboard functions; #23 was the last issue closed | consistent; one 13-point item | consistent with "testing", but #20 and #21 include new implementation |
| Planning-field gaps | no estimates; no requirement IDs | no estimates; requirement ID only on #23; description still says "Status: In progress … open: #23" although closed | no estimates; one comment-level requirement ID | no estimates; description still says "Status: In progress … open: #21, #25, #26" although closed; #25/#26 closed with unticked checks |

### 5.5 Four milestones vs the course's "Sprint 1" and "Sprint 2"

The checklist expects two sprints, each with a demo video; the repository has four milestones. The
milestones must not be renamed or merged. Two mappings are defensible:

| Option | Course Sprint 1 | Course Sprint 2 | Support | Weakness |
|---|---|---|---|---|
| **A. By scope** (recommended for the videos) | milestones 1 + 2: a single-user whiteboard with accounts, boards, sharing, export — 10 issues, 49 SP (proposed, audit §16; first draft: 46, superseded) | milestones 3 + 4: real-time collaboration, hardening and testing — 10 issues, 62 SP | milestone objectives; clean functional split; equal issue counts | the planned dates are unverified, see above |
| B. By repository history | work up to PR #6 (12–29 Oct: documents; PR #2 auth pages; #3 E2E + STP; #4 board size limit; #5 shared errors) | PRs #27–#34 (1–2 Nov: application baseline, features, tests, release) | real commit and PR dates | the application only reached GitHub in PR #27, so there is no working product in the repository at the end of "Sprint 1" |

**Requires team decision and mentor acceptance.** Record the decision in `docs/DECISIONS.md`. The video
scripts (`sprint-videos/README.md`) follow option A.

## 6. Missing or incomplete Agile fields

"Unable to verify" means the field may exist on the Project but cannot be read with the current token.

| Issue(s) | Missing / incomplete field | Current value | Recommended action | Priority |
|---|---|---|---|---|
| all 20 | Story points | none in issues, labels or milestones; Project: **unable to verify** (owner reports none) | team estimation session starting from the revised proposal in `AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16 (pending team and mentor approval); record as retrospective in a Project field | High |
| all 20 except #23 | Requirement traceability | no FR/NFR/SEC-REQ ID in the description | "SRS Requirements" Project field from `ISSUE_REQUIREMENT_TRACEABILITY.md` §2 after review | High |
| — (backlog) | Backlog items for FR-008, FR-027, FR-030–FR-035, NFR-001–003/005, SEC-REQ-006/008 | no issue | team decides on clearly labelled retrospective entries (traceability report §5) | High |
| #25, #26 | Completion evidence | #25: comment at 15:48 says "Keeping this issue open for the manual checks"; closed at 15:54 with no further note. #26: all six "Final checks" and the "Remaining before closing" list unticked | in the viva, say these checks were not recorded (DOCUMENTATION_AUDIT.md R9); optionally the assignee adds a factual comment with results — a new comment, not an edit | High |
| milestones 1–4 | Planning dates | created 30-10-2026 with past due dates; start dates only in description text | explain as retrospective planning; do not edit | High |
| milestones 2, 4 | Status text | "Status: In progress" in descriptions of closed milestones | mention in the viva; do not edit closed milestones | Medium |
| all 20 | Status workflow | only automatic add/close status changes; no "In progress" stage recorded | explain; nothing to fix retroactively | Medium |
| 18 of 20 (all but #21, #23) | Linked PR (formal) | closed manually; PRs named only in comments or cross-references | use "Closes #n" in future PRs | Medium |
| #12, #17 | Acceptance criteria quality | generic ("permissions work correctly"; "frontend communicates successfully") | note as an estimation concern | Medium |
| all 20 | Start / target dates per issue | no issue-level dates in issue data; Project date fields **unable to verify** | optional Project iteration field | Low |
| all 20 | Formal dependencies | prose only; no "blocked by" or sub-issues | optional; record in the Project | Low |
| #9 | Priority label | none (labels were bug → changed to feature + frontend on 02-11-2026; no priority ever) | team decides; record in the Project, not as a label change on a closed issue | Low |
| #7 | Type label | none (`epic` removed 02-11-2026) | none needed | Low |
| #12–#17 | Task list format | plain bullets, not checkboxes (other issues use ticked checklists) | none | Low |
| #21, #23 | Description checklists | unticked in the body; the completion comments show them verified (PR #33) | none: the comment is the evidence | Low |
| labels | Consistency | `frontend` lower-case vs `Backend`, `Database`, `Integration`, `Testing`; "Priority -High" spacing; `Priority -Low`, `epic`, `bug` unused; no size labels | none (cosmetic) | Low |
| all 20 | Assignee | **none missing**; one assignee each | — | — |
| all 20 | Milestone | **none missing** | — | — |

## 7. Team ownership and contributions

Issue **assignment** and **code contribution** are different things, and neither issue counts, commit
counts nor story points measure individual performance. **Important limitation:** most of the
application entered the repository in two "restore" commits of a shared team working tree: `7e1d2a2`
(Pranav, PR #27, "restore missing application files from team working-tree snapshot") and `68b0e0c`
(Prithvi, PR #29, "restore existing implementation baseline from stash (D-16)"). Git records who
committed that snapshot, **not who wrote it**. `docs/IMPLEMENTATION_STATUS.md` records that the
implementation was done in an uncommitted working tree (12-10-2026) without naming authors.

| Member | Issues assigned (proposed SP) | PRs authored | Non-merge commits on `main` | Areas changed by own commits (excluding bulk restores) | Consistency of assignment and contribution |
|---|---|---|---|---|---|
| **Rachit S Mane** (`RachitSMane`, owner) | #8, #14, #17, #21, #23 (22; first draft: 19, superseded) | #1, #2, #6, #31, #32, #33, #34 | 17 | `client/src/styles.css`, `client/src/pages/`, canvas fixes (`7028ca0`), E2E `validation`, `responsive`, `compat`, `smoke`; SRS and final documents; release reports | #8 (`7028ca0`, `a5e57c7`), #14 (auth pages `5416880`, PR #2), #21 (`cc3e33c`) and #23 (`c08e63b`) are consistent. **#17: no own commit or PR found.** Also did most of the final work on #25 (`d0b4937`) and #26 (`9660c24`, `48051d8`, `85da387`, `12d7e34`), assigned to Prithvi and Pranav |
| **P Chinni Krishna Reddy** (`Chinni-Krishna-Reddy`) | #7, #11, #18, #22, #24 (31) | #4, #30 | 3 | `shared/src/syncClient.js`, `server/src/realtime/`, `server/tests/integration/` (multi-client, sync), `shared/tests/syncLifecycle.test.js`, README set-up; board size limit `boardEngine.js` (`2e50004`) | #18, #22 and #24 are consistent (`efb2a98`, `b3a8f75`). #7 is partly consistent (`efb2a98` engines/README; the structure came with the bulk commit). For #11 the core sync code came with the bulk commit, and `efb2a98`'s message does not name #11. PR #4 (FR-008) has no issue |
| **Pranav V Menon** (`pranav6126`) | #10, #13, #16, #19, #26 (29) | #3, #27, #28 | 9 (8 + 1 under a second e-mail) | E2E `whiteboard`, `boards`, `usability`; `server/tests/unit/`; STP sources; rename (`20097f4`), export (`0f7cad0`); release report 31-10 (`b86de85`); CI fix (`eeb07af`); bulk restore `7e1d2a2`, `69f63fe` | #10 (`b4e95a6`, `50243ef`), #13, #16 and #19 (`9578520`) are consistent. #26 is partial: the 31-10 validation is his, the final 02-11 validation is in Rachit's PR #33 |
| **Prithvi W** (`Prithviwar`) | #9, #12, #15, #20, #25 (29) | #5, #29 | 3 | `client/src/board/` (canvas fallback), `server/src/db/` (validator, integrity), `shared/src/errorCodes.js`, `server/src/rest/`, browser-matrix script; RTM and traceability docs (`1c72bee`); bulk restore `68b0e0c` | #9 (`1c72bee`, `702838b`) and #20 are consistent. #12 and #15 are partly consistent (`702838b` follow-ups; the core came with the bulk commits). #25 is partial: the browser matrix is his (`702838b`); the final fixes and runs are in Rachit's `d0b4937`/PR #33 |

Document roles (README): Rachit SRS lead; Krishna SAD lead; Pranav STP lead; Prithvi security and
traceability lead (RTM header: "Owner: Prithvi").

**Unclear ownership records:** (1) the original authorship of the restored baseline; (2) #17, which has no
commit or PR of its assignee; (3) #26 and #25, whose final work was done by someone other than the
assignee; (4) PR #4 (Krishna) implements FR-008 but belongs to no issue. Each member should be ready
to explain the code of their issues regardless of who committed it (`VIVA_PREPARATION.md` §3).

## 8. Pull Requests and reviews (unchanged since the first audit, re-verified)

| PR | Author | Merged by | Reviews / comments | Issues |
|---|---|---|---|---|
| #1, #2, #6 | RachitSMane | RachitSMane | none | documents; #14 (PR #2) |
| #3 | pranav6126 | pranav6126 | none | #10 |
| #4 | Chinni-Krishna-Reddy | Chinni-Krishna-Reddy | none | no issue (FR-008 board size limit) |
| #5 | Prithviwar | Prithviwar | none | #9 |
| #27 | pranav6126 | **RachitSMane** | none | baseline restore (157 files); cited for #7, #8, #11–#15, #17 |
| #28 | pranav6126 | **RachitSMane** | none | #10, #13, #16, #19 (merged with a failing `app-ci` check, repaired in #31) |
| #29 | Prithviwar | Prithviwar | none | #9, #12, #15, #20, #25 (includes baseline restore `68b0e0c`) |
| #30 | Chinni-Krishna-Reddy | **RachitSMane** | none | #7, #18, #22, #24 |
| #31, #32, #33, #34 | RachitSMane | RachitSMane | none | #8, #18 (#31); #21, #23 closed by #33; #25, #26 |

**0 of 14 PRs** has a review, review comment or conversation comment. Merges cannot be re-reviewed
honestly afterwards. For the remaining PRs (this branch, the video upload), the owner should review
and approve on GitHub before merging. Branch protection (one approval, required `app-ci` and
`docs-check`) is recommended (DECISIONS.md E4).

## 9. Manual steps for the team (none performed by Claude)

1. Grant read access and re-check the Project: `! gh auth refresh -s read:project`, then the two
   commands in §2. Report back the Project name and fields if you want this audit completed.
2. Estimation meeting: review the revised proposal in `AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16 (pending team and
   mentor approval; `STORY_POINT_ESTIMATION.md` is the superseded first draft), agree values, and enter them in a Project
   field labelled as retrospective (e.g. "Story Points (retrospective, <date>)"). Do not edit closed issues.
3. Review `ISSUE_REQUIREMENT_TRACEABILITY.md` §2 and enter the agreed IDs in an "SRS Requirements"
   Project field.
4. Decide the course-sprint mapping (§5.5) and record it in `docs/DECISIONS.md`.
5. Decide whether to add clearly labelled retrospective backlog items for uncovered requirements.
6. Prepare viva answers on: retrospective planning dates, no in-progress tracking, no PR reviews, and the
   bulk-restore commits.
