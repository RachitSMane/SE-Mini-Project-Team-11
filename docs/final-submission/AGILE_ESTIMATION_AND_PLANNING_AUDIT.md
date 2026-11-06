# Agile estimation and planning audit — Team 11

> **Status: retrospective audit and PROPOSAL, prepared 06-11-2026 by Claude (Claude Code) for team and
> mentor review.**
> No story points were assigned by the team during planning, and none exist on GitHub for any issue.
> Every point value in this file is a **retrospective estimate proposed on 06-11-2026**. It has **not**
> been agreed by the team. It must never be presented as an estimate the team originally assigned.
> Nothing on GitHub was created, edited, labelled, moved, reopened or closed during this audit.

Repository: `RachitSMane/SE-Mini-Project-Team-11` · Real-Time Collaborative Virtual Whiteboard ·
Software Engineering Mini Project, Team 11.

Companion documents (kept unchanged): [`AGILE_AND_GITHUB_AUDIT.md`](AGILE_AND_GITHUB_AUDIT.md),
[`STORY_POINT_ESTIMATION.md`](STORY_POINT_ESTIMATION.md) (earlier draft, see §5.3),
[`ISSUE_REQUIREMENT_TRACEABILITY.md`](ISSUE_REQUIREMENT_TRACEABILITY.md).

---

## 1. Executive summary

