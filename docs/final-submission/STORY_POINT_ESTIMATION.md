# Retrospective story-point estimation — PROPOSAL

> **Status: retrospective proposal, prepared 05-11-2026 by Claude for the team to review.**
> These are **not** historically recorded story points and have **not** been agreed by the team. No
> estimate exists on GitHub (§1). Nothing in this file was written to GitHub. If the team adopts any
> value, record it as "estimated retrospectively on <date>". Do not present it as sprint-planning data.

> **Superseded first draft (historical version).** The figures in this file (total **108**) are the first
> draft. The latest retrospective estimate proposal is in `AGILE_ESTIMATION_AND_PLANNING_AUDIT.md` §16:
> - **#14 changed from 5 to 8**; every other value is unchanged.
> - **Total: 111.**
> - **Sprints:** 11 / 38 / 18 / 44.
> - **Assignees:** Krishna 31 · Pranav 29 · Prithvi 29 · Rachit 22.
> - **Academic sprints:** 49 / 62.
>
> The revised proposal is **still subject to team and mentor approval**. The 108-point values below are
> kept only as the superseded draft, marked where they differ.

Repository `RachitSMane/SE-Mini-Project-Team-11`, 20 issues (#7–#26) in four sprint milestones.
Sources: full issue bodies and comments, milestone descriptions, the PRs and commits cited in them, and
the code those commits changed (read on 05-11-2026). Related reports:
[`AGILE_AND_GITHUB_AUDIT.md`](AGILE_AND_GITHUB_AUDIT.md) and
[`ISSUE_REQUIREMENT_TRACEABILITY.md`](ISSUE_REQUIREMENT_TRACEABILITY.md).

## 1. Current state: no estimates anywhere visible

| Place checked | Result |
|---|---|
| Issue bodies and all comments (#7–#26) | no story points, size, effort or estimate field in any issue |
| Labels (20 defined) | type, area and priority labels only; no size labels |
| Milestone descriptions (4) | scope and completion notes; no points or capacity |
| GitHub Project fields | **unable to verify**: the CLI token lacks `read:project` (§ "Access" in the audit). The repository owner reports having inspected all four sprints on the Project and found no estimates. This is consistent with everything above, but this audit could not read the Project itself |

**All 20 issues are missing an estimate.**

## 2. Method and assumptions

- **Scale.** Fibonacci 1, 2, 3, 5, 8, 13, used as the request defines them: 1 very small; 2 small;
  3 moderate and clear; 5 several steps or components; 8 large, with significant integration or testing;
  13 very large or uncertain, should be split.
- **Relative sizing against reference stories.** **#16 Export (3)** is a bounded client-only feature
  with one module, a clear algorithm and its own tests. **#9 Shared error handling (3)** is a
  cross-cutting but small contract. Every other issue is sized relative to these two.
- **What is estimated:** the scope the issue describes (tasks and acceptance criteria), read together
  with the implementation evidence cited in its completion comments. That evidence shows what "done"
  actually meant: for example, which tools "drawing tools" covered.
- **What is not used:** time taken, number of commits, lines changed or PR size. Several issues were
  delivered inside one bulk commit (`7e1d2a2`, "restore missing application files from team working-tree
  snapshot"), so size on GitHub says nothing about effort.
- **Overlap is not double-counted.** Where two issues describe the same work, the points sit with the
  issue whose acceptance criteria own it, and the overlap is noted (e.g. #8/#15, #11/#18, #22/#24).
- **Complexity** (Low / Medium / High / Very High) rates technical difficulty and uncertainty. It is
  separate from size: a test-only task can be large but of medium complexity.
- **Confidence:** *High* means the scope is clear and the estimate would likely survive team discussion.
  *Medium* means there are overlaps or a vague description, and ±1 Fibonacci step is plausible.
  *Low* means the description is too generic to size on its own.
- **Remaining work** is not part of an estimate. All 20 issues are closed. Manual checks still open on
  #25/#26 are noted as concerns, not added.

## 3. Estimation table

| Issue | Sprint | Points | Complexity | Confidence | Dependencies (explicit = stated in the issue; inferred = from the code) |
|---|---|---|---|---|---|
| #7 Set up project structure and development environment | S1 | **3** | Low | High | none; prerequisite for all |
| #8 Implement whiteboard frontend and canvas interface | S1 | **5** | Medium | Medium | explicit: #23; inferred: #7 |
| #9 Implement shared error handling across frontend and backend | S1 | **3** | Medium | High | inferred: #7 |
| #12 Implement board sharing and access control | S2 | **8** | High | Medium | inferred: #13, #14; propagation of revocation needs #11 (S3) |
| #13 Implement basic board management and persistence | S2 | **5** | Medium | High | inferred: #7, #14 |
| #14 Implement user authentication and session management | S2 | **5** (superseded; revised proposal: 8) | Medium | High | inferred: #7, #9 |
| #15 Implement drawing tools and canvas interactions | S2 | **8** | High | Medium | inferred: #8; overlaps #8 |
| #16 Implement board export and download functionality | S2 | **3** | Low | High | inferred: #15 (shared renderer) |
| #17 Implement frontend integration with backend APIs | S2 | **3** | Low | **Low** | inferred: #9, #13, #14; overlaps #21 |
| #23 Implement responsive whiteboard layout | S2 | **3** | Medium | Medium | explicit: #8, #15 |
| #11 Implement real-time board synchronization using Socket.IO | S3 | **13** | Very High | Medium | explicit: #18, #22, #24 (related); inferred: #13, #14, #12 |
| #18 Implement WebSocket connection lifecycle and reconnection handling | S3 | **5** | High | Medium | explicit: #11 |
| #10 Implement end-to-end testing for whiteboard workflows | S4 | **8** | Medium | Medium | explicit: #25; inferred: all feature issues |
| #19 Implement unit and integration tests for backend services | S4 | **8** | Medium | Medium | inferred: #12, #13, #14, #11 |
| #20 Implement database validation and data integrity checks | S4 | **5** | Medium | High | inferred: #13 |
| #21 Implement frontend validation and user feedback | S4 | **3** | Low | High | explicit: #9, #17 |
| #22 Test real-time synchronization across multiple clients | S4 | **5** | High | Medium | explicit: #11; inferred: #18 |
| #24 Implement board state consistency and synchronization validation | S4 | **5** | High | Medium | explicit: #11; overlaps #22 |
| #25 Perform cross-browser compatibility testing | S4 | **5** | Medium | Medium | explicit: #10, #8, #15 |
| #26 Perform final system validation and release readiness checks | S4 | **5** | Medium | Medium | explicit: #21, #23, #25 |
| **Total** | | **108** (superseded first draft; revised proposal: 111) | | | |

## 4. Rationale and concerns per issue

**#7 — 3.** The work was npm workspaces (`client/`, `server/`, `shared/`), the dev and MongoDB start
scripts, an `.env` template and setup documentation (completion note: `7e1d2a2`, `efb2a98`). It is
standard work with no design uncertainty. *Concern:* the completion note also credits CI workflows,
which are not in the issue's tasks. They are not counted here.

**#8 — 5.** Board layout, canvas surface with sizing, toolbar shell, navigation (`BoardPage.jsx`,
`Canvas.jsx`, `Toolbar.jsx`, `SidePanel.jsx`, `router.jsx`). There are several components, but the
drawing logic itself is counted in #15. *Concerns:* the tasks overlap #15 ("toolbar and drawing
controls", "basic drawing interactions") and #23 ("responsive and usable"). Taken alone, #8 could be
argued as 8 if #15 were smaller. The team should decide where the toolbar/drawing boundary lies.

**#9 — 3 (reference story).** One error table shared by client and server (`shared/src/errorCodes.js`),
server mapping to `{code, message, requestId}` (`server/src/errors.js`), and client messages. It is
cross-cutting but small and well defined.

**#12 — 8.** Share links (random token, hashed storage, expiry, revocation), guest join, three roles, a
permission matrix enforced on REST and Socket.IO, member management and ownership transfer, and the
owner dialogs. That spans server, client and security (FR-045–FR-051, SEC-REQ-003/004). *Concerns:*
the issue text is minimal ("basic access permissions"), and from the description alone it would be a 5.
The 8 reflects what its completion note shows was delivered. **Recommend splitting** it into share links
and guest access (5) and roles, members and ownership transfer (5).

**#13 — 5.** Create, list, rename and delete over REST, with Owner checks, persistence in MongoDB, a
dashboard UI with dialogs, and 404/400 handling. It is a typical CRUD feature across three layers. Rename
was added in `20097f4`. *Concern:* rename is outside the SRS baseline (DECISIONS.md E6). That does not
change the size.

**#14 — 5 (superseded; the revised proposal in the audit §16.3 sizes it at 8).** Registration and login, bcrypt hashing, JWT sessions, authentication on REST **and** on
the Socket.IO handshake, logout revocation, and the two pages. *Concerns:* the implementation also has a
login rate limiter and guest tokens (SEC-REQ-006, SAD §3.9.2), which are not in the issue's tasks. If the
team counts them here, 8 is defensible.

**#15 — 8.** Pen, rectangle, ellipse, line, text, select/move/restyle, eraser with hit-testing, colour
and width controls, clear, and pointer handling (completion note; `client/src/board/Canvas.jsx`,
`geometry.js`). Hit-testing, text editing and multi-pointer handling make it the largest client item.
*Concerns:* the issue's own task list names only freehand, eraser, size/colour and clear. Shapes, text
and select (FR-003–FR-005) have no issue of their own. **Recommend splitting** into freehand, eraser and
clear (3–5) and shapes, text and select/move (5).

**#16 — 3 (reference story).** Client-only: compute the bounds of all objects, render with the existing
renderer, scale large boards, refuse an empty board, download a file (`exportImage.js`, 6 unit tests,
3 E2E).

**#17 — 3, Low confidence.** API wrapper, loading and error states, wiring pages to endpoints
(`client/src/api.js`, 54 lines; pages). *Concern:* this is a cross-cutting "integration" item whose
work is mostly inside #13, #14, #12 and #21. Its tasks don't describe a separable deliverable.
**Recommend** removing it as a story and folding the integration into each feature's definition of done.

**#23 — 3.** CSS breakpoints, a `ResizeObserver`-driven canvas, and the top bar below 1024 px
(`c08e63b`), verified by 3 E2E tests. *Concern:* until 02-11-2026 the acceptance criteria were not
measurable. Measurable sizes were added to the description late.

**#11 — 13, split recommended.** This is the core of the product: Socket.IO namespace and rooms,
server-assigned sequence numbers, a per-board FIFO queue, persist-before-broadcast, per-property
last-write-wins, client optimistic updates with acknowledgement and rollback, gap repair and full
resync (`realtimeServer.js`, `boardEngine.js`, `boardQueue.js`, `shared/src/syncClient.js`). It also
carries the highest technical uncertainty (concurrency, ordering, convergence). *Concerns:* its
"handle disconnections and reconnections" task duplicates #18, and its "verify with multiple users" task
duplicates #22. **Recommend splitting** into (a) rooms, join and broadcast; (b) server ordering and
persistence; (c) client sync with rollback; (d) gap repair and resync. These would likely be 3 + 5 + 5 + 3.

**#18 — 5.** Rejoin on reconnection, retry after a server disconnect, ack timeout forcing reconnect,
heartbeat detection, listener clean-up (`efb2a98`, `b3a8f75`; 7 lifecycle tests). There is little code,
but it is asynchronous and timing-sensitive, so it is hard to get right. *Concern:* it overlaps #11.

**#10 — 8.** Playwright infrastructure with a global set-up that starts MongoDB and the server,
multi-context tests for two or more users, and workflows across every feature (`b4e95a6`, `50243ef`).
*Concern:* "critical workflows" is open-ended. The suite grew from 10 to 31 tests across later issues
(#21, #23, #25, #26), and those additions are counted there.

**#19 — 8.** Unit tests for services, validation and policy, plus integration tests against a real
MongoDB for the API, database, access and versions (`9578520`). *Concerns:* a broad "all backend
tests" item. Part of the integration suite came with the bulk commit and with #20/#22/#24.
**Recommend splitting** into unit tests (3) and API/database integration tests (5).

**#20 — 5.** Field limits in Mongoose schemas, a MongoDB `$jsonSchema` validator, a start-up integrity
check that removes orphans, database errors mapped to safe API errors, and the `dbIntegrity.test.js`
suite (12 tests per the completion note, 13 in the 05-11-2026 run) (`702838b`). Its label is
"Testing", but it includes implementation.

**#21 — 3.** Client-side validation on four forms, readable messages, busy states (`cc3e33c`) and
6 E2E tests. The rules mirror existing server validation.

**#22 — 5.** A five-client scripted harness with races (simultaneous bursts, same-object edits,
delete-vs-update), reconnection scenarios and convergence checks against a fresh join and MongoDB
(`multiClient.test.js`, 23 tests). Concurrency makes it High complexity. *Concern:* "identify and fix
synchronisation inconsistencies" is open-ended. The fixes would belong to #11.

**#24 — 5.** Client-side validation of incoming sync events (other board, malformed, duplicate,
diverged) with repair through a fresh join, plus consistency checks of clients against storage
(9 tests in `syncLifecycle.test.js`). *Concern:* there is strong overlap with #22. The two could be one
8-point item.

**#25 — 5.** A four-browser matrix script, a WebKit project, compatibility fixes (`d0b4937`:
non-secure-context fallback, forced colours, lost pointer capture), diagnosis of Firefox-driver failures,
and manual checks. *Concerns:* browser defects are unknown in advance, which lowers confidence. The
manual items (installed Firefox, Safari, physical devices) were never recorded as done.

**#26 — 5.** Running all suites on the release candidate, a smoke test, a dependency security fix,
a defect review and the release readiness report (`9660c24`, `48051d8`, `85da387`). *Concern:*
"review and resolve critical defects" is open-ended. Fixes found here belong to the issues they fix.

## 5. Totals and comparison

> Superseded first-draft totals. Revised proposal (audit §16.4): Sprint 2 **38**, total **111**; the
> other sprints are unchanged.

| Sprint (milestone) | Issues | Proposed points | Share | Points per issue |
|---|---|---|---|---|
| Sprint 1 – Project Foundation | 3 | **11** | 10 % | 3.7 |
| Sprint 2 – Core Whiteboard | 7 | **35** (revised: 38) | 32 % | 5.0 |
| Sprint 3 – Real-Time Collaboration | 2 | **18** | 17 % | 9.0 |
| Sprint 4 – Testing and Finalization | 8 | **44** | 41 % | 5.5 |
| **All four sprints** | **20** | **108** (revised: 111) | 100 % | 5.4 |

All four milestones have the same planned length (two weeks), so the proposed load per sprint ranges
from 11 to 44 points, a factor of four.

**Observations**

1. **Uneven sprint load.** Sprint 1 is light (11). Sprint 4 carries 41 % of all points. With equal
   sprint lengths, a team's capacity would not vary by a factor of four. This suggests the milestones
   were organised by theme, not by capacity.
2. **Testing concentrated at the end.** 36 of Sprint 4's 44 points are testing items (#10, #19, #22,
   #24, #25, #26). Only #20 and #21 also contain implementation. This is a "test-last" pattern. The STP
   had planned the test levels from the start, and a substantial suite already existed on 12-10-2026
   (77 Jest tests and 10 E2E tests, `docs/IMPLEMENTATION_STATUS.md` §2). The milestone structure does
   not show that.
3. **Sprint 3 is one item.** Its 13-point #11 is the riskiest work in the project. A single item of that
   size in a sprint is a planning risk. The usual remedy is to split it (§4).
4. **Hidden scope.** Version history (FR-030–FR-035), the board size limit (FR-008), security logging
   (SEC-REQ-008) and the performance targets (NFR-001–NFR-005) have no issue
   (`ISSUE_REQUIREMENT_TRACEABILITY.md` §3). Their effort is in **no** sprint total, so the total (108 here, 111 in the revised proposal) understates
   the real work. *Indicative only, not added to any total:* a version-history and restore item of this
   scope (journalled, idempotent restore, retention, preview UI) would be comparable to #12 (about 8).
5. **Proposed points by assignee** (assignment only; this is **not** a measure of contribution, see
   `AGILE_AND_GITHUB_AUDIT.md` §7): Rachit 19, revised to 22 (#8, #14, #17, #21, #23), Krishna 31 (#7, #11, #18, #22,
   #24), Pranav 29 (#10, #13, #16, #19, #26), Prithvi 29 (#9, #12, #15, #20, #25). Five issues each
   looks equal, but the proposed sizes differ by up to 12 points between members (9 in the revised proposal).
6. **If the course's two sprints are mapped by scope** (milestones 1+2 → course Sprint 1, milestones
   3+4 → course Sprint 2; a proposal needing approval, see the audit §5.5): 46 and 62 points (revised proposal: 49 and 62).

## 6. How to use this proposal

1. Hold a short estimation session (planning poker) with all four members. Go through the table, and
   change any value the team disagrees with. The assignee of each issue should explain its scope first.
2. Decide on the split recommendations (#11, #12, #15, #19; merging #22/#24; folding #17). For a
   closed historical backlog, the honest option is to **keep the issues as they are** and note the
   split recommendation as a lesson learned rather than rewrite history.
3. If the team adopts values, enter them only in a Project field such as "Story Points (retrospective)"
   with a note of the date. Do not edit the closed issues or milestones.
4. In the viva, say: "We did not estimate during planning; we estimated retrospectively on <date> with
   planning poker, and here is what that showed about our sprint load."
