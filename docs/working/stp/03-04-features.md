<!-- Owner: Pranav | Reviewers: Rachit, Prithvi | Status: v1.0 -->

## 3. Features to be Tested

Features mapped to SRS requirement IDs and test cases (full mapping in §13):

| Feature | Requirement IDs | Test cases |
|---|---|---|
| Freehand drawing, colour and width | FR-001, FR-002, FR-020 | TC-001 |
| Shapes and text | FR-003, FR-004, FR-020 | TC-002 |
| Object editing and erasing | FR-005, FR-006 | TC-003, TC-004 |
| Owner-only clear with pre-clear version, interrupted-clear recovery; board size limit | FR-007, FR-030, FR-008 | TC-005, TC-022, TC-025 |
| Ordering and concurrent edits | FR-021, FR-022, FR-023 | TC-006, TC-007 |
| Joining, reconnection, rejection, persistence | FR-024, FR-025, FR-026, FR-027, NFR-004 | TC-008, TC-009, TC-010, TC-011 |
| Version history: automatic versions and no-change rule, list, preview, restore, retention | FR-030 to FR-035, NFR-005 | TC-005, TC-012, TC-013, TC-014, TC-024, TC-102 |
| Accounts and boards | FR-040 to FR-044 | TC-015, TC-016, TC-102 |
| Share links, membership, roles, ownership transfer, presence | FR-045 to FR-052 | TC-017, TC-018, TC-023, TC-101, TC-102, TC-103 |
| Performance and capacity | NFR-001, NFR-002, NFR-003 | TC-019, TC-020 |
| Compatibility, 1280 px viewport and usability | NFR-006, NFR-007 | TC-021 |
| Security requirements | SEC-REQ-001 to SEC-REQ-008 | TC-101 to TC-109 (see §5.1) |

## 4. Features Not to be Tested

| Item | Reason |
|---|---|
| Candidate enhancements (undo/redo across users, live cursors, export, chat, advanced version comparison, mobile optimisation) | Not in version 1.0 scope (SRS §2.2). |
| Behaviour on unsupported browsers and mobile devices | Outside NFR-006. |
| Horizontal scaling across several server instances | Out of scope (SRS §2.5). |
| Internal correctness of third-party libraries (React, Express.js, Socket.IO, MongoDB, bcrypt, JWT library) | Assumed tested by their maintainers; only our use of them is tested. |
| Performance over the public Internet or with artificial network delay | Targets are defined for the local test environment (SRS §5, D7b). |
| Long-term availability (uptime percentage) | No availability requirement in version 1.0. |
| Formal penetration test by an external party and formal WCAG audit | Beyond course resources; replaced by the security test cases in §5.1 and the usability checklist in TC-021. |
