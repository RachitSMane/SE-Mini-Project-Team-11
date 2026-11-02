# Team 11 — Decision Log

This log records the design decisions behind the SRS, SAD and STP version 1.0.

**Status values**

- **Selected (v1.0)** — a technical choice made by the document authors within the team's delegated design authority, with the rationale given below, and specified consistently in the v1.0 documents.
- **Team sign-off** — each member confirms the v1.0 documents by signing their approval tables. Only the planning approval given by Rachit on 10-10-2026 is recorded; the sign-off of Krishna, Pranav and Prithvi is **pending**. No instructor decision is recorded anywhere in this repository.
- **Target (not yet measured)** — a specified performance target whose verification depends on tests that cannot run until the system is implemented.

Legend: RM = Rachit, KR = Krishna, PM = Pranav, PW = Prithvi.

## Architecture and scope decisions

| # | Decision | Selected value | Rationale | Status |
|---|---|---|---|---|
| D1 | Mandatory vs optional features | Core features per SRS §2.2; enhancements out of scope for v1.0 | Covers the official problem statement (simultaneous drawing, real-time sync, version history) within course effort | Selected (v1.0); planning approval RM 10-10-2026; sign-off KR, PM, PW pending |
| D2 | Board access model | Registered accounts and guest access through share links; owners must have accounts | Guests make sharing easy; an accountable Owner is needed for deletion, restore and links | Selected (v1.0); planning approval RM; sign-off pending |
| D3 | Roles and permissions | Owner / Editor / Viewer, permission matrix SRS §4.4 (FR-051) | Smallest role set that separates content editing from board administration | Selected (v1.0); planning approval RM; sign-off pending |
| D4 | Share-link rules | Viewer or Editor link, revocable, with expiry (D4a–D4c) | Limits exposure of leaked links (STRIDE information disclosure) | Selected (v1.0); planning approval RM; sign-off pending |
| D5 | Version history behaviour | Automatic versions; all roles view; Owner-only restore; restore creates a new version and is pushed to all | Basic version history is mandatory; never losing history protects integrity (SEC-OBJ-002) | Selected (v1.0); planning approval RM; sign-off pending |
| D6 | Simultaneous editing policy | Server-authoritative order; per-property last write wins; resync on reconnect | Deterministic, testable and implementable by a four-person team; CRDT rejected as too complex (SAD §3.5) | Selected (v1.0); planning approval RM; sign-off pending |
| D7 | Performance and capacity targets | NFR-001 500 ms p95; NFR-002 10 participants; NFR-003 3 s; NFR-004 5 s; NFR-005 3 s | Interactive-collaboration expectations for a small-group whiteboard on a laptop-class server | Target (not yet measured); planning approval RM; sign-off pending |
| D8 | Security objectives and requirements | SEC-OBJ-001..003, SEC-REQ-001..008 | Covers confidentiality, integrity and abuse resistance identified by the STRIDE analysis | Selected (v1.0); sign-off pending |
| D9 | Document workflow | Markdown sources per owner → supplied Word templates via `tools/build_docs.py`; PDF via `tools/export_pdf.ps1` | Reviewable pull requests; no concurrent edits of one Word file | Selected (v1.0); planning approval RM; sign-off pending |
| D10 | Technology stack | MERN (MongoDB, Express.js, React, Node.js) + Socket.IO | Single language (JavaScript) end to end; Socket.IO rooms match per-board broadcast; team familiarity | Selected (v1.0); planning approval RM; sign-off pending |
| D11 | Version storage | Full snapshots in `versions` with `boardSeq` (D11a–D11c) | Restore is a single read; simple to verify | Selected (v1.0); sign-off pending |
| D12 | Conflict-resolution mechanism | Per-property last write wins in server sequence order; persist before acknowledge/broadcast; client reconciliation; full resync on reconnect (SAD §4.1.2–§4.1.4) | Guarantees convergence without merge logic | Selected (v1.0); sign-off pending |
| D13 | Authentication mechanism | JWT session tokens (24 h) as bearer tokens; bcrypt password hashing | Stateless verification for REST and Socket.IO; standard, well-understood controls | Selected (v1.0); sign-off pending |
| D14 | REST and Socket.IO contracts | API-01, API-02, API-03 (SAD §4.3) | Explicit contracts for implementation and testing | Selected (v1.0); sign-off pending |
| D15 | Test tools | Jest, Supertest, socket.io-client harness, Playwright (STP §6) | Cover unit, API, real-time and browser levels for the chosen stack | Selected (v1.0); sign-off pending |
| D16 | CI workflow | `.github/workflows/docs-check.yml` runs the traceability checker and the documentation tests | Automates the team rule "CI runs tests" for the documents | Selected (v1.0); the workflow file exists; enabling it on GitHub and branch protection are repository-owner actions (E4). Update 02-11-2026: a second workflow, `.github/workflows/app-ci.yml` (lint, unit, integration, build, Chromium E2E), was added; both workflows run on GitHub on every Pull Request and push to `main` |

