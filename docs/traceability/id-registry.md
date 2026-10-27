# Team 11 - ID Registry

<!-- Owner: Prithvi. Every ID used in any document must be listed here. Never renumber or reuse an ID; mark it Withdrawn instead. -->

## Rules

- IDs are allocated here first, then used in the documents. "Defined in" names the defining document section.
- Blocks: FR-001 to FR-019 canvas, FR-020 to FR-029 synchronisation, FR-030 to FR-039 version history, FR-040 to FR-059 access; TC-001 to TC-099 functional and non-functional tests, TC-101 to TC-199 security tests.
- A withdrawn ID keeps its row with Status `Withdrawn` and an entry in the change log below.
- Run `python tools/check_trace.py` to verify this registry against the working documents.

## Registry

| ID | Title | Type | Owner | Defined in | Status |
|---|---|---|---|---|---|
| FR-001 | Freehand stroke | Functional | Rachit | SRS 4.1 | Active |
| FR-002 | Colour and stroke width | Functional | Rachit | SRS 4.1 | Active |
| FR-003 | Rectangle, ellipse, line | Functional | Rachit | SRS 4.1 | Active |
| FR-004 | Text objects | Functional | Rachit | SRS 4.1 | Active |
| FR-005 | Select, move, restyle, delete | Functional | Rachit | SRS 4.1 | Active |
| FR-006 | Object eraser | Functional | Rachit | SRS 4.1 | Active |
| FR-007 | Owner-only clear; pre-clear content kept; recovery | Functional | Rachit | SRS 4.1 | Active |
| FR-008 | Board content size limit 15 MiB (M3) | Functional | Rachit | SRS 4.1 | Active |
| FR-020 | Broadcast accepted operations | Functional | Rachit | SRS 4.2 | Active |
| FR-021 | Server sequence numbers and ordering | Functional | Rachit | SRS 4.2 | Active |
| FR-022 | Independent edits preserved | Functional | Rachit | SRS 4.2 | Active |
| FR-023 | Same-object last write wins | Functional | Rachit | SRS 4.2 | Active |
| FR-024 | Full state on join | Functional | Rachit | SRS 4.2 | Active |
| FR-025 | Disconnect indicator and resync | Functional | Rachit | SRS 4.2 | Active |
| FR-026 | Rejection feedback and rollback | Functional | Rachit | SRS 4.2 | Active |
| FR-027 | Persist before broadcast | Functional | Rachit | SRS 4.2 | Active |
| FR-030 | Automatic versions, no-change rule | Functional | Rachit | SRS 4.3 | Active |
| FR-031 | Version list for all roles | Functional | Rachit | SRS 4.3 | Active |
| FR-032 | Read-only version preview | Functional | Rachit | SRS 4.3 | Active |
| FR-033 | Owner-only restore as new version; recovery | Functional | Rachit | SRS 4.3 | Active |
| FR-034 | Restored state pushed to all | Functional | Rachit | SRS 4.3 | Active |
| FR-035 | Retain at least 20 versions | Functional | Rachit | SRS 4.3 | Active |
| FR-040 | Register account | Functional | Prithvi | SRS 4.4 | Active |
| FR-041 | Log in and log out | Functional | Prithvi | SRS 4.4 | Active |
| FR-042 | Create board, creator is Owner | Functional | Prithvi | SRS 4.4 | Active |
| FR-043 | Dashboard of boards | Functional | Prithvi | SRS 4.4 | Active |
| FR-044 | Owner-only board deletion | Functional | Prithvi | SRS 4.4 | Active |
| FR-045 | Create share link with role and expiry | Functional | Prithvi | SRS 4.4 | Active |
| FR-046 | Join via link (member or guest) | Functional | Prithvi | SRS 4.4 | Active |
| FR-047 | Revoke share link | Functional | Prithvi | SRS 4.4 | Active |
| FR-048 | Expired link rejected | Functional | Prithvi | SRS 4.4 | Active |
| FR-049 | Change member role or remove | Functional | Prithvi | SRS 4.4 | Active |
| FR-050 | Transfer ownership to a member | Functional | Prithvi | SRS 4.4 | Active |
| FR-051 | Permission matrix enforced | Functional | Prithvi | SRS 4.4 | Active |
| FR-052 | Participant presence list | Functional | Prithvi | SRS 4.4 | Active |
| NFR-001 | 95% of updates visible within 500 ms | Non-functional | Rachit | SRS 5 | Active |
| NFR-002 | At least 10 concurrent participants | Non-functional | Rachit | SRS 5 | Active |
| NFR-003 | TB-STD loads within 3 s | Non-functional | Rachit | SRS 5 | Active |
| NFR-004 | Reconnect recovery within 5 s | Non-functional | Rachit | SRS 5 | Active |
| NFR-005 | Restore visible to all within 3 s | Non-functional | Rachit | SRS 5 | Active |
| NFR-006 | Chrome, Firefox, Edge support | Non-functional | Rachit | SRS 5 | Active |
| NFR-007 | Role/status visible, labelled toolbar | Non-functional | Rachit | SRS 5 | Active |
| SEC-REQ-001 | Password policy and salted hashing | Security requirement | Prithvi | SRS 5.1.2 | Active |
| SEC-REQ-002 | Tokens required, expiry, logout | Security requirement | Prithvi | SRS 5.1.2 | Active |
| SEC-REQ-003 | Server-side authorisation of every request/event | Security requirement | Prithvi | SRS 5.1.2 | Active |
| SEC-REQ-004 | Link token entropy, hashing, expiry | Security requirement | Prithvi | SRS 5.1.2 | Active |
| SEC-REQ-005 | Schema validation, size limit, no HTML | Security requirement | Prithvi | SRS 5.1.2 | Active |
| SEC-REQ-006 | Login and operation rate limits | Security requirement | Prithvi | SRS 5.1.2 | Active |
| SEC-REQ-007 | TLS 1.2+ in deployment | Security requirement | Prithvi | SRS 5.1.2 | Active |
| SEC-REQ-008 | Security event logging without secrets | Security requirement | Prithvi | SRS 5.1.2 | Active |
| SEC-OBJ-001 | Confidentiality of boards | Security objective | Prithvi | SRS 5.1.1 | Active |
| SEC-OBJ-002 | Integrity of content and history | Security objective | Prithvi | SRS 5.1.1 | Active |
| SEC-OBJ-003 | Accountability and abuse resistance | Security objective | Prithvi | SRS 5.1.1 | Active |
| UC-01 | Collaborate on a board | Use-case diagram | Rachit | SRS 7.1 | Active |
| UC-02 | Access and sharing | Use-case diagram | Prithvi | SRS 7.2 | Active |
| COMP-01 | Whiteboard Client UI | Component | Krishna | SAD 3.4 | Active |
| COMP-02 | Client Sync Module | Component | Krishna | SAD 3.4 | Active |
| COMP-03 | REST API Layer | Component | Krishna | SAD 3.4 | Active |
| COMP-04 | Auth Service | Component | Krishna | SAD 3.4 | Active |
| COMP-05 | Board & Access Service | Component | Krishna | SAD 3.4 | Active |
| COMP-06 | Real-time Collaboration Server | Component | Krishna | SAD 3.4 | Active |
| COMP-07 | Version History Service | Component | Krishna | SAD 3.4 | Active |
| COMP-08 | Persistence Layer | Component | Krishna | SAD 3.4 | Active |
| COMP-09 | Logging & Monitoring | Component | Krishna | SAD 3.4 | Active |
| SD-01 | Live drawing synchronisation and conflict | Sequence diagram | Krishna | SAD 4.2 | Active |
| SD-02 | Restore a previous version | Sequence diagram | Rachit | SAD 4.2 | Active |
| SD-03 | Join via share link and revocation | Sequence diagram | Prithvi | SAD 4.2 | Active |
| SD-04 | Transfer board ownership | Sequence diagram | Prithvi | SAD 4.2 | Active |
| SD-05 | Clear board with interrupted-clear recovery | Sequence diagram | Rachit | SAD 4.2 | Active |
| API-01 | Real-time board events (Socket.IO) | API | Krishna | SAD 4.3 | Active |
| API-02 | Accounts, boards, links, members and ownership (REST) | API | Prithvi | SAD 4.3 | Active |
| API-03 | Version history (REST) | API | Rachit | SAD 4.3 | Active |
| TC-001 | Freehand stroke with colour and width is synchronised | Test case | Pranav | STP test cases | Active |
| TC-002 | Shapes and text are created and synchronised | Test case | Pranav | STP test cases | Active |
| TC-003 | Select, move, restyle and delete an object | Test case | Pranav | STP test cases | Active |
| TC-004 | Eraser removes whole touched objects | Test case | Pranav | STP test cases | Active |
| TC-005 | Clearing a board and the before-clear version | Test case | Pranav | STP test cases | Active |
| TC-006 | Concurrent edits to different objects | Test case | Pranav | STP test cases | Active |
| TC-007 | Concurrent edits to the same object (LWW) | Test case | Pranav | STP test cases | Active |
| TC-008 | Late joiner receives full state | Test case | Pranav | STP test cases | Active |
| TC-009 | Reconnection recovery | Test case | Pranav | STP test cases | Active |
| TC-010 | Rejected operation is rolled back | Test case | Pranav | STP test cases | Active |
| TC-011 | Board survives server restart | Test case | Pranav | STP test cases | Active |
| TC-012 | Automatic versions, no-change rule, list and preview | Test case | Pranav | STP test cases | Active |
| TC-013 | Owner restore creates new version for all | Test case | Pranav | STP test cases | Active |
| TC-014 | Version retention | Test case | Pranav | STP test cases | Active |
| TC-015 | Register, log in, log out | Test case | Pranav | STP test cases | Active |
| TC-016 | Create, list and delete boards | Test case | Pranav | STP test cases | Active |
| TC-017 | Share link creation, joining and presence | Test case | Pranav | STP test cases | Active |
| TC-018 | Ownership transfer | Test case | Pranav | STP test cases | Active |
| TC-019 | Synchronisation latency and capacity | Test case | Pranav | STP test cases | Active |
| TC-020 | Initial board load time | Test case | Pranav | STP test cases | Active |
| TC-021 | Browser compatibility, viewport and usability checklist | Test case | Pranav | STP test cases | Active |
| TC-022 | Board content size limit | Test case | Pranav | STP test cases | Active |
| TC-023 | Member role change and removal | Test case | Pranav | STP test cases | Active |
| TC-024 | Restore: failure before commit, interrupted restore recovery, idempotent retry | Test case | Pranav | STP test cases | Active |
| TC-025 | Clear: version write failure and interrupted clear recovery | Test case | Pranav | STP test cases | Active |
| TC-101 | Crafted real-time messages from unauthorised roles | Test case | Prithvi | STP test cases | Active |
| TC-102 | REST authorisation matrix and object references | Test case | Prithvi | STP test cases | Active |
| TC-103 | Share-link revocation and expiry | Test case | Prithvi | STP test cases | Active |
| TC-104 | Link token strength, storage and secret-free logs | Test case | Prithvi | STP test cases | Active |
| TC-105 | Password policy and storage | Test case | Prithvi | STP test cases | Active |
| TC-106 | Authentication tokens: missing, tampered, expired, logged out, wrong board | Test case | Prithvi | STP test cases | Active |
| TC-107 | Input validation, XSS and oversized messages | Test case | Prithvi | STP test cases | Active |
| TC-108 | Rate limiting | Test case | Prithvi | STP test cases | Active |
| TC-109 | Transport security in deployment | Test case | Prithvi | STP test cases | Active |