| Question | Finding |
|---|---|
| Issues inspected | **20** (#7–#26). These are all the repository's issues. Numbers 1–6 and 27–34 are pull requests. All 20 issues are **closed** (state reason "completed"). |
| GitHub Projects access | **Failed.** The token has the scopes `repo`, `read:org`, `workflow` and `gist`, but **not `read:project`**. Project fields, columns and views could not be read. The issue timelines do prove that a Project v2 exists and holds all 20 issues (§2.3). |
| Estimates on GitHub | **None found on any of the 20 issues.** Issue bodies, comments, labels and milestones contain no estimates. Project fields could not be verified. The repository owner reports that Sprints 2–4 on the board have no estimates. Sprint 1's Project cards remain **unverified**. |
| Proposed retrospective total | **108 points** over 20 issues (mean 5.4). **Superseded by the revised proposal in §16: 111** (#14 5 → 8), still subject to team and mentor approval |
| Point distribution | 13 × 1 · 8 × 4 · 5 × 9 · 3 × 6 · 2 × 0 · 1 × 0 (revised, §16.4: 13 × 1 · 8 × 5 · 5 × 8 · 3 × 6) |
| Sprint totals (proposed) | Sprint 1: **11** · Sprint 2: **35** · Sprint 3: **18** · Sprint 4: **44** (revised, §16.4: Sprint 2 **38**; total 111) |
| Assignee totals (proposed) | Chinni Krishna Reddy **31** · Pranav **29** · Prithvi **29** · Rachit **19** (revised, §16.4: Rachit **22**; total 111). Assigned points only. The separate equivalent workload figures are in `INDIVIDUAL_CONTRIBUTION_ASSESSMENT.md` |
| Assignees | Every issue has exactly one assignee, five per member. **Verified.** |
| Course mapping | Proposed: milestones 1 + 2 → academic Sprint 1 (46 pts); milestones 3 + 4 → academic Sprint 2 (62 pts); revised (§16.4): 49 and 62. **Requires team and mentor approval.** |
| Biggest planning gaps | no estimates; requirement IDs in only 1 issue body; issues and milestones created on 30-10-2026, after every planned sprint end date; 18 of 20 issues closed manually rather than by a PR; no recorded "In progress" status; #11 is a single 13-point item; Sprint 4 holds 41 % of the points |

The previous audit's preliminary findings were all **confirmed**: about 20 issues, one assignee each,
five per member, no estimates in issues, and no Projects read permission. Two refinements:
(a) all 20 issues are now closed, although the descriptions of milestones 2 and 4 still say
"In progress"; (b) the issues and milestones were entered retrospectively (§9.2).

---

## 2. Repository and access verification

### 2.1 Local clone

| Check | Result |
|---|---|
| Clones found | `C:\Users\Lenovo\Downloads\SE\SE-Mini-Project-Team-11` is a **git clone**. `C:\Users\Lenovo\Downloads\Share\SE-Mini-Project-Team-11` is a **plain copy without `.git`** and was not used. |
| Remote | `origin https://github.com/RachitSMane/SE-Mini-Project-Team-11.git` (fetch and push) |
| Branch / HEAD | `docs/final-submission` at `11a2e471ceb2c400287319303568fe2583c17fec` (05-11-2026). `origin/main` is at `64876d8` (merge of PR #34). |
| Working tree before this audit | modified: `AGILE_AND_GITHUB_AUDIT.md`, `CHECKLIST_AUDIT.md`, `README.md`, `SUBMISSION_CHECKLIST.md`, `VIVA_PREPARATION.md`. Untracked: `ISSUE_REQUIREMENT_TRACEABILITY.md`, `STORY_POINT_ESTIMATION.md` (all in `docs/final-submission/`). These earlier edits were **left as they were**. |
| Files written by this audit | this file only, plus one added row in `docs/final-submission/README.md` |

### 2.2 GitHub identity and repository

| Check | Result |
|---|---|
| `gh auth status` | logged in as `RachitSMane` (keyring), HTTPS |
| Token scopes | `gist`, `read:org`, `repo`, `workflow` |
| Repository | `RachitSMane/SE-Mini-Project-Team-11`, owner `RachitSMane` (user account), **public**, default branch `main` |
| Collaborators | `RachitSMane`, `Chinni-Krishna-Reddy`, `pranav6126`, `Prithviwar` |
| Data read | 20 issues with bodies, comments and full timelines; 4 milestones; 14 PRs; 20 labels; git history (51 commits on this branch, all remote branches); `blocked_by` and `sub_issues` endpoints (empty for #11, #21, #26) |

### 2.3 GitHub Projects

| Attempt | Result |
|---|---|
| `gh issue list --json projectItems` (one attempt, not retried) | refused: *"The 'id' field requires one of the following scopes: ['read:project'], but your token has only been granted the: ['gist', 'read:org', 'repo', 'workflow'] scopes."* |
| What the timeline API still shows | Every issue has **two** `added_to_project_v2` events at 30-10-2026 05:46:26 UTC (by `RachitSMane`). This means either two Projects or one duplicated event. Every issue also has an automatic status change on adding (05:46:27–28) and another on closing (02-11-2026), both by `github-project-automation[bot]`. **#21 and #23** have one extra automatic status change at 15:42:29, when PR #33 linked them. **No manual status change exists on any issue.** |
| Not verifiable | Project name and number; the columns or Status values; any Estimate, Story Points, Iteration, Priority, Start date or Due date field; views; whether Sprint 1 cards hold estimates |

**Missing permission: `read:project`** (read-only). To complete the Project part of this audit, run:

```
! gh auth refresh -h github.com -s read:project
gh project list --owner RachitSMane
gh project field-list <number> --owner RachitSMane
gh project item-list <number> --owner RachitSMane --format json --limit 100
```

These commands only read data. With their output, §9 can be completed for Project fields.

---

## 3. Complete issue inventory

Common facts verified for **all 20 issues**:
- Author: `RachitSMane`; created 30-10-2026; milestone set and assignee assigned on 30-10-2026.
- Closed by `RachitSMane` on 02-11-2026, state reason *completed*. Nothing was reopened.
- Each has a description, a task list and an "Acceptance Criteria" section with 3–4 criteria.
- Each has a completion or progress comment by `RachitSMane` dated 02-11-2026, citing PRs, commits, tests and CI run 41448416953.
- None has an estimate, a "blocked by" link or a sub-issue.

"Closed via": **PR** means a formal closing reference (`closedByPullRequestsReferences`). **manual** means a manual close. "x-ref" means a PR mentions the issue (timeline cross-reference). "cited" means a PR is named only in the completion comment.

| # | Title | State | Assignee | Labels | Milestone | Closed (UTC) via | Linked / cited PRs | Req. IDs recorded in issue | `## Sprint` in body | Estimate |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | Set up project structure and development environment | closed | Chinni-Krishna-Reddy | frontend, Backend, Priority -High | S1 | 13:07 manual | cited #27, #30 | — | yes | none |
| 8 | Implement whiteboard frontend and canvas interface | closed | RachitSMane | frontend, Priority -High, feature | S1 | 13:08 manual | x-ref #32; cited #27, #29, #31 | NFR-006 (comment) | yes | none |
| 9 | Implement shared error handling across frontend and backend | closed | Prithviwar | frontend, Backend, Integration, feature | S1 | 13:08 manual | x-ref #29; cited #5 | — | yes | none |
| 10 | Implement end-to-end testing for whiteboard workflows | closed | pranav6126 | frontend, Testing, Priority -High | S4 | 13:08 manual | cited #3, #28 | — | yes | none |
| 11 | Implement real-time board synchronization using Socket.IO | closed | Chinni-Krishna-Reddy | Backend, Integration, Priority -High, feature | S3 | 13:08 manual | cited #27, #30 | FR-025 (comment) | yes | none |
| 12 | Implement board sharing and access control | closed | Prithviwar | frontend, Backend, Priority -High, feature | S2 | 13:08 manual | x-ref #29; cited #27 | — | yes | none |
| 13 | Implement basic board management and persistence | closed | pranav6126 | frontend, Backend, Priority -High, feature | S2 | 13:08 manual | x-ref #34; cited #27, #28 | — | yes | none |
| 14 | Implement user authentication and session management | closed | RachitSMane | frontend, Backend, Priority -High, feature | S2 | 13:09 manual | cited #2, #27 | SEC-REQ-007 (comment, "blocked") | **no** | none |
| 15 | Implement drawing tools and canvas interactions | closed | Prithviwar | frontend, Priority -High, feature | S2 | 13:09 manual | x-ref #29; cited #27, #32 | — | **no** | none |
| 16 | Implement board export and download functionality | closed | pranav6126 | frontend, Priority -Medium, feature | S2 | 13:09 manual | x-ref #33, #34; cited #28 | — | **no** | none |
| 17 | Implement frontend integration with backend APIs | closed | RachitSMane | frontend, Integration, Priority -High, feature | S2 | 13:09 manual | cited #27, #29 | — | **no** | none |
| 18 | Implement WebSocket connection lifecycle and reconnection handling | closed | Chinni-Krishna-Reddy | Backend, Integration, Priority -Medium, feature | S3 | 13:10 manual | cited #30, #31 | — | **no** | none |
| 19 | Implement unit and integration tests for backend services | closed | pranav6126 | Backend, Testing, Priority -High | S4 | 13:10 manual | cited #28 | — | **no** | none |
| 20 | Implement database validation and data integrity checks | closed | Prithviwar | Database, Testing, Priority -Medium | S4 | 13:11 manual | x-ref #29 | — | **no** | none |
| 21 | Implement frontend validation and user feedback | closed | RachitSMane | frontend, Testing, Priority -Medium, feature | S4 | 15:53 **PR #33** | closes: #33; cited #27, #29, #31 | — | **no** | none |
| 22 | Test real-time synchronization across multiple clients | closed | Chinni-Krishna-Reddy | Integration, Testing, Priority -High | S4 | 13:11 manual | cited #30 | — | **no** | none |
| 23 | Implement responsive whiteboard layout | closed | RachitSMane | frontend, Priority -Medium, feature | S2 | 15:54 **PR #33** | closes: #33; cited #27, #32 | **NFR-006 (body)** | **no** | none |
| 24 | Implement board state consistency and synchronization validation | closed | Chinni-Krishna-Reddy | Backend, Integration, Testing, Priority -High | S4 | 13:11 manual | cited #30 | — | **no** | none |
| 25 | Perform cross-browser compatibility testing | closed | Prithviwar | frontend, Testing, Priority -Medium | S4 | 15:54 manual | x-ref #29, #33, #34 | — | **no** | none |
| 26 | Perform final system validation and release readiness checks | closed | pranav6126 | Integration, Testing, Priority -High | S4 | 15:54 manual | x-ref #33, #34 | SEC-REQ-007 (comment, "blocked") | **no** | none |

**Acceptance criteria and in-issue dependencies (verbatim summary):**

| # | Acceptance criteria (as written) | Dependencies written in the issue |
|---|---|---|
| 7 | structures established; dependencies configured; setup documented; both components start | — |
| 8 | interface reachable; canvas and toolbar displayed; basic drawing works; usable across supported sizes | comment: other sizes tracked in #23 |
| 9 | consistent error format; unexpected errors handled safely; meaningful feedback; no sensitive details exposed | — |
| 10 | critical workflows have tests; tests validate behaviour; defects documented; results available | comment: other browsers in #25 |
| 11 | many users join one board; updates broadcast; state synchronised; disconnections handled | comment: related #18, #22, #24 |
| 12 | users share boards; links give intended access; unauthorised users blocked; permissions correct | — |
| 13 | create and view; changes persist after refresh; rename and delete; invalid requests handled | — |
| 14 | register and log in; passwords stored securely; protected routes need auth; logout works | — |
| 15 | draw; erase; change brush size and colour; smooth interaction | — |
| 16 | export; image matches board; errors handled | — |
| 17 | frontend talks to APIs; responses displayed; errors handled; operations work end to end | — |
| 18 | connect; reconnect; failures handled; state consistent | — |
| 19 | core modules unit-tested; API responses correct; DB operations tested; tests pass consistently | — |
| 20 | invalid data rejected; constraints respected; CRUD keeps consistency; DB errors handled | — |
| 21 | invalid inputs handled; clear feedback; loading and error states shown; validation across components (+ 6-item checklist added 02-11) | body: related #9, #17; **required by #26** |
| 22 | changes reach other clients; concurrency consistent; reconnection safe; no major inconsistencies | — |
| 23 | layout adapts; canvas usable at supported sizes; tools reachable (+ measurable sizes added 02-11, per NFR-006) | body: related #8, #15; **required by #26** |
| 24 | consistent across clients; changes persisted; simultaneous updates lose no data | — |
| 25 | core works across supported browsers; canvas consistent; no critical browser issues (+ checklist added 02-11) | body: related #10; **required by #26** |
| 26 | workflows function; no critical defects; ready for demonstration (+ "Final checks" added 02-11) | body: **depends on #21, #23, #25** |

**Comments of note:**
- **#21, #23:** each has a progress comment, then a verification comment for PR #33. Their checklists are **unticked in the body** but shown as verified in the comment.
- **#25:** at 15:48 a comment says *"Keeping this issue open for the manual checks below"*. The issue was closed at 15:54 with no further note, and three manual checks stayed unticked.
- **#26:** all six "Final checks" and the "Remaining before closing" list are unticked. It was closed at 15:54.

---

## 4. Sprint-wise issue inventory

| Milestone | Planned dates (description text) | Due date field | Created | Closed (UTC) | Issues | Description status text |
|---|---|---|---|---|---|---|
| Sprint 1 – Project Foundation | 31-08 → 13-09-2026 | 13-09-2026 | 30-10-2026 03:39 | 02-11 13:31 | #7, #8, #9 | "Complete. 3 of 3" |
| Sprint 2 – Core Whiteboard | 14-09 → 27-09-2026 | 27-09-2026 | 30-10-2026 03:41 | 02-11 16:00 | #12, #13, #14, #15, #16, #17, #23 | **"In progress. 6 of 7 … open: #23"**, stale |
| Sprint 3 – Real-Time Collaboration | 28-09 → 11-10-2026 | 11-10-2026 | 30-10-2026 03:42 | 02-11 13:31 | #11, #18 | "Complete. 2 of 2" |
| Sprint 4 – Testing and Finalization | 12-10 → 25-10-2026 | 25-10-2026 | 30-10-2026 03:43 | 02-11 15:59 | #10, #19, #20, #21, #22, #24, #25, #26 | **"In progress. 5 of 8 … open: #21, #25, #26"**, stale |

All four milestones are closed with 0 open issues. 3 + 7 + 2 + 8 = 20, so every issue belongs to exactly one milestone.

---

## 5. Fibonacci estimates for every issue (master table)

Scale: **1** very small · **2** small · **3** moderate · **5** substantial · **8** complex,
multi-component or significant integration · **13** very large or highly uncertain, consider splitting.

| Issue | Title | Sprint | Assignee | Proposed Points | Rationale | Confidence |
|---|---|---|---|---:|---|---|
| #7 | Set up project structure and development environment | S1 | Chinni-Krishna-Reddy | 3 | Standard npm-workspace scaffold (client/server/shared), env template, dev scripts, setup docs; no design uncertainty | High |
| #8 | Implement whiteboard frontend and canvas interface | S1 | RachitSMane | 5 | Board page, canvas surface with DPR-aware sizing, toolbar shell, side panel, routing. Several components; drawing logic counted in #15 | Medium |
| #9 | Implement shared error handling across frontend and backend | S1 | Prithviwar | 3 | One shared error table, server mapping to `{code,message,requestId}`, client message mapping. Cross-cutting but small, clear contract | High |
| #10 | Implement end-to-end testing for whiteboard workflows | S4 | pranav6126 | 8 | Playwright infrastructure (global setup starting MongoDB and server), multi-context two-user tests, workflows across all features | Medium |
| #11 | Implement real-time board synchronization using Socket.IO | S3 | Chinni-Krishna-Reddy | 13 | Core of the product: rooms, server ordering, FIFO queue, persist-before-broadcast, optimistic client with ack and rollback, resync. Highest uncertainty. **Split recommended** | Medium |
| #12 | Implement board sharing and access control | S2 | Prithviwar | 8 | Share links (token, expiry, revocation), guest join, 3-role permission matrix on REST **and** Socket.IO, members, ownership transfer, dialogs; security-sensitive | Medium |
| #13 | Implement basic board management and persistence | S2 | pranav6126 | 5 | CRUD over REST with owner checks, MongoDB persistence, dashboard UI and dialogs, 400/404 handling, live rename | High |
| #14 | Implement user authentication and session management | S2 | RachitSMane | 5 | Register and login, bcrypt, JWT, auth middleware on REST and the socket handshake, logout revocation, two pages | High |
| #15 | Implement drawing tools and canvas interactions | S2 | Prithviwar | 8 | Pen, 3 shapes, line, text, select/move, eraser hit-testing, colour and width, clear, pointer handling. Largest client item. **Split worth considering** | Medium |
| #16 | Implement board export and download functionality | S2 | pranav6126 | 3 | Client-only: bounds, reuse renderer, scale large boards, refuse empty board, download. One module, clear algorithm | High |
| #17 | Implement frontend integration with backend APIs | S2 | RachitSMane | 3 | API wrapper, loading and error states, live updates; most wiring is already inside #12–#14. Generic scope | **Low** |
| #18 | Implement WebSocket connection lifecycle and reconnection handling | S3 | Chinni-Krishna-Reddy | 5 | Rejoin, retry after server disconnect, ack timeout, heartbeat, listener cleanup. Little code but async and timing-sensitive | Medium |
| #19 | Implement unit and integration tests for backend services | S4 | pranav6126 | 8 | Unit tests (services, validation, policy) plus integration tests against real MongoDB for API, DB, access and versions. Broad. **Split possible** | Medium |
| #20 | Implement database validation and data integrity checks | S4 | Prithviwar | 5 | Schema limits, MongoDB `$jsonSchema` validator, start-up orphan cleanup, error mapping, 13-test integrity suite. Implementation, not only tests | High |
| #21 | Implement frontend validation and user feedback | S4 | RachitSMane | 3 | Client-side rules on 4 forms mirroring server rules, readable messages, busy states, 6 E2E tests | High |
| #22 | Test real-time synchronization across multiple clients | S4 | Chinni-Krishna-Reddy | 5 | Five-client scripted harness, race scenarios, reconnection, convergence vs fresh join and MongoDB. Concurrency → high complexity | Medium |
| #23 | Implement responsive whiteboard layout | S2 | RachitSMane | 3 | CSS breakpoints, ResizeObserver canvas, top-bar fix below 1024 px, 3 viewport E2E tests | Medium |
| #24 | Implement board state consistency and synchronization validation | S4 | Chinni-Krishna-Reddy | 5 | Validation of incoming sync events with repair by fresh join, client and storage consistency checks; overlaps #22 | Medium |
| #25 | Perform cross-browser compatibility testing | S4 | Prithviwar | 5 | 4-browser matrix script, WebKit project, 3 compatibility fixes, driver diagnosis, manual checks; unknown defects in advance | Medium |
| #26 | Perform final system validation and release readiness checks | S4 | pranav6126 | 5 | Full suite on release candidate, smoke test, dependency security fix, defect review, release readiness report | Medium |
| | **Total** | | | **108** | | |

### 5.1 Distribution

| Points | Count | Issues | Points subtotal |
|---:|---:|---|---:|
| 1 | 0 | — | 0 |
| 2 | 0 | — | 0 |
| 3 | 6 | #7, #9, #16, #17, #21, #23 | 18 |
| 5 | 9 | #8, #13, #14, #18, #20, #22, #24, #25, #26 | 45 |
| 8 | 4 | #10, #12, #15, #19 | 32 |
| 13 | 1 | #11 | 13 |
| **Total** | **20** | | **108** |

No issue is too large for 13 points. #11 sits at the top of the scale and is recommended for
decomposition (§6). The absence of 1 and 2 values reflects the backlog: every issue bundles 4–6 tasks
with tests, so none is trivially small.

### 5.2 Complexity, confidence and involvement summary

| Issue | Complexity | Layers | Components (approx.) | DB | Real-time | Confidence |
|---|---|---|---|---|---|---|
| #7 | Low | shared/system | 4 (workspaces, scripts, env, docs) | setup only | — | High |
| #8 | Medium | frontend | 5 (BoardPage, Canvas, Toolbar, SidePanel, router) | — | displays state | Medium |
| #9 | Medium | full stack + shared | 3 | maps DB errors | — | High |
| #10 | Medium | test (E2E, full stack) | 3 spec files + global setup | real MongoDB | multi-context | Medium |
| #11 | Very High | backend + shared client | 4 (realtimeServer, boardEngine, boardQueue, syncClient) | persist-before-broadcast | **core** | Medium |
| #12 | High | full stack, security | 4 (accessService, policy, REST routes, OwnerDialogs) | links, members | revocation propagation | Medium |
| #13 | Medium | full stack | 3 (REST, models, Dashboard) | CRUD | live rename | High |
| #14 | Medium | full stack, security | 3 (authService, middleware, Auth pages) | users, revoked tokens | socket handshake | High |
| #15 | High | frontend | 3 (Canvas, geometry, Toolbar) | — | ops sent through #11 | Medium |
| #16 | Low | frontend | 1 (exportImage) | — | — | High |
| #17 | Low | frontend | api.js + pages | — | live updates | Low |
| #18 | High | shared client + backend | 2 (syncClient, realtimeServer) | — | **core** | Medium |
| #19 | Medium | test (backend) | 4 unit + ~9 integration suites | real MongoDB | partly | Medium |
| #20 | Medium | backend + DB | 3 (models, validator, integrity) | **core** | — | High |
| #21 | Low | frontend | 4 forms | — | — | High |
| #22 | High | test (integration) | 1 harness, 17 tests | compared with DB | **core** | Medium |
| #23 | Medium | frontend | styles.css, Canvas | — | — | Medium |
| #24 | High | shared client + test | syncClient validation, tests | compared with DB | **core** | Medium |
| #25 | Medium | test + small fixes | matrix script, compat fixes | — | TC-009 | Medium |
| #26 | Medium | process / test | all suites, report, dependency update | — | — | Medium |

### 5.3 Relationship to the earlier draft

An earlier, **uncommitted** draft `STORY_POINT_ESTIMATION.md` was found in the folder. It was also
prepared by Claude, on 05-11-2026. This audit re-derived each value from the current GitHub data and
code, and reached the **same 20 values (108 points)**. Because both were produced by the same assistant,
this is **consistency, not independent confirmation**. Only the team's own estimation session can
validate the numbers. The earlier file was not modified.

### 5.4 Arithmetic reconciliation (checked 06-11-2026)

All figures below were recomputed by script from the master table in §5.

**Verified facts:**
- The table has 20 rows (#7–#26), 20 unique, with no duplicates and no omissions.
- Each issue's milestone and assignee match the GitHub inventory in §3.

**Retrospective proposals:** the point values themselves.

**Points by milestone and assignee:**

| Assignee | M1 Sprint 1 | M2 Sprint 2 | M3 Sprint 3 | M4 Sprint 4 | Total |
|---|---:|---:|---:|---:|---:|
| Chinni-Krishna-Reddy | 3 | 0 | 18 | 10 | 31 |
| pranav6126 | 0 | 8 | 0 | 21 | 29 |
| Prithviwar | 3 | 16 | 0 | 10 | 29 |
| RachitSMane | 5 | 11 | 0 | 3 | 19 |
| **Total** | **11** | **35** | **18** | **44** | **108** |

| Check | Computation | Result |
|---|---|---|
| Fibonacci distribution | 3×6 + 5×9 + 8×4 + 13×1 = 18 + 45 + 32 + 13 (20 issues) | **108** ✓ |
| Milestone totals | 11 + 35 + 18 + 44 | **108** ✓ |
| Academic mapping, option A (§12, a proposal) | (M1 + M2) 11 + 35 = **46**; (M3 + M4) 18 + 44 = **62**; 46 + 62 | **108** ✓ |
| Assignee totals | 31 + 29 + 29 + 19 | **108** ✓ |

Milestone 2 is **35** points; the 44-point milestone is **Sprint 4**. Reading Sprint 2 as 44 would give
11 + 44 = 55 for academic Sprint 1, but that pairs milestone 1 with milestone 4.

---

## 6. Detailed estimate rationale

Method: each issue is sized **relative to two reference stories**: #16 Export (3) and #9 Shared errors (3).
Each estimate reads the issue's tasks and acceptance criteria together with the implementation and tests
its completion comment cites, verified in the code. The following are **not** used: time taken, commit
counts, lines changed or PR size. Most code arrived in one snapshot commit (`7e1d2a2`, +23 390 lines,
124 files), so PR size says nothing about effort. Overlapping work is counted **once**, in the issue
whose acceptance criteria own it. Remaining manual checks are noted as risks, not added to sizes.

#### #7 — Set up project structure and development environment — **3** (Low complexity, High confidence)
- **Work:** npm workspaces `client/` (React + Vite), `server/` (Express, Socket.IO, MongoDB), `shared/`; lockfile; `server/.env.example`; `scripts/dev.js`, `scripts/start-mongo.js`; README *Prerequisites/Setup/Run/Troubleshooting*; Node engine range.
- **Dependencies:** none. It is the prerequisite of every other issue (blocking).
- **Risks:** low. CI workflows are credited in the completion note but are not in the tasks, so they are not counted.
- **Evidence:** issue body and comment; `7e1d2a2` (#27), `efb2a98` (#30, README and `package.json`).

#### #8 — Implement whiteboard frontend and canvas interface — **5** (Medium, Medium)
- **Work:** `BoardPage.jsx` (492 lines), `Canvas.jsx` surface and sizing, `Toolbar.jsx` shell, `SidePanel.jsx`, `router.jsx`/`App.jsx`. Follow-ups: fractional DPR and multi-pointer (`7028ca0`), merge repair (`a5e57c7`).
- **Dependencies:** blocking: #7. Related: #15 (drawing logic), #23 (sizes).
- **Risks:** boundary with #15 is blurred ("toolbar and drawing controls", "basic drawing"). If the team moves drawing into #8, it becomes 8 and #15 becomes 5. The 125 % scaling and touch checks were not done manually.
- **Evidence:** comment; PR #27, #29, #31, #32; E2E TC-001–004, TC-015/016, `usability.spec.cjs`.

#### #9 — Implement shared error handling across frontend and backend — **3** (Medium, High) — *reference story*
- **Work:** `shared/src/errorCodes.js` (88 lines), `server/src/errors.js` (81 lines, `toAppError()` incl. Mongo errors), `ApiError`/`describeError()` in `client/src/api.js`. Tests in `errorCodes.test.js` (17) and the "internal details never reach the client" integration test.
- **Dependencies:** blocking: #7. It enables #17, #21 and #20's error mapping.
- **Risks:** low. The contract is small and well defined.
- **Evidence:** `1c72bee` (#5), `702838b` (#29).

#### #10 — Implement end-to-end testing for whiteboard workflows — **8** (Medium, Medium)
- **Work:** Playwright config and `globalSetup.cjs` that starts MongoDB and the server; helpers; multi-context tests for two or more users; `whiteboard.spec.cjs` (11), `boards.spec.cjs` (6), `usability.spec.cjs` (1). Covers registration, boards, drawing sync, sharing, guest join, roles, restore, clear, reconnection, invalid URLs and export. Defect recording in the release report.
- **Dependencies:** needs the feature issues it tests (#12–#16, #11, #18), so it is effectively blocked by them. Related: #25 (browsers).
- **Risks:** "critical workflows" is open-ended. Tests added later for #21, #23, #25 and #26 (validation, responsive, compat, smoke) are counted there. Multi-client E2E tests are flaky by nature (WebKit timeouts recorded).
- **Evidence:** `b4e95a6` (#3), `50243ef` (#28), `RELEASE_READINESS_2026-10-31.md`.

#### #11 — Implement real-time board synchronization using Socket.IO — **13** (Very High, Medium) — **split recommended**
- **Work:** `realtimeServer.js` (322 lines: `/board` namespace, per-board rooms, `board:join`, `op:applied`), `boardEngine.js` (sequence numbers, per-property last-write-wins), `boardQueue.js` (per-board FIFO), `boardStore.js` (persist before broadcast), `shared/src/syncClient.js` (405 lines: optimistic updates, acknowledgements, rollback, gap repair, full resync). Tests: `sync.test.js` (11), `syncClient.test.js` (10).
- **Dependencies:** blocking: #7, #14 (socket authentication), #13 (boards to join). It is a blocking prerequisite for #18, #22 and #24, and for #12's live revocation.
- **Risks:** the highest technical uncertainty in the project (ordering, concurrency, convergence). Its tasks duplicate #18 (reconnection) and #22 (multi-user verification); those points are counted there. The core code arrived in the snapshot commit, so its history is not visible in git.
- **Decomposition proposal (for future practice, not a rewrite of history):** (a) rooms, join and broadcast, **3**; (b) server ordering, queue and persistence, **5**; (c) client optimistic sync with ack and rollback, **5**; (d) gap repair and full resync, **3**. Total 16, which is above 13: splitting usually exposes hidden work.
- **Evidence:** comment; PR #27, #30; `efb2a98`.

#### #12 — Implement board sharing and access control — **8** (High, Medium)
- **Work:** `accessService.js` (335 lines), `policy.js` (3-role matrix), share-link, member and ownership-transfer endpoints in `rest/app.js`, `OwnerDialogs.jsx`. Enforcement on REST (403/404) and on crafted real-time messages. Link expiry and revocation, guest join. Tests: `access.test.js` (17), `policy.test.js` (5), E2E TC-017/103.
- **Dependencies:** blocking: #13 (boards), #14 (identities). Live propagation of revocation depends on #11 (Sprint 3), a **forward dependency** from Sprint 2 to Sprint 3.
- **Risks:** the issue text is minimal ("basic access permissions"). From the description alone it reads as a 5. The 8 reflects the delivered scope. It is security-sensitive (SEC-REQ-003/004). Possible split: share links and guest access (5) + roles, members and ownership (5).
- **Evidence:** comment; PR #27, #29 (`702838b`).

#### #13 — Implement basic board management and persistence — **5** (Medium, High)
- **Work:** create, list and delete over REST with Owner checks; rename via `PATCH /api/v1/boards/:boardId` and a dashboard dialog (`20097f4`); `board:renamed` live update; persistence in MongoDB; 400/404 handling; invalid-URL message.
- **Dependencies:** blocking: #7, #14. It is a prerequisite for #12, #16 and #11.
- **Risks:** rename is outside the SRS baseline (DECISIONS.md E6), a scope question rather than a size question.
- **Evidence:** PR #27, #28; `boards.test.js` (11), `boards.spec.cjs` (6).

#### #14 — Implement user authentication and session management — **5** (Medium, High)
- **Work:** `authService.js` (168 lines: bcrypt, JWT, revoked-token list); `authenticate()` on REST and on the Socket.IO handshake; `Auth.jsx` and `Join.jsx` (`5416880`); logout revocation. Tests: `auth.test.js` (7), TC-105/106.
- **Dependencies:** blocking: #7. It is a prerequisite for #12, #13 and #11.
- **Risks:** the implementation also includes a login rate limiter and guest tokens, which are not in the issue's tasks. Counting them would justify 8. HTTPS deployment (SEC-REQ-007, TC-109) is blocked and outside the acceptance criteria.
- **Evidence:** comment; PR #2, #27.

#### #15 — Implement drawing tools and canvas interactions — **8** (High, Medium)
- **Work:** pen, rectangle, ellipse, line, text, select/move/restyle, eraser with hit-testing (`geometry.js`, 177 lines), colour swatches, picker and width 1–20 (`Toolbar.jsx`), clear. The `newObjectId()` fallback for plain HTTP and the redraw reduction from 107 to 7 per 100 keystrokes are in `702838b`. Per-pointer gestures are in `7028ca0`.
- **Dependencies:** blocking: #8 (canvas surface). Related: #11 (operations are synchronised), #16 (shared renderer).
- **Risks:** the task list names only freehand, eraser, size/colour and clear. Shapes, text and select (FR-003–005) have no separate issue. Split proposal: freehand, eraser and clear (3–5) + shapes, text and select (5).
- **Evidence:** PR #27, #29, #32; `geometry.test.js` (10); E2E TC-001–005.

#### #16 — Implement board export and download functionality — **3** (Low, High) — *reference story*
- **Work:** `exportImage.js` (110 lines): bounds, negative coordinates, scaling of very large boards, empty-board refusal, `<title>-<date>.png` download; button disabled while disconnected. Tests: `exportImage.test.js` (6), E2E.
- **Dependencies:** related: #15 (reuses the renderer). Not blocking.
- **Risks:** low. It is outside the v1.0 SRS baseline (E6, scope only).
- **Evidence:** `0f7cad0` (#28).

#### #17 — Implement frontend integration with backend APIs — **3** (Low, **Low**)
- **Work:** `client/src/api.js` (54 lines: `api()`, `ApiError`, `describeError()`), loading and busy states, connecting state and disconnected banner, toasts, live rename, role and revocation updates.
- **Dependencies:** blocking: #9 (error contract), #13, #14. Overlaps #21.
- **Risks:** a cross-cutting "integration" story with no separable deliverable. Most wiring is inside the feature issues. It could reasonably be 2. Recommendation: in future, fold integration into each feature's definition of done.
- **Evidence:** comment; PR #27, #29 (`702838b` changed `api.js`, `Dashboard.jsx`).

#### #18 — Implement WebSocket connection lifecycle and reconnection handling — **5** (High, Medium)
- **Work:** in `syncClient.js`: rejoin on every reconnection, one retry after a server-initiated disconnect, forced reconnect after a missing ack (10 s), `close()` removes listeners. Heartbeat detection within 20 s. `BoardPage.jsx` cleanup on unmount (corrected in #31). Tests: `syncLifecycle.test.js`, E2E TC-009.
- **Dependencies:** blocking: #11.
- **Risks:** timing-sensitive asynchronous code (the heartbeat test needed a fix, `b3a8f75`). It overlaps #11's "handle disconnections" task.
- **Evidence:** `efb2a98`, `b3a8f75` (#30); `a5e57c7` (#31).

#### #19 — Implement unit and integration tests for backend services — **8** (Medium, Medium)
- **Work:** unit `services.test.js` (14), `validation.test.js` (10), `policy.test.js` (5), plus the existing `config.test.js`. Integration suites against real MongoDB covering API responses and the error contract, DB, validation, access, versions, recovery and sync. 110 unit and 100 integration tests pass in CI overall.
- **Dependencies:** needs the services it tests (#12, #13, #14, #11).
- **Risks:** a broad "all backend tests" item. Some integration suites came from the snapshot or from #20, #22 and #24 and are counted there. Split proposal: unit tests (3) + API/DB integration tests (5).
- **Evidence:** `9578520` (#28); `RELEASE_READINESS_2026-10-31.md` (three consecutive runs).

#### #20 — Implement database validation and data integrity checks — **5** (Medium, High)
- **Work:** field limits in `models.js` (254 lines) from shared constants; a MongoDB `$jsonSchema` validator on `boardObjects`; `integrity.js` start-up orphan cleanup; DB errors mapped by `toAppError`. Tests: `dbIntegrity.test.js` (13).
- **Dependencies:** blocking: #13 (models). Related: #9.
- **Risks:** labelled "Testing", but it contains implementation. That is a labelling issue, not a size issue.
- **Evidence:** `702838b` (#29).

#### #21 — Implement frontend validation and user feedback — **3** (Low, High)
- **Work:** client-side rules on register, login, guest join and dashboard; stroke-width rule; readable errors via `describeError()` on auth and join pages (`cc3e33c`); busy states. Tests: `validation.spec.cjs` (6 E2E).
- **Dependencies:** related: #9, #17. It is a **prerequisite of #26** (stated).
- **Risks:** low. The rules mirror existing server validation.
- **Evidence:** PR #33 (closing reference).

#### #22 — Test real-time synchronization across multiple clients — **5** (High, Medium)
- **Work:** `multiClient.test.js` (17 tests): five scripted clients (Owner, 2 Editors, Viewer, guest Editor), bursts with contiguous sequence numbers, same-object conflicts, delete racing with updates, late join, drops, server disconnects, final state compared with a fresh join and MongoDB.
- **Dependencies:** blocking: #11; also #18 for the reconnection scenarios.
- **Risks:** "identify and fix inconsistencies" is open-ended (fixes belong to #11). Concurrency tests can be flaky.
- **Evidence:** `efb2a98` (#30).

#### #23 — Implement responsive whiteboard layout — **3** (Medium, Medium)
- **Work:** breakpoints in `styles.css` (1360–480 px); `ResizeObserver` canvas; icon buttons below 1024 px (`c08e63b`); `responsive.spec.cjs` (3 E2E: 6 viewports, resize sequence, dialogs).
- **Dependencies:** blocking: #8. Related: #15. It is a **prerequisite of #26**.
- **Risks:** the acceptance criteria were not measurable until sizes were added on 02-11-2026. Widths below 1280 px are beyond NFR-006.
- **Evidence:** PR #33 (closing reference), PR #32.

#### #24 — Implement board state consistency and synchronization validation — **5** (High, Medium)
- **Work:** `syncClient.js` validation of incoming events (other board, malformed, duplicate, diverged) with repair by fresh join; a malformed state is never installed (9 tests in `syncLifecycle.test.js`); consistency of clients and storage (`multiClient`, `dbIntegrity`).
- **Dependencies:** blocking: #11. Strong overlap with #22.
- **Risks:** #22 and #24 could have been one 8-point item. The separate total (10) slightly overstates it if the team sees them as one.
- **Evidence:** `efb2a98` (#30).

#### #25 — Perform cross-browser compatibility testing — **5** (Medium, Medium)
- **Work:** Playwright WebKit project and `scripts/e2e-browsers.js`, and the 31-10 record (`702838b`, Prithvi). Fixes (`d0b4937`): restore over plain HTTP, forced-colour swatches, lost pointer capture, plus DPR and touch regression tests (`compat.spec.cjs`, 7). Runs in Chromium, Chrome, Edge, Playwright Firefox and WebKit, and stable Firefox 159 with driver diagnosis.
- **Dependencies:** needs #10 (suite), #8 and #15. It is a **prerequisite of #26**.
- **Risks:** browser defects are unknown in advance. Manual checks (installed Firefox behaviours, Safari, physical devices) were **never recorded as done** before closing.
- **Evidence:** PR #29, #33; `RELEASE_READINESS_2026-11-02.md` §4.

#### #26 — Perform final system validation and release readiness checks — **5** (Medium, Medium)
- **Work:** 31-10 validation report (`b86de85`); final run on the release candidate `48051d8` (lint, 210 Jest tests, build, 31 E2E in 5 browsers, traceability check), `smoke.spec.cjs`, a runtime dependency security fix (`85da387`), defect review, release readiness report (`9660c24`, `48051d8`).
- **Dependencies:** **blocked by #21, #23, #25** (stated); effectively by every feature issue.
- **Risks:** "review and resolve critical defects" is open-ended. All final checks are unticked in the body.
- **Evidence:** PR #28, #33; `docs/evidence/2026-11-02-final-validation/`.

---

## 7. Dependency analysis

### 7.1 Blocking dependencies (work could not finish without the predecessor)

| Successor | Blocked by | Source | Cross-sprint? |
|---|---|---|---|
| all | #7 | inferred (scaffold) | — |
| #8 | #7 | inferred | — |
| #13, #14 | #7 | inferred | S1 → S2, backward (fine) |
| #12 | #13, #14 | inferred (needs boards and identities) | — |
| #12 (live revocation) | #11 | inferred | **S2 → S3, forward** |
| #15 | #8 | inferred (canvas surface) | S1 → S2 |
| #11 | #13, #14 | inferred (boards; socket auth) | S2 → S3 |
| #18, #22, #24 | #11 | stated as "related" in #11; inferred as blocking from the code | S3 → S3/S4 |
| #22 (reconnect scenarios) | #18 | inferred | S3 → S4 |
| #20 | #13 | inferred (models) | S2 → S4 |
| #17 | #9, #13, #14 | inferred | S1/S2 → S2 |
| #23 | #8 | stated ("related") + inferred | S1 → S2 |
| #10, #19 | the features they test | inferred | → S4 |
| #25 | #10 | stated ("related") + inferred | — |
| **#26** | **#21, #23, #25** | **stated: "Depends on #21, #23 and #25"** | #23 is S2: the S4 closing item waited on an S2 item (#23 was the last S2 issue closed) |

### 7.2 Ordinary relationships and overlaps (not blocking)

| Issues | Nature |
|---|---|
| #8 / #15 | shared toolbar and drawing boundary |
| #8 / #23 | "responsive and usable" in both |
| #11 / #18 | reconnection appears in both task lists |
| #11 / #22 / #24 | implementation versus two overlapping verification items |
| #9 / #17 / #21 | error and feedback behaviour spread over three issues |
| #15 / #16 | export reuses the renderer |
| #10 / #21, #23, #25, #26 | later E2E specs extend the suite |

### 7.3 Parallelism

- **Could run in parallel after #7:** #9, #14, #8 (then #13 after #14). #16 and #23 are independent of the server.
- **Critical path:** #7 → #14 → #13 → #11 → #18 → #22/#24 → #26. It runs through Krishna's issues (#11, #18, #22, #24) for most of its length, which made one member a bottleneck.
- **Test items** #10, #19, #20 could have started much earlier, alongside features (test-first or test-along), instead of being placed in Sprint 4.
- **No formal links:** GitHub "blocked by" relationships and sub-issues are unused (`blocked_by` and `sub_issues` endpoints return 0). All dependencies are prose.

---

## 8. Assignee and contribution analysis

**Assignment and implementation are different things and need not match.** Neither commit counts nor
points measure individual effort. **Key limitation:** most application code reached GitHub in
**snapshot commits** of a shared, previously uncommitted team working tree:
- `7e1d2a2`: *"restore missing application files from team working-tree snapshot"*, committed by Pranav, PR #27, 124 files, +23 390 lines;
- `68b0e0c`: *"restore existing implementation baseline from stash (D-16)"*, committed by Prithvi, PR #29.

Git records **who committed** those snapshots, **not who wrote the code**. For code that arrived that way, git cannot establish who implemented an issue.

| Issue | Assignee | Commits / PRs touching the issue (author) | Assessment |
|---|---|---|---|
| #7 | Krishna | structure in snapshot `7e1d2a2` (Pranav, committer); `efb2a98` engines, README (Krishna) | **partly consistent**; original scaffold authorship not recorded |
| #8 | Rachit | snapshot (#27); `702838b` (Prithvi); `a5e57c7`, `7028ca0` (Rachit) | consistent for follow-ups; base from snapshot |
| #9 | Prithvi | `1c72bee` (#5), `702838b` (#29), both Prithvi | **consistent** |
| #10 | Pranav | `b4e95a6` (#3), `50243ef` (#28), both Pranav | **consistent** |
| #11 | Krishna | core in snapshot `7e1d2a2`; `efb2a98` tests (Krishna); `efb2a98`'s message names #7 #18 #22 #24, not #11 | **unclear**: core sync authorship not visible in git |
| #12 | Prithvi | core in snapshot; `702838b` dialog messages (Prithvi) | partly consistent; core authorship not recorded |
| #13 | Pranav | snapshot; `20097f4` rename (Pranav) | **consistent** |
| #14 | Rachit | `5416880` auth pages (Rachit, PR #2); server auth in snapshot | consistent for UI; server part from snapshot |
| #15 | Prithvi | core in snapshot; `702838b` (Prithvi); `7028ca0` pointer handling (Rachit) | partly consistent; shared follow-up |
| #16 | Pranav | `0f7cad0` (Pranav) | **consistent** |
| #17 | Rachit | `api.js` in snapshot; `702838b` changed `api.js`, `Dashboard.jsx` (Prithvi). **No commit or PR by the assignee names #17** | **discrepancy**: no assignee-attributable change found |
| #18 | Krishna | `efb2a98`, `b3a8f75` (Krishna); `a5e57c7` cleanup fix (Rachit) | **consistent** |
| #19 | Pranav | `9578520` (Pranav) | **consistent** |
| #20 | Prithvi | `702838b` (Prithvi) | **consistent** |
| #21 | Rachit | `cc3e33c` (Rachit, PR #33) | **consistent** |
| #22 | Krishna | `efb2a98` (Krishna) | **consistent** |
| #23 | Rachit | `c08e63b` (Rachit, PR #33) | **consistent** |
| #24 | Krishna | `efb2a98` (Krishna) | **consistent** |
| #25 | Prithvi | browser matrix and first record in `702838b` (Prithvi); fixes `d0b4937` and final runs in PR #33 (Rachit) | **discrepancy**: final work done by a non-assignee |
| #26 | Pranav | `b86de85` 31-10 report (Pranav); final validation `9660c24`, `48051d8`, `85da387`, `12d7e34` (Rachit) | **discrepancy**: final work done by a non-assignee |
| — (no issue) | — | PR #4 `2e50004` board size limit, FR-008 (Krishna) | work with **no backlog item** |

**How to explain the discrepancies (not a recommendation to reassign):** on a closed historical backlog,
the assignee shows **who was responsible**, not who typed every line. Shared follow-ups after a
merge-heavy integration week (PRs #27–#33, 01–02-11-2026) are normal. The honest record is:
- #25 and #26 were *owned* by Prithvi and Pranav; Rachit completed the final runs.
- #17 has no separable deliverable (§6).
- The snapshot authorship should be described verbally by the team.

Every member should be able to explain the code of their assigned issues in the viva.

**Pull requests (verified 06-11-2026):**
- All 14 PRs are merged; **0** have a review or a conversation comment.
- Teammates self-merged #3 (pranav6126), #4 (Chinni-Krishna-Reddy), #5 and #29 (Prithviwar).
- `RachitSMane` merged the rest, including teammates' PRs #27, #28 and #30.

---

## 9. Missing Agile fields

"Unverifiable" = may exist on the Project, but cannot be read without `read:project`.

| Field | Issues affected | Repository state | Project state |
|---|---|---|---|
| Story-point estimate | **20 of 20** | none in bodies, comments, labels or milestones (keyword search, 0 hits) | unverifiable. Owner reports none for Sprints 2–4; **Sprint 1 cards not checked by anyone yet** |
| Assignee | 0 missing | one assignee each, 5 per member | — |
| Priority | **#9** (no priority label) | the other 19 have a `Priority -High/-Medium` label; `Priority -Low` is never used | Priority field unverifiable |
| Status | 0 missing as open/closed | all closed. Only automatic status changes (add → default column, close → done); **no "In progress" stage recorded**; #21 and #23 had one extra automatic change on PR link | column values unverifiable |
| Milestone / sprint | 0 missing | all 20 in a milestone. **13 of 20 bodies lack the `## Sprint` section** (#14–#26); #7–#13 have it | Iteration field unverifiable |
| Start and due dates | 20 of 20 at issue level | none on issues; milestones have a due date, and start dates only in description text | date fields unverifiable |
| Acceptance criteria | 0 missing | present on all 20. **Generic** on #12 ("permissions work correctly") and #17 ("communicates successfully"); measurable only after 02-11 edits on #21, #23, #25, #26 | — |
| Requirement traceability | **19 of 20 bodies** | only #23 names an ID in its body (NFR-006). Comments name NFR-006 (#8), FR-025 (#11) and SEC-REQ-007 (#14, #26). Proposed mapping: `ISSUE_REQUIREMENT_TRACEABILITY.md` §2 | unverifiable |
| Clear description | weak: #12, #15 (scope narrower than delivered), #17 (generic) | all have description and tasks; #12–#17 use plain bullets, not checkboxes | — |
| Completion evidence | weak: **#25, #26** | all 20 have a completion comment. #25 closed 6 min after "keeping this issue open" with three manual checks unticked; #26 closed with all final checks unticked | — |
| Formal PR link | **18 of 20** | only #21 and #23 closed by a PR (#33); the rest closed manually, PRs cited in comments | — |
| Formal dependencies | 20 of 20 | prose only; no blocked-by or sub-issues | — |
| Backlog coverage | n/a | no issue for version history (FR-030–035), FR-008, FR-027, NFR-001–003/005, SEC-REQ-006/008 (earlier traceability report §3.1) | — |

### 9.1 Milestone-level gaps

- Descriptions of closed milestones 2 and 4 still say **"In progress"** (stale).
- No milestone records capacity, velocity or point totals.

### 9.2 Retrospective entry of the plan

All four milestones were created on **30-10-2026 03:39–03:43 UTC**. All 20 issues were created on
30-10-2026 04:02–05:38 UTC and added to the Project at 05:46. The planned sprint windows were
31-08 → 25-10-2026, so **every planned sprint had already ended** when its milestone and issues were
created. The earliest repository commit is `22e73fb` (10-10-2026). The backlog and sprint structure on
GitHub is therefore a **retrospective record of planning**, not live sprint tracking. The planned dates
cannot be verified from the repository. The team should say this openly rather than let the dates
suggest otherwise.

---

## 10. Sprint-wise point totals (proposed)

| Milestone | Objective (from milestone) | Issues | Points | Share | Major dependencies | Evidence of completion | Planning gaps |
|---|---|---|---:|---:|---|---|---|
| **Sprint 1 – Project Foundation** | repository structure, environment, initial application | #7 (3), #8 (5), #9 (3) | **11** | 10 % | #7 blocks everything; #8 → #23 (S2) | completion comments; PR #5, #27, #29–#32; CI run 41448416953 | no estimates; #8 is a full frontend, more than "foundation"; Project cards unverified |
| **Sprint 2 – Core Whiteboard** | canvas interactions, drawing tools, board operations | #12 (8), #13 (5), #14 (5), #15 (8), #16 (3), #17 (3), #23 (3) | **35** | 32 % | #14 → #13 → #12; #12 → #11 (S3, forward); #8 (S1) → #15, #23 | PR #2, #27, #28, #29, #32, #33 | auth (#14) and sharing (#12) are not "whiteboard" functions; #23 closed last (02-11 15:54); description stale |
| **Sprint 3 – Real-Time Collaboration** | Socket.IO, synchronized drawing, multi-user | #11 (13), #18 (5) | **18** | 17 % | #11 blocks #18, #22, #24; needs #13, #14 | PR #27, #30, #31; sync, multiClient, lifecycle suites | one 13-point item = planning risk; only one member assigned |
| **Sprint 4 – Testing and Finalization** | integration, testing, bug fixes, release prep | #10 (8), #19 (8), #20 (5), #21 (3), #22 (5), #24 (5), #25 (5), #26 (5) | **44** | 41 % | #26 ← #21, #23 (S2), #25; #22, #24 ← #11 | PR #3, #28, #29, #30, #33; release reports 31-10 and 02-11 | test-last pattern (36 of 44 points are testing); #25 and #26 closed with unticked checks; description stale |
| **Total** | | 20 | **108** | 100 % | | | |

With equal two-week sprints, a load ranging from 11 to 44 points shows that the milestones were grouped
**by theme, not by capacity**. A team's real capacity does not vary fourfold between sprints.

---

## 11. Assignee-wise point distribution (proposed)

| Assignee | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | **Total** | Issues |
|---|---:|---:|---:|---:|---:|---|
| Chinni-Krishna-Reddy | 3 (#7) | 0 | 18 (#11, #18) | 10 (#22, #24) | **31** | 5 |
| pranav6126 | 0 | 8 (#13, #16) | 0 | 21 (#10, #19, #26) | **29** | 5 |
| Prithviwar | 3 (#9) | 16 (#12, #15) | 0 | 10 (#20, #25) | **29** | 5 |
| RachitSMane | 5 (#8) | 11 (#14, #17, #23) | 0 | 3 (#21) | **19** | 5 |
| **Total** | **11** | **35** | **18** | **44** | **108** | 20 |

Observations:
- Equal issue counts (5 each) hide a **12-point** spread in proposed size (19 to 31).
- Every member has **zero points in at least one sprint**: Krishna in Sprint 2; Prithvi and Rachit in Sprint 3; Pranav in two sprints (1 and 3).
- Sprint 3 is a **single-person** sprint.

These figures describe the **plan as assigned**. They do not measure contribution (see §8; Rachit's
non-assigned work on #25 and #26 is not reflected here).

---

## 12. Four-milestone to two-academic-sprint mapping proposal

> **Requires team decision and mentor approval.** No milestone was renamed, merged or edited, and no
> issue was moved. The mapping is a reporting view only.

| Option | Academic Sprint 1 | Academic Sprint 2 | For | Against |
|---|---|---|---|---|
| **A. By milestone scope and planned dates (recommended)** | Milestones 1 + 2 (31-08 → 27-09): foundation and core single-user whiteboard: accounts, boards, drawing, sharing, export, responsive layout. 10 issues, **46 pts** | Milestones 3 + 4 (28-09 → 25-10): real-time collaboration, hardening, testing, release. 10 issues, **62 pts** | clean functional increment (a usable single-user whiteboard, then collaborative and validated); follows milestone dates and order; equal issue counts; matches the existing video scripts (`sprint-videos/README.md`) | planned dates unverifiable (§9.2); #12's live revocation and #23 cross the boundary; 46 vs 62 is uneven |
| B. By repository history | work to 29-10 (PR #1–#6: documents, auth pages, first E2E, board limit, shared errors) | PR #27–#34 (01–02-11: application baseline, features, tests, release) | reflects real commit dates | the application entered GitHub only in PR #27, so academic Sprint 1 would show no working product, which contradicts the backlog |
| C. Rebalanced by points | Milestones 1 + 2 + 3 (64 pts) | Milestone 4 (44 pts) | puts all features in Sprint 1 and all testing in Sprint 2 | entrenches the test-last pattern; Sprint 1 would carry ~60 % of the points |

**Option A by assignee (proposed points):**

| | Krishna | Pranav | Prithvi | Rachit | Total |
|---|---:|---:|---:|---:|---:|
| Academic Sprint 1 (M1 + M2) | 3 | 8 | 19 | 16 | **46** |
| Academic Sprint 2 (M3 + M4) | 28 | 21 | 10 | 3 | **62** |

Under option A, Krishna carries only 3 points in academic Sprint 1 and Rachit only 3 in academic
Sprint 2. Be ready to explain this as specialisation (real-time versus UI), not inactivity.

---

## 13. Risks and uncertainties

| # | Risk / uncertainty | Effect on this audit | Mitigation |
|---|---|---|---|
| R1 | Project fields not readable (`read:project` missing) | estimates, status values, iterations and dates on the board unverified, including Sprint 1 cards | run the commands in §2.3 |
| R2 | Estimates are retrospective and made by one assistant | anchoring bias; outcome knowledge inflates sizes of items that turned out hard (#11, #12, #15) | team planning poker; estimate from the issue text first, then compare |
| R3 | Snapshot commits hide authorship | contributor analysis (§8) cannot attribute #7, #11, #12 and #15 core code | team states authorship verbally; do not infer from git |
| R4 | Overlapping issues (#8/#15, #11/#18/#22/#24, #9/#17/#21) | double counting or under-counting depending on where boundaries fall; ±1 Fibonacci step | team agrees boundaries before voting |
| R5 | Scope larger than issue text (#12, #14, #15) | delivered-scope sizing versus described-scope sizing differ (e.g. #12: 5 vs 8) | team chooses one principle and applies it to all issues |
| R6 | Work with no issue (version history FR-030–035, FR-008, NFR performance, SEC-REQ-006/008) | 108 understates total effort; version history alone would be about 8 | decide on clearly labelled retrospective items (not back-dated) |
| R7 | #25 and #26 closed with unticked checks | completion evidence weak; the viva may question it | record the gaps honestly; optionally add a new factual comment (needs team approval) |
| R8 | Planned dates predate repository activity | sprint dates cannot be evidenced | explain them as planned dates recorded retrospectively |

---

## 14. Decisions requiring team / mentor approval

| # | Decision | Owner | Options |
|---|---|---|---|
| D1 | Accept, adjust or reject the 20 proposed estimates (§5) | team (planning poker) | adopt as is / adjust / re-estimate from scratch |
| D2 | Sizing principle: described scope or delivered scope (affects #12, #14, #15). **The proposed 108 mixes the two:** #12 and #15 are sized by delivered scope (8 each), #14 by described scope (5) | team | consistently described: **102** (#12 → 5, #15 → 5, #14 stays 5) / consistently delivered: **111** (#14 → 8) / keep 108 and record why #14 differs |
| D3 | Boundaries of overlapping issues (#8/#15, #22/#24, #17) | team | as proposed / move points |
| D4 | Whether and how to record agreed points on GitHub | team, then the owner | Project field named e.g. "Story Points (retrospective, <date>)" / docs only. **Do not edit closed issues or milestones.** |
| D5 | Four-milestone → two-academic-sprint mapping (§12) | team proposes, **mentor approves** | A (recommended) / B / C |
| D6 | Retrospective backlog items for uncovered requirements (R6) | team, mentor | add with "retrospective entry, created <date>" / document only |
| D7 | How to present #25/#26 completion and the assignee discrepancies (§8) | team | verbal explanation / new factual comment (no edits to history) |
| D8 | Grant `read:project` to finish the Project-field audit | repository owner | run §2.3 / accept as unverified |
| D9 | Decomposition lessons (#11 into 4; optionally #12, #15, #19) | team | record as a lesson learned only; **do not** split closed issues |

---

## 15. Evidence and sources

| Source | Used for |
|---|---|
| `gh issue list --state all --json number,title,state,stateReason,assignees,labels,milestone,body,comments,closedAt,createdAt,author,closedByPullRequestsReferences` (06-11-2026) | inventory, bodies, comments, closing PRs |
| `GET /repos/.../issues/{7..26}/timeline` | created, assigned, milestoned and closed events; actors and times; cross-references; Project v2 add and status events |
| `GET /repos/.../milestones?state=all` | milestone dates, descriptions, states, counts |
| `gh pr list --state all`, `gh pr view` for all 14 PRs | PR authors, mergers, reviews, comments, branches, merge dates, closing references, sizes |
| `GET /repos/.../issues/{11,21,26}/dependencies/blocked_by`, `/sub_issues` | formal dependencies (0) |
| `GET /repos/.../labels`, `/collaborators` | label set, team |
| `gh auth status`; GraphQL `projectItems` refusal text | access verification |
| `git log --all`, `git shortlog -sne --all`, `git show --stat` for `7e1d2a2`, `efb2a98`, `702838b`, `7028ca0`, `d0b4937`, `9660c24`, `b86de85`, `2e50004`, `5416880` | contributor analysis |
| Code: `server/src/realtime/*`, `shared/src/syncClient.js`, `server/src/access/*`, `server/src/auth/authService.js`, `client/src/board/*`, `client/src/api.js`, `shared/src/errorCodes.js`, `server/src/errors.js`, `server/src/db/*` (line counts); test files in `server/tests`, `shared/tests`, `client/tests`, `e2e` (test counts by `test(`/`it(` occurrences) | complexity evidence |
| `docs/final-submission/AGILE_AND_GITHUB_AUDIT.md`, `STORY_POINT_ESTIMATION.md`, `ISSUE_REQUIREMENT_TRACEABILITY.md`, `CHECKLIST_AUDIT.md` (05-11-2026, read, not modified) | prior findings re-verified; proposed requirement mapping; course two-sprint expectation (checklist items 2.5, 2.10, 2.14) |

**Integrity statement.** During this audit no GitHub issue, Project card or field, label, assignee,
milestone, status, pull request or commit was created, modified, closed, reopened or deleted. Nothing
was committed or pushed. Only read-only GitHub API calls were made. Local changes: this file, and one
added row in `docs/final-submission/README.md`.

---

## 16. REVISED PROPOSAL — consistent reassessment (06-11-2026, second pass)

> **Status: retrospective PROPOSAL, prepared 06-11-2026 by Claude (Claude Code) after the repository owner
> asked whether Rachit's five issues (#8, #14, #17, #21, #23) were underestimated.**
> §1–§15 above are kept unchanged as the first proposal (108 points). This section **supersedes the point
> values only if the team accepts it.** No value here was assigned by the team during planning. Nothing on
> GitHub was created or modified for this section. GitHub Projects is still unreadable: the token has no
> `read:project` scope (re-checked 06-11-2026 with `gh project list --owner RachitSMane`).

### 16.1 Standard applied to all 20 issues

The first proposal mixed two sizing principles (§14 D2): #12 and #15 were sized by **delivered scope**, #14 by
**described scope**. This pass applies **one** rule to every issue:

1. **Delivered scope, bounded by the issue's intent.** Size what was actually built and tested to meet the
   issue's description, tasks and acceptance criteria, verified in the code.
2. **Overlap counted once**, in the issue whose acceptance criteria name it most specifically (live rename →
   #13; revocation propagation → #12; drawing logic → #15; reconnection → #18; guest tokens → #12).
3. **Work with no backlog item is not counted** in any issue (version history FR-030–035 in `SidePanel.jsx`,
   presence list, PR #4 board limit; see R6).
4. **Not used:** lines of code, commit counts, PR size, time taken, who authored the code, or assignee totals.
5. Relative anchors unchanged: #16 Export (3) and #9 Shared errors (3).

Assignee totals were calculated **after** the values were set and played no part in choosing them.

### 16.2 Issue-by-issue revised table

| # | Title | Assignee | Previous | **Revised** | Change | Confidence | Evidence for the revised value |
|---|---|---|---:|---:|---|---|---|
| 7 | Set up project structure and development environment | Chinni-Krishna-Reddy | 3 | **3** | — | High | npm workspaces, env template, dev scripts, README setup. CI workflows (`app-ci.yml` 56 lines, `docs-check.yml` 26) are small and would not move it to 5 |
| 8 | Implement whiteboard frontend and canvas interface | RachitSMane | 5 | **5** | — | Medium | Page shell (`BoardPage.jsx` top bar, dialogs host, connection display), `Canvas.jsx` surface with `ResizeObserver` and fractional-DPR backing store (`7028ca0`), `Toolbar.jsx` UI, `SidePanel.jsx` shell, `router.jsx`/`App.jsx`. Drawing logic → #15; version-history UI in `SidePanel.jsx` has no issue; live-event handling → #12/#13. See §16.3 |
| 9 | Implement shared error handling across frontend and backend | Prithviwar | 3 | **3** | — | High | Reference story. `errorCodes.js`, `errors.js`, `ApiError`/`describeError()`; 17 unit tests |
| 10 | Implement end-to-end testing for whiteboard workflows | pranav6126 | 8 | **8** | — | Medium | Playwright config and global setup, multi-context specs `whiteboard.spec.cjs` (9), `boards.spec.cjs` (6) |
| 11 | Implement real-time board synchronization using Socket.IO | Chinni-Krishna-Reddy | 13 | **13** | — | Medium | Rooms, server ordering, FIFO queue, persist-before-broadcast, optimistic client with ack/rollback, resync |
| 12 | Implement board sharing and access control | Prithviwar | 8 | **8** | — | Medium | Share links, guest tokens and join, 3-role matrix on REST and socket, members, ownership transfer, revocation propagation |
| 13 | Implement basic board management and persistence | pranav6126 | 5 | **5** | — | High | REST CRUD with owner checks, dashboard, rename, live rename |
| 14 | Implement user authentication and session management | RachitSMane | 5 | **8** | **+3** | Medium | See §16.3. Delivered: bcrypt with a fixed dummy hash for unknown e-mails, JWT sessions with `jti`, persisted revocation list checked on every request, HMAC-keyed login limiter, `authenticate()` middleware with `sessionOnly`/`optional` modes on 20 REST routes, Socket.IO handshake authentication, revocation/expiry enforced on already-open sockets, security log events, client token storage (`session.js`), `Auth.jsx`. Tests: `auth.test.js` (7: TC-015 ×2, TC-105, TC-106 ×2, TC-108 ×2), TC-104 log test |
| 15 | Implement drawing tools and canvas interactions | Prithviwar | 8 | **8** | — | Medium | Pen, shapes, line, text, select/move, eraser hit-testing, colour/width, clear |
| 16 | Implement board export and download functionality | pranav6126 | 3 | **3** | — | High | Reference story. `exportImage.js` (110 lines), 6 unit tests |
| 17 | Implement frontend integration with backend APIs | RachitSMane | 3 | **3** | — | Low | `api.js` wrapper, busy/connecting states, disconnected banner, toasts, ended states, guest-token-expiry return to entry page. The live rename, role and revocation updates are already credited to #13 and #12, so counting them here would double count. See §16.3 |
| 18 | Implement WebSocket connection lifecycle and reconnection handling | Chinni-Krishna-Reddy | 5 | **5** | — | Medium | Rejoin, retry, ack timeout, heartbeat, listener cleanup |
| 19 | Implement unit and integration tests for backend services | pranav6126 | 8 | **8** | — | Medium | Unit and real-MongoDB integration suites |
| 20 | Implement database validation and data integrity checks | Prithviwar | 5 | **5** | — | High | Schema limits, `$jsonSchema` validator, orphan cleanup, 13 integrity tests |
| 21 | Implement frontend validation and user feedback | RachitSMane | 3 | **3** | — | High | Client rules on register, login, guest join, dashboard and toolbar; `cc3e33c` (readable errors on 3 pages); `validation.spec.cjs` (6 E2E, 5 browsers). Rules mirror existing server validation. Comparable to reference #16 |
| 22 | Test real-time synchronization across multiple clients | Chinni-Krishna-Reddy | 5 | **5** | — | Medium | `multiClient.test.js` (17), five scripted clients, races |
| 23 | Implement responsive whiteboard layout | RachitSMane | 3 | **3** | — | Medium | Six CSS breakpoints, `ResizeObserver` canvas, defect fix below 1024 px (`c08e63b`), `responsive.spec.cjs` (3 E2E: 6 viewports, resize sequence, dialogs; 6 browsers). Comparable to reference #16 |
| 24 | Implement board state consistency and synchronization validation | Chinni-Krishna-Reddy | 5 | **5** | — | Medium | Incoming-event validation with repair by fresh join; overlaps #22 (noted, not merged) |
| 25 | Perform cross-browser compatibility testing | Prithviwar | 5 | **5** | — | Medium | Browser matrix, WebKit project, 3 compatibility fixes, `compat.spec.cjs` |
| 26 | Perform final system validation and release readiness checks | pranav6126 | 5 | **5** | — | Medium | Full suite on release candidate, smoke test, dependency fix, readiness report |
| | **Total** | | **108** | **111** | **+3** | | |

**One change only: #14, 5 → 8.** This is the change §14 D2 already identified as needed for consistency. All
other values stand under the single standard.

### 16.3 Rachit's five issues: was 19 too low?

**Yes, by 3 points, on one issue (#14). Not by 11.** The evidence supports **22**, not about 30.

| Issue | Prev. | Revised | Would 30 require…? | Why that is not defensible |
|---|---:|---:|---|---|
| #8 | 5 | 5 | 8 | The extra size would have to come from drawing logic (owned by #15 and sized there at 8), version-history UI (no backlog item) or live-event handling (credited to #12/#13). Counting any of them here double counts or counts unbacklogged work. Moving drawing into #8 would make #8 8 **and** #15 5: Rachit +3, Prithvi −3, same total |
| #14 | 5 | **8** | 8 | **Supported.** The delivered scope matches #12 (8): security-sensitive, full stack, enforced on both REST and Socket.IO, with revocation, rate limiting and adversarial tests. Sizing #12 and #15 by delivered scope but #14 by its task list was inconsistent. Guest tokens are **excluded** here (counted in #12). Even without the rate limiter (not in the task list), persisted revocation plus two-transport enforcement plus the open-socket check puts it above #13 (5) |
| #17 | 3 | 3 | 5 | The concrete live-update code in `BoardPage.jsx` (rename, role change, revocation) is already credited to #13 and #12. What remains (wrapper, loading/connection states, toasts, guest-expiry flow) is a 3, possibly a 2. No assignee-attributable commit names #17 (§8) |
| #21 | 3 | 3 | 5 | Same size class as #16: one rule set mirroring server validation, one small fix, one spec file. Cross-browser execution is #25's work |
| #23 | 3 | 3 | 5 | Same size class as #16: CSS breakpoints, one defect fix, one spec file. DPR backing-store work is credited to #8 |
| **Total** | **19** | **22** | **29–30** | Reaching 30 would need +3 on four issues with no evidence other than the target total |

**Ownership versus contribution.** Points measure the size of the **assigned** work. They do not measure who
did it. For Rachit's issues and others, the git record shows:
- **Rachit authored, on his own issues:** `5416880` (`Auth.jsx`, `Join.jsx`, `styles.css`, PR #2), `7028ca0` and `a5e57c7` (#8 follow-ups), `c08e63b` (#23), `cc3e33c` (#21).
- **Code in Rachit's issues committed by others:** the server authentication (`authService.js`, middleware, handshake), `BoardPage.jsx`, `Canvas.jsx`, `Toolbar.jsx`, `SidePanel.jsx` and `api.js` arrived in the snapshot commit `7e1d2a2` (committed by Pranav, PR #27). `702838b` (Prithvi) changed `api.js` and `Dashboard.jsx`. **Git cannot show who wrote the snapshot code.**
- **Rachit authored, on other members' issues:** the #25 fixes `d0b4937` and `compat.spec.cjs`; the #26 final validation `12d7e34`, `85da387`, `9660c24`, `48051d8`. Those points remain with #25 (Prithviwar) and #26 (pranav6126), because the assignee is the historical owner.
- A PR author or committer is **not** proof of who did all the work. This applies equally to snapshot commits, to Rachit's commits on #25/#26, and to merges (Rachit merged 10 of 14 PRs).

The fair way to show Rachit's wider contribution is this ownership-versus-contribution record, not extra points on his assigned issues.

### 16.4 Recalculated totals (revised)

**Fibonacci distribution**

| Points | Count | Issues | Subtotal |
|---:|---:|---|---:|
| 1 | 0 | — | 0 |
| 2 | 0 | — | 0 |
| 3 | 6 | #7, #9, #16, #17, #21, #23 | 18 |
| 5 | 8 | #8, #13, #18, #20, #22, #24, #25, #26 | 40 |
| 8 | 5 | #10, #12, #14, #15, #19 | 40 |
| 13 | 1 | #11 | 13 |
| **Total** | **20** | | **111** |

**Milestone × assignee**

| Assignee | M1 Sprint 1 | M2 Sprint 2 | M3 Sprint 3 | M4 Sprint 4 | **Total** | Issues |
|---|---:|---:|---:|---:|---:|---:|
| Chinni-Krishna-Reddy | 3 | 0 | 18 | 10 | **31** | 5 |
| pranav6126 | 0 | 8 | 0 | 21 | **29** | 5 |
| Prithviwar | 3 | 16 | 0 | 10 | **29** | 5 |
| RachitSMane | 5 | 14 | 0 | 3 | **22** | 5 |
| **Total** | **11** | **38** | **18** | **44** | **111** | 20 |

**Academic sprints (option A kept: M1 + M2 → academic Sprint 1, M3 + M4 → academic Sprint 2)**

| | Krishna | Pranav | Prithvi | Rachit | **Total** | Issues |
|---|---:|---:|---:|---:|---:|---:|
| Academic Sprint 1 (M1 + M2) | 3 | 8 | 19 | 19 | **49** | 10 |
| Academic Sprint 2 (M3 + M4) | 28 | 21 | 10 | 3 | **62** | 10 |
| **Total** | 31 | 29 | 29 | 22 | **111** | 20 |

No new reason was found to change the mapping, so option A stays.

**Reconciliation:** distribution 18 + 40 + 40 + 13 = 111; milestones 11 + 38 + 18 + 44 = 111; academic
49 + 62 = 111; assignees 31 + 29 + 29 + 22 = 111; issues 6 + 8 + 5 + 1 = 20 = 5 × 4. ✓

**Overlaps (unchanged, counted once):** #8/#15 (drawing), #8/#23 (sizes), #11/#18 (reconnection),
#11/#22/#24 (implementation versus verification; #22 + #24 = 10 could be read as one 8), #9/#17/#21 (errors
and feedback), #12/#14 (guest tokens → #12), #12/#13/#17 (live updates → #12/#13), #10 versus later specs
(counted in #21, #23, #25, #26).

### 16.5 Remaining uncertainties

- **#17** stays Low confidence. Depending on boundaries it could be 2 (if loading states are counted in each feature) or 5 (if the team moves all client live-event handling out of #12/#13). The total moves by ±1–2.
- **#14** could fall back to 5 if the team chooses **described** scope for all issues, but then #12 and #15 also fall to 5 (total 102, Rachit 19). The two standards must not be mixed.
- **#8/#15 boundary:** moving drawing into #8 shifts 3 points from Prithviwar to Rachit with no change in total. This is a boundary decision for the team, not evidence of underestimation.
- One assistant produced both passes, so this is consistency, not independent validation. Team planning poker remains the real check (R2).
- Project fields are still unverified. A field called `Estimate` may exist. If it does, its values must be kept as they are.

### 16.6 Proposed GitHub Project change (NOT applied; awaiting approval)

| Item | Proposal |
|---|---|
| Field | New **Number** field named **`Retrospective Story Points`** on the Project that holds issues #7–#26. Any existing `Estimate` field is **not** written, renamed or reinterpreted. If `Retrospective Story Points` already exists, its values are read and reported before anything is written |
| Values | #7 3 · #8 5 · #9 3 · #10 8 · #11 13 · #12 8 · #13 5 · #14 8 · #15 8 · #16 3 · #17 3 · #18 5 · #19 8 · #20 5 · #21 3 · #22 5 · #23 3 · #24 5 · #25 5 · #26 5 (sum 111) |
| Records touched | 20 Project items (one per issue #7–#26), only that one field. **No** issue body, title, assignee, label, milestone, status, state or PR is touched |
| Permissions needed | `read:project` to inspect; `project` (read/write) to create the field and set values: `gh auth refresh -h github.com -s read:project,project` |
| Open point | Each issue has **two** `added_to_project_v2` events, so there may be two Projects. The target Project must be confirmed before writing |