## Detailed design values

| # | Topic | Selected value | Rationale | Used in |
|---|---|---|---|---|
| D1a | Canvas limits | Stroke width 1–20 px; any `#RRGGBB`; text ≤ 500 characters; title 1–100 characters | Bounded payloads; enough for whiteboard use | FR-002, FR-004, FR-042 |
| D1b | Minimum viewport | 1280 px (tested at 1280 × 720) | Common laptop width; toolbar and panels fit | NFR-006 |
| D1c | Stroke size | ≤ 2,000 points per stroke | Keeps every message far below 65,536 bytes (largest generated message 30,435 bytes, `tools/size_model.py`) | SAD §4.1.1, TC-022 |
| D3a | Access-change propagation | Affected sockets updated or disconnected within 5 s | Bounds the window of stale permissions | FR-047–FR-049 |
| D4a | Link expiry options | 1 h, 24 h or 7 days; default 7 days | Short options for meetings, default for project work | FR-045, FR-048 |
| D4b | Effect of revoking/expiring a link | Guests disconnected within 5 s; registered members keep membership until removed | Guests depend on the link; members have an explicit role | FR-046, FR-047 |
| D4c | Guest display name | 1–30 characters, shown with "(guest)" | Recognisable but bounded | FR-046, FR-052 |
| D5a | Retention | At least the 20 most recent versions | Bounded storage; ample history for a session | FR-035 |
| D5b | Version rules | No-change rule for automatic triggers; clear preserves pre-clear content; clear of empty board is a no-op; restore always creates a version; only retention removes versions | Removes the clear/no-change contradiction; history never silently lost | SRS §4.3 |
| D5c | Clear and restore failure handling | Per-board task queue serialises all changes; durable journal `boards.pendingOp` written atomically before the first destructive step (commit point); completion and journal removal in one atomic update; start-up recovery completes journalled operations before sequence recovery (the server exits without accepting connections if recovery cannot complete); a restore's only pre-commit checks are the size check and the commit write; no success reported before completion | Single-document atomicity and journaling are available on a standalone MongoDB server without transactions; recovery is idempotent | FR-007, FR-033, SAD §3.6, SD-02, SD-05, TC-024, TC-025 |
| D6a | Editing while disconnected | Not supported; unacknowledged changes discarded after resync with a notice | Avoids conflicting offline histories | FR-025 |
| D6b | Real-time parameters | Reconnect 500 ms … 2,000 ms, randomisation 0.2; gap repair after 1 s or 100 events; ack timeout 10 s | 2 s maximum backoff keeps NFR-004 achievable | SAD §4.1.3–§4.1.4 |
| D7a | Standard test board (TB-STD) | 300 strokes (≤ 200 points), 50 shapes, 20 texts (≈ 1.94 MB content size, `tools/size_model.py`) | Representative of a busy session | NFR-003, NFR-005 |
| D7b | Target environment | Server and MongoDB on one laptop; clients on the same machine or LAN | Reproducible within course resources | NFR-001..005 |
| D7c | Measurement method | One-process scripted clients, one monotonic clock; submit-to-apply latency per receiver; nearest-rank p95; 10 s warm-up, 60 s measurement | Removes clock skew; objective pass/fail | SRS §5, TC-019 |
| D8a | Password policy | 8–72 characters | 72 is the bcrypt input limit | SEC-REQ-001 |
| D8b | Rate limits | 5 failed logins per entered e-mail address (lower-cased) per 15 min, registered or not; the limiter keeps only an HMAC of the address (key from an environment variable) in memory; a failed login for an unknown address runs one bcrypt comparison against a fixed dummy hash; responses are identical apart from `requestId`; 30 operations/s per connection | Blocks brute force and flooding without affecting normal drawing | SEC-REQ-006 |
| D8c | Session lifetime | 24 h; logout revokes | Balances convenience and exposure | SEC-REQ-002 |
| D8d | Message size | 65,536 bytes per Socket.IO packet (M1) | Socket.IO `maxHttpBufferSize`; far above the largest valid message | SEC-REQ-005 |
| D8e | Share-link token | 32 random bytes, base64url, in URL fragment, stored as SHA-256 | Exceeds 128-bit minimum; never logged by servers | SAD §3.9.4 |
| D11a | Periodic version interval *T* | 5 minutes (`VERSION_INTERVAL_MS`) | Bounds lost work to 5 minutes without flooding history (20 versions ≈ 100 minutes of active editing) | FR-030 |
| D11b | Snapshot size check | Refuse version documents above 16,711,680 bytes (16 MiB − 64 KiB) | Defence in depth below MongoDB's 16 MiB limit | SAD §3.6 |
| D11c | Board content limit | M3 ≤ 15,728,640 bytes; M4 ≤ M3 + 286 bytes (encoded worst case verified by `tools/size_model.py`) | Guarantees every snapshot fits one MongoDB document | FR-008, SAD §3.6 |
| D13a | bcrypt cost | 12 | Current common recommendation for interactive logins | SAD §3.9.2 |
| D13b | Security event record | Fields `event`, UTC `timestamp`, `requestId`, `actorType`/`actorId` (`anonymous`/`null` before identification), `boardId` (`null` if none), `subjectId` (internal account ID of the affected account, `null` if none; never an e-mail), `outcome`, `reason`; written by COMP-09 with a field allow-list; failed logins always use reason `UNAUTHENTICATED`; entered e-mail never logged | A failed login has no actor or board, so the required fields need a defined `null` form; the allow-list keeps secrets out of the log | SEC-REQ-008, SAD §4.4, TC-104 |
| D14a | 403 vs 404 | No role → 404 `BOARD_NOT_FOUND`; too low a role → 403 `FORBIDDEN` | Does not reveal the existence of boards to outsiders | SAD §3.9.3, TC-102 |
| D14b | Ownership-transfer endpoint | `POST /api/v1/boards/{boardId}/transfer-ownership` with `{newOwnerId, confirm: true}` | Explicit action endpoint with an accidental-call safeguard | FR-050, SD-04, TC-018 |
| D14c | Restore idempotency | Required `Idempotency-Key` header (UUID per user action); a new key is a new restore; a retry with the same key and version returns the recorded result without restoring again; reuse for another version → 409 `IDEMPOTENCY_KEY_REUSED`; the key is remembered while the restore version is retained | Safe retries after crashes and timeouts | FR-033, API-03, TC-024 |

