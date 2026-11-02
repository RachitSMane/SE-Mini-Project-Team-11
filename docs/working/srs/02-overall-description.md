<!-- Owner: Prithvi | Reviewers: Rachit | Status: v1.0 -->

## 2. Overall description

### 2.1 Product perspective

The whiteboard is a new, self-contained web application. It consists of a browser client used by
participants, a server that authenticates users, enforces permissions, orders and broadcasts board
operations and manages version history, and a database that stores accounts, boards, share links,
board content and versions. It has no dependency on external business systems. The selected
implementation technologies are described in the SAD (§3.6); they are design decisions, not
requirements of this SRS.

### 2.2 Major product functions

Core functions (mandatory for version 1.0):

- Register, log in and log out.
- Create, open, list and delete boards.
- Share a board through Viewer or Editor links that expire and can be revoked.
- Manage board members and roles; transfer board ownership.
- Draw freehand strokes, add rectangles, ellipses, lines and text, select colour and stroke width.
- Select, move, restyle and delete objects; erase objects; clear the whole board (Owner only).
- Synchronise every accepted change to all participants in real time, with consistent ordering.
- Show which participants are currently on the board.
- Recover the current board state after a lost connection.
- Create versions automatically; list and preview versions; restore a version (Owner only).
- Reject unauthorised or invalid requests on the server.

Candidate enhancements (not part of version 1.0; may be added only through a new, approved
requirement): undo/redo across users, live cursors and activity indicators, PNG/PDF export, chat or
comments, advanced version comparison, mobile-specific optimisation.

The official problem statement for Team 11 requires simultaneous drawing, writing and editing,
real-time synchronisation and basic version history; all three are core functions above.

### 2.3 User roles and characteristics

| Role | Description | Characteristics |
|---|---|---|
| Visitor | Anyone who has not logged in and is not on a board. | Can register, log in, or open a share link. |
| Registered user | Has an account. | Can create boards and becomes their Owner; can join boards through links. |
| Guest | Joins one board through a share link without an account. | Access lasts only for the browser session and only while the link is valid. |
| Owner | The registered user who owns a board (exactly one per board). | Full control of content, sharing, members, versions and deletion. |
| Editor | Member or guest with edit rights on a board. | Can create and change content. |
| Viewer | Member or guest with read-only rights on a board. | Can see the board, participants and version history. |

All users are expected to be familiar with a web browser and a mouse or touchpad. No training is assumed.

### 2.4 Operating environment

- Client: current stable desktop versions of Google Chrome, Mozilla Firefox and Microsoft Edge with a browser viewport at least 1280 px wide (NFR-006).
- Server: a single server instance hosting the application server and the database (development and test environment: one laptop).
- Network: participants reach the server over a local network or the Internet; deployed systems use encrypted transport (SEC-REQ-007).

### 2.5 Design and implementation constraints

- The selected technology stack is MERN with Socket.IO (DECISIONS.md D10, SAD §3.6).
- Version 1.0 runs as a single server instance; horizontal scaling is out of scope.
- The content of one board is limited to 15 MiB measured as BSON-encoded size (FR-008) so that every version snapshot fits in one MongoDB document (16 MiB BSON limit).
- The product must be developed and tested by a team of four students within the course schedule, using a shared GitHub repository with protected `main`, feature branches, Pull Requests and CI.
- No real personal data beyond an e-mail address and display name is collected.

### 2.6 Assumptions and dependencies

- Participants have a stable network connection for most of a session; short interruptions are handled by FR-025.
- All participants of a board use a supported browser (NFR-006).
- Performance targets (NFR-001 to NFR-005) are to be verified in the local test environment defined in STP §6, not on the public Internet; they were measured there in the execution of 12-10-2026 (uncommitted working tree on base commit 82af885; see `docs/IMPLEMENTATION_STATUS.md`) and met (historical v1.0 note: not measured at the time of writing).
- The design decisions recorded with their rationale in `docs/DECISIONS.md` are confirmed by all four members when they sign this document.

### 2.7 Open items

The requirements in this document are complete for version 1.0. The following items depend on
actions outside the document and are tracked in `docs/DECISIONS.md` (E1–E5):

- Sign-off of this SRS by all four team members (approval table).
- Confirmation of the current submission deadline with the instructor (the brief's ETA of 28-09-2026 has passed).
- Measured verification of NFR-001 to NFR-005: done in the execution of 12-10-2026 (TC-009, TC-013, TC-019, TC-020 Pass; local hardware only, see STP Appendix A).
- Verification of NFR-006 and NFR-007: done on 17-10-2026 (TC-021 Pass with limitations: manual in Firefox 158 and Chrome, automated in Chrome and Edge; limitations recorded in the STP TC-021 record).
- A deployed HTTPS environment for verifying SEC-REQ-007 (TC-109).
- **Scope decision pending (02-11-2026): functions implemented outside the version 1.0 requirement baseline.**
  The requirements of this SRS are unchanged; the following functions were implemented during the
  sprints (GitHub issues of the team's sprint plan) without a new SRS requirement, ID or RTM entry:
  - *PNG export* (issue #16, PR #28): any participant can download the board as a PNG image. §1.2 and
    §2.2 list "PNG/PDF export" as a candidate enhancement that "may be added only through a new,
    approved requirement"; no such approval is recorded. The function is tested by automated tests
    outside the STP test-case set (`client/tests/exportImage.test.js`, three E2E tests in
    `e2e/boards.spec.cjs`).
  - *Board rename* (issue #13, PR #28): the Owner can rename a board from the dashboard
    (`PATCH /api/v1/boards/{boardId}`, SAD API-02). FR-042 to FR-044 cover create, list and delete only;
    the FR-051 permission matrix has no rename row (implemented as Owner-only). Tested in
    `server/tests/integration/boards.test.js` and `e2e/boards.spec.cjs`.
  The team and the course mentor must decide either to bring these functions into version 1.0 (new
  requirement IDs allocated in `docs/traceability/id-registry.md`, test cases and RTM rows) or to record
  them as accepted additions outside the version 1.0 baseline. Until then they are not counted in the
  requirement coverage.