## Change log

| Date | ID | Change | Reason | Approved in PR |
|---|---|---|---|---|
| 10-10-2026 | all | Initial allocation (draft v0.1) | First draft | — |
| 10-10-2026 | FR-008 | Added: board content limit 15 MB | Snapshot size policy needed a requirement | — |
| 10-10-2026 | SD-04 | Added: ownership-transfer sequence diagram | FR-050 lacked a design flow | — |
| 10-10-2026 | TC-018 | Scope narrowed to ownership transfer (FR-050); title changed | Endpoint fully specified; test needed negative cases | — |
| 10-10-2026 | TC-022 | Added: board content size limit test | Verifies FR-008 | — |
| 10-10-2026 | TC-023 | Added: member role change and removal (FR-049, moved from TC-018) | Keep one feature per test case | — |
| 10-10-2026 | TC-005, TC-012 | Rewritten for the no-change rule (D5b) | Resolved clear/version contradiction | — |
| 10-10-2026 | FR-025, NFR-004 | SD-01 added as design element (reconnection part) | SD-01 now shows reconnection recovery (v0.3) | — |
| 10-10-2026 | RTM | Columns renamed to the SRS template headings (Section ref / Design Spec, Module); no ID changed | Template compliance (v0.3) | — |
| 10-10-2026 | TC-024 | Added: version write failure and interrupted restore recovery (FR-007, FR-033) | Crash-recovery design needed a verifying test (v0.4) | — |
| 10-10-2026 | TC-022 | Rewritten with explicit size measures M1-M4 and a measured generator | Message size and BSON size were conflated (v0.4) | — |
| 10-10-2026 | FR-033 | COMP-08 added to the design mapping (start-up recovery) | v0.4 recovery design | — |
| 10-10-2026 | SD-05, TC-025 | Added: clear flow with interrupted-clear recovery and its fault-injection test; FR-007 now maps to TC-005, TC-025 (TC-024 covers restore only) | Durable-journal recovery design (v1.0) | — |
| 11-10-2026 | TC-024 | Title changed; steps added for every failure point of SAD §3.6, concurrent restores and retries | The restore version is written after the commit point, so a version-write failure is not a pre-commit failure | — |
| 11-10-2026 | TC-025 | Steps added: crash before the commit, crash after completion, failed start-up recovery | Every failure point of SAD §3.6 needs a test | — |
| 11-10-2026 | SEC-REQ-008 | Required fields and `null` representation defined; components COMP-03 to COMP-07 added to the design mapping | Events such as a failed login have no actor or board (D13b) | — |
| 11-10-2026 | SEC-REQ-006, TC-108 | Limit counted per entered e-mail address, registered or not; TC-108 step 2 added for an unregistered address | Removes account enumeration through `429` vs `401` (ID unchanged) | — |
| 11-10-2026 | SEC-REQ-008, TC-104 | `subjectId` (internal account ID or `null`) added to the required fields; entered e-mail added to the prohibited content | SRS, SAD §3.9.6, STP §5.1 and TC-104 now list the same fields (ID unchanged) | — |
