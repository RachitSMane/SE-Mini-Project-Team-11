<!-- Owner: Krishna | Reviewers: Rachit, Prithvi | Status: v1.0 -->

### 3.8 Traceability to Requirements

Every SRS requirement is realised by at least one component. The component column must match the
"Module" column, and the design elements must match the "Design Spec" part, of the master RTM; `tools/check_trace.py` verifies this.

| Req ID | Requirement short | Component(s) | Design elements |
|---|---|---|---|
| FR-001 | Freehand stroke | COMP-01, COMP-02, COMP-06 | SD-01, API-01 |
| FR-002 | Colour and stroke width | COMP-01 | API-01 |
| FR-003 | Rectangle, ellipse, line | COMP-01, COMP-02, COMP-06 | API-01 |
| FR-004 | Text objects | COMP-01, COMP-02, COMP-06 | API-01 |
| FR-005 | Select, move, restyle, delete | COMP-01, COMP-02, COMP-06 | API-01 |
| FR-006 | Object eraser | COMP-01, COMP-02, COMP-06 | API-01 |
| FR-007 | Owner-only clear; pre-clear content kept; recovery | COMP-05, COMP-06, COMP-07, COMP-08 | SD-05, API-01 |
| FR-008 | Board content size limit 15 MiB (M3) | COMP-01, COMP-06 | SD-01, API-01 |
| FR-020 | Broadcast accepted operations | COMP-02, COMP-06 | SD-01, API-01 |
| FR-021 | Server sequence numbers and ordering | COMP-02, COMP-06 | SD-01, API-01 |
| FR-022 | Independent edits preserved | COMP-06 | SD-01 |
| FR-023 | Same-object last write wins | COMP-02, COMP-06 | SD-01 |
| FR-024 | Full state on join | COMP-06, COMP-08 | SD-03, API-01 |
| FR-025 | Disconnect indicator and resync | COMP-02, COMP-06 | SD-01, API-01 |
| FR-026 | Rejection feedback and rollback | COMP-02, COMP-06 | SD-01, API-01 |
| FR-027 | Persist before broadcast | COMP-06, COMP-08 | SD-01 |
| FR-030 | Automatic versions, no-change rule | COMP-07, COMP-08 | API-03 |
| FR-031 | Version list for all roles | COMP-01, COMP-07 | API-03 |
| FR-032 | Read-only version preview | COMP-01, COMP-07 | API-03 |
| FR-033 | Owner-only restore as new version; recovery | COMP-05, COMP-07, COMP-08 | SD-02, API-03 |
| FR-034 | Restored state pushed to all | COMP-06, COMP-07 | SD-02, API-01 |
| FR-035 | Retain at least 20 versions | COMP-07, COMP-08 | API-03 |
| FR-040 | Register account | COMP-03, COMP-04 | API-02 |
| FR-041 | Log in and log out | COMP-03, COMP-04 | API-02 |
| FR-042 | Create board, creator is Owner | COMP-03, COMP-05 | API-02 |
| FR-043 | Dashboard of boards | COMP-01, COMP-03, COMP-05 | API-02 |
| FR-044 | Owner-only board deletion | COMP-05, COMP-06 | API-02 |
| FR-045 | Create share link with role and expiry | COMP-05 | API-02 |
| FR-046 | Join via link (member or guest) | COMP-04, COMP-05 | SD-03, API-02 |
| FR-047 | Revoke share link | COMP-05, COMP-06 | SD-03, API-02 |
| FR-048 | Expired link rejected | COMP-05, COMP-06 | SD-03 |
| FR-049 | Change member role or remove | COMP-05, COMP-06 | API-02 |
| FR-050 | Transfer ownership to a member | COMP-03, COMP-05, COMP-06 | SD-04, API-02 |
| FR-051 | Permission matrix enforced | COMP-03, COMP-05, COMP-06 | SD-01, SD-02, SD-03, SD-04, SD-05 |
| FR-052 | Participant presence list | COMP-01, COMP-06 | API-01 |
| NFR-001 | 95% of updates visible within 500 ms | COMP-02, COMP-06, COMP-09 | SD-01 |
| NFR-002 | At least 10 concurrent participants | COMP-06 | — |
| NFR-003 | TB-STD loads within 3 s | COMP-01, COMP-03 | — |
| NFR-004 | Reconnect recovery within 5 s | COMP-02, COMP-06 | SD-01 |
| NFR-005 | Restore visible to all within 3 s | COMP-06, COMP-07 | SD-02 |
| NFR-006 | Chrome, Firefox, Edge support | COMP-01 | — |
| NFR-007 | Role/status visible, labelled toolbar | COMP-01 | — |
| SEC-REQ-001 | Password policy and salted hashing | COMP-04, COMP-08 | API-02 |
| SEC-REQ-002 | Tokens required, expiry, logout | COMP-03, COMP-04, COMP-06 | SD-03, API-01, API-02 |
| SEC-REQ-003 | Server-side authorisation of every request/event | COMP-03, COMP-05, COMP-06 | SD-01, SD-02, SD-03, SD-04, SD-05 |
| SEC-REQ-004 | Link token entropy, hashing, expiry | COMP-05, COMP-08 | SD-03, API-02 |
| SEC-REQ-005 | Schema validation, size limit, no HTML | COMP-01, COMP-03, COMP-06 | API-01, API-02, API-03 |
| SEC-REQ-006 | Login and operation rate limits | COMP-03, COMP-06 | API-01, API-02 |
| SEC-REQ-007 | TLS 1.2+ in deployment | COMP-03, COMP-06 | — |
| SEC-REQ-008 | Security event logging without secrets | COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-09 | SD-04 |

Reverse view: each component lists the requirements it realises in 3.4, and each API lists its requirements in 4.3.