## External actions (cannot be completed by the document authors)

| # | Action | Responsible | Status |
|---|---|---|---|
| E1 | Sign the approval tables of SRS, SAD and STP v1.0 | Rachit, Krishna, Pranav, Prithvi | Pending |
| E2 | Confirm the current submission deadline (the brief's ETA of 28-09-2026 has passed) | Team with the instructor | Pending |
| E3 | Provide a deployed HTTPS environment so that TC-109 (SEC-REQ-007) can be executed | Team (implementation phase) | Pending |
| E4 | Add collaborators, enable the CI workflow, protect `main` and require reviews and checks on GitHub | Repository owner | Partly done (verified 02-11-2026): the four members are collaborators; `app-ci` and `docs-check` run on GitHub. **Open:** `main` is not protected and neither reviews nor checks are required (GitHub API: "Branch not protected"); PR #28 was merged with a failing check |
| E5 | Implement the system and the planned test assets, then execute the STP | Team (implementation phase) | Implemented; STP executed 12-10-2026: 32 Pass, 2 Blocked (TC-021, TC-109), 0 Fail (`docs/IMPLEMENTATION_STATUS.md`). Addendum 17-10-2026: TC-021 executed manually and confirmed by the team as Pass with limitations (STP TC-021 record; `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md`), so 33 Pass, 1 Blocked (TC-109), 0 Fail |
| E6 | Decide the version scope of two implemented functions outside the SRS v1.0 baseline: PNG export (issue #16; SRS §1.2/§2.2 list export as a candidate enhancement) and board rename (issue #13); either approve them as new requirements (IDs, test cases, RTM rows) or record them as accepted additions outside the baseline (SRS §2.7) | Team with the course mentor | Pending (no approval recorded as of 02-11-2026) |

## Change history

| Date | Decision | Change | Reason |
|---|---|---|---|
| 10-10-2026 | D11a | Reworded: interval only; triggers moved to D5b | Clear/no-change contradiction removed |
| 10-10-2026 | D11b | Defensive check expressed as BSON size of the whole version document | Consistency with D11c |
| 10-10-2026 | D12 | Clarified as per-property last-write-wins with reconciliation protocol | Whole-object wording contradicted partial updates |
| 10-10-2026 | D11c | Limit defined on BSON-encoded size; M4 bound 286 bytes | JSON size does not bound the BSON snapshot size |
| 10-10-2026 | D5c | Replaced the "boardSeq greater than seq" roll-forward rule by the durable journal `pendingOp`; interrupted clear added | The old rule did not cover interrupted clears and depended on recovery ordering |
| 10-10-2026 | D8d | Unit made exact: 65,536 bytes per Socket.IO packet | "64 KB" was ambiguous |
| 10-10-2026 | D14c | Added | Restore retries after crashes needed a defined outcome |
| 10-10-2026 | all | Status model changed from "proposed" to "Selected (v1.0)" with rationale; sign-off kept pending | v1.0 documents finalised within the team's design authority; no approval invented |
| 11-10-2026 | D13b | Added | SEC-REQ-008 required actor and board for events, such as a failed login, that have neither |
| 11-10-2026 | D5c, D14c | Clarified: pre-commit failure points of a restore, failed start-up recovery, distinct requests vs retries, key-retention limit | TC-024 assumed the restore version was written before the commit, contrary to SAD §3.6 |
| 11-10-2026 | D8b, D13b | Login limiter counts failures per entered e-mail address (registered or not); `subjectId` defined as internal account ID | A per-account limit answered unregistered addresses differently and so revealed account existence; `subjectId` was missing from the SRS field list |
| 11-10-2026 | D8b | Recorded the HMAC-keyed limiter state, the dummy bcrypt comparison for unknown addresses and response equality apart from `requestId`; these new choices await team review at sign-off (E1) | The previous entry omitted two of the new login design choices; every error body carries a unique `requestId`, so "identical response" was not testable as written |
| 16-10-2026 | TC-022 (agenda D-03 to D-07) | TC-022 retained as Pass; STP TC-022 description corrected (proposal A, B option 1, C, F, G) and the decision appended to its record; the 303.7 s loaded run is recorded as not a clean pass | Team decision communicated on 16-10-2026 (individual approvals not recorded); the team confirmed D-07 option (c): submit with the unresolved timing margin under load disclosed (`docs/reviews/TEAM_REVIEW_AGENDA.md` §4) |
| 17-10-2026 | E5 (TC-021) | E5 addendum: TC-021 Pass with limitations; totals 33 Pass, 1 Blocked (TC-109), 0 Fail | Team confirmation after the two-member TC-021 review, communicated to the documentation session on 17-10-2026; no minutes or signatures |
