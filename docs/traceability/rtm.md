<!-- Owner: Prithvi | Master RTM. Every author updates rows for their own work; Prithvi checks completeness. -->

| Req ID | Requirement short | Section ref / Design Spec | Module | Test case(s) | Status (N/P/A) | Comments |
|---|---|---|---|---|---|---|
| FR-001 | Freehand stroke | SRS 4.1 / SD-01, API-01 | COMP-01, COMP-02, COMP-06 | TC-001 | P |  |
| FR-002 | Colour and stroke width | SRS 4.1 / API-01 | COMP-01 | TC-001 | P |  |
| FR-003 | Rectangle, ellipse, line | SRS 4.1 / API-01 | COMP-01, COMP-02, COMP-06 | TC-002 | P |  |
| FR-004 | Text objects | SRS 4.1 / API-01 | COMP-01, COMP-02, COMP-06 | TC-002 | P |  |
| FR-005 | Select, move, restyle, delete | SRS 4.1 / API-01 | COMP-01, COMP-02, COMP-06 | TC-003 | P |  |
| FR-006 | Object eraser | SRS 4.1 / API-01 | COMP-01, COMP-02, COMP-06 | TC-004 | P |  |
| FR-007 | Owner-only clear; pre-clear content kept; recovery | SRS 4.1 / SD-05, API-01 | COMP-05, COMP-06, COMP-07, COMP-08 | TC-005, TC-025 | P |  |
| FR-008 | Board content size limit 15 MiB (M3) | SRS 4.1 / SD-01, API-01 | COMP-01, COMP-06 | TC-022 | P |  |
| FR-020 | Broadcast accepted operations | SRS 4.2 / SD-01, API-01 | COMP-02, COMP-06 | TC-001, TC-002 | P |  |
| FR-021 | Server sequence numbers and ordering | SRS 4.2 / SD-01, API-01 | COMP-02, COMP-06 | TC-006, TC-007 | P |  |
| FR-022 | Independent edits preserved | SRS 4.2 / SD-01 | COMP-06 | TC-006 | P |  |
| FR-023 | Same-object last write wins | SRS 4.2 / SD-01 | COMP-02, COMP-06 | TC-007 | P |  |
| FR-024 | Full state on join | SRS 4.2 / SD-03, API-01 | COMP-06, COMP-08 | TC-008 | P |  |
| FR-025 | Disconnect indicator and resync | SRS 4.2 / SD-01, API-01 | COMP-02, COMP-06 | TC-009 | P |  |
| FR-026 | Rejection feedback and rollback | SRS 4.2 / SD-01, API-01 | COMP-02, COMP-06 | TC-010 | P |  |
| FR-027 | Persist before broadcast | SRS 4.2 / SD-01 | COMP-06, COMP-08 | TC-011 | P |  |
| FR-030 | Automatic versions, no-change rule | SRS 4.3 / API-03 | COMP-07, COMP-08 | TC-005, TC-012 | P |  |
| FR-031 | Version list for all roles | SRS 4.3 / API-03 | COMP-01, COMP-07 | TC-012 | P |  |
| FR-032 | Read-only version preview | SRS 4.3 / API-03 | COMP-01, COMP-07 | TC-012 | P |  |
| FR-033 | Owner-only restore as new version; recovery | SRS 4.3 / SD-02, API-03 | COMP-05, COMP-07, COMP-08 | TC-013, TC-024, TC-102 | P |  |
| FR-034 | Restored state pushed to all | SRS 4.3 / SD-02, API-01 | COMP-06, COMP-07 | TC-013 | P |  |
| FR-035 | Retain at least 20 versions | SRS 4.3 / API-03 | COMP-07, COMP-08 | TC-014 | P |  |
| FR-040 | Register account | SRS 4.4 / API-02 | COMP-03, COMP-04 | TC-015 | P |  |
| FR-041 | Log in and log out | SRS 4.4 / API-02 | COMP-03, COMP-04 | TC-015 | P |  |
| FR-042 | Create board, creator is Owner | SRS 4.4 / API-02 | COMP-03, COMP-05 | TC-016 | P |  |
| FR-043 | Dashboard of boards | SRS 4.4 / API-02 | COMP-01, COMP-03, COMP-05 | TC-016 | P |  |
| FR-044 | Owner-only board deletion | SRS 4.4 / API-02 | COMP-05, COMP-06 | TC-016, TC-102 | P |  |
| FR-045 | Create share link with role and expiry | SRS 4.4 / API-02 | COMP-05 | TC-017 | P |  |
| FR-046 | Join via link (member or guest) | SRS 4.4 / SD-03, API-02 | COMP-04, COMP-05 | TC-017 | P |  |
| FR-047 | Revoke share link | SRS 4.4 / SD-03, API-02 | COMP-05, COMP-06 | TC-103 | P |  |
| FR-048 | Expired link rejected | SRS 4.4 / SD-03 | COMP-05, COMP-06 | TC-103 | P |  |
| FR-049 | Change member role or remove | SRS 4.4 / API-02 | COMP-05, COMP-06 | TC-023 | P |  |
| FR-050 | Transfer ownership to a member | SRS 4.4 / SD-04, API-02 | COMP-03, COMP-05, COMP-06 | TC-018 | P |  |
| FR-051 | Permission matrix enforced | SRS 4.4 / SD-01, SD-02, SD-03, SD-04, SD-05 | COMP-03, COMP-05, COMP-06 | TC-101, TC-102 | P |  |
| FR-052 | Participant presence list | SRS 4.4 / API-01 | COMP-01, COMP-06 | TC-017 | P |  |
| NFR-001 | 95% of updates visible within 500 ms | SRS 5 / SD-01 | COMP-02, COMP-06, COMP-09 | TC-019 | P |  |
| NFR-002 | At least 10 concurrent participants | SRS 5 | COMP-06 | TC-019 | P |  |
| NFR-003 | TB-STD loads within 3 s | SRS 5 | COMP-01, COMP-03 | TC-020 | P |  |
| NFR-004 | Reconnect recovery within 5 s | SRS 5 / SD-01 | COMP-02, COMP-06 | TC-009 | P |  |
| NFR-005 | Restore visible to all within 3 s | SRS 5 / SD-02 | COMP-06, COMP-07 | TC-013 | P |  |
| NFR-006 | Chrome, Firefox, Edge support | SRS 5 | COMP-01 | TC-021 | P | TC-021 Pass with limitations (17-10-2026): manual in Firefox 158 and Chrome, automated in Chrome and Edge; Edge not checked by hand; the automated run predates the stroke-width tooltip fix |
| NFR-007 | Role/status visible, labelled toolbar | SRS 5 | COMP-01 | TC-021 | P | TC-021 Pass with limitations (17-10-2026): stroke-width tooltip defect found and fixed during TC-021, re-checked in Firefox only |
| SEC-REQ-001 | Password policy and salted hashing | SRS 5.1.2 / API-02 | COMP-04, COMP-08 | TC-105 | P |  |
| SEC-REQ-002 | Tokens required, expiry, logout | SRS 5.1.2 / SD-03, API-01, API-02 | COMP-03, COMP-04, COMP-06 | TC-106 | P |  |
| SEC-REQ-003 | Server-side authorisation of every request/event | SRS 5.1.2 / SD-01, SD-02, SD-03, SD-04, SD-05 | COMP-03, COMP-05, COMP-06 | TC-101, TC-102 | P |  |
| SEC-REQ-004 | Link token entropy, hashing, expiry | SRS 5.1.2 / SD-03, API-02 | COMP-05, COMP-08 | TC-103, TC-104 | P |  |
| SEC-REQ-005 | Schema validation, size limit, no HTML | SRS 5.1.2 / API-01, API-02, API-03 | COMP-01, COMP-03, COMP-06 | TC-107 | P |  |
| SEC-REQ-006 | Login and operation rate limits | SRS 5.1.2 / API-01, API-02 | COMP-03, COMP-06 | TC-108 | P |  |
| SEC-REQ-007 | TLS 1.2+ in deployment | SRS 5.1.2 | COMP-03, COMP-06 | TC-109 | N | TC-109 Blocked: no deployed HTTPS instance |
| SEC-REQ-008 | Security event logging without secrets | SRS 5.1.2 / SD-04 | COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-09 | TC-104 | P |  |

Security objectives are traced through the security requirements that realise them (SRS 5.1.1):

| Objective | Realised by | Test case(s) | Status (N/P/A) |
|---|---|---|---|
| SEC-OBJ-001 | SEC-REQ-002, SEC-REQ-003, SEC-REQ-004, SEC-REQ-007 | TC-101, TC-102, TC-103, TC-104, TC-106, TC-109 | N |
| SEC-OBJ-002 | SEC-REQ-003, SEC-REQ-005, FR-033 | TC-013, TC-101, TC-102, TC-107 | P |
| SEC-OBJ-003 | SEC-REQ-006, SEC-REQ-008 | TC-104, TC-108 | P |
