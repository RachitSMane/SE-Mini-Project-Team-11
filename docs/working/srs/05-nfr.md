<!-- Owner: Rachit | Reviewers: Pranav (feasibility), Krishna | Status: v1.0 -->

## 5. Non-functional requirements (detailed)

The non-functional requirements below are measurable and tied to STP test cases. **The numeric
targets in NFR-001 to NFR-005 are the specified version 1.0 targets (DECISIONS.md D7). Historical (v1.0): they had not
been measured. They were measured in the execution of 12-10-2026 (uncommitted working tree on base commit 82af885; see `docs/IMPLEMENTATION_STATUS.md`) with TC-009, TC-013,
TC-019 and TC-020; every target was met (values in those STP test-case records). If a measurement shows that a target cannot be met, a change request updates the
requirement.**

**Common measurement conditions for NFR-001 to NFR-005 (D7b):**

- Server (application and MongoDB) on one laptop; clients on the same laptop; no artificial network delay; no other heavy applications running. Hardware, operating system, Node.js, MongoDB and browser versions and the Git commit are recorded with every result.
- Scripted clients run in **one Node.js process** and use one monotonic clock (`performance.now()`), so start and end times are comparable. Scripted clients use the same client synchronisation logic as the browser client (SAD COMP-02) but do not render.
- **TB-STD** (D7a) = 300 freehand strokes of at most 200 points each, 50 shapes and 20 text objects, produced by a seed script with a fixed random seed.
- Percentiles use the nearest-rank method: p95 = the value at position ⌈0.95 × n⌉ in the ascending list of n samples.
- Browser timings use the client's `board-ready` performance mark, which the client records when every object of the received state has been rendered and editing tools are enabled (SAD §4.1, test hooks).

| Req ID | Requirement | Category | Priority | Acceptance criteria / Measurement |
|---|---|---|---|---|
| NFR-001 | For at least 95% of accepted board operations, the time from submission by the sending client to application by each other connected client shall be at most 500 ms. | Performance | High | Quantity: latency in ms per (operation, receiving client) pair. Start: sender calls submit. End: receiver has applied the operation to its board state. Conditions: 10 scripted clients on one board, each submitting 2 valid operations per second; 10 s warm-up excluded, then 60 s measured (≈ 1,200 operations, ≈ 10,800 samples). The sender's own acknowledgement time is recorded separately and is not part of this measure. Pass: p95 ≤ 500 ms. Test: TC-019 |
| NFR-002 | The system shall support at least 10 concurrently connected participants on one board while NFR-001 is met. | Capacity / Scalability | High | During the TC-019 run with 10 clients: no client disconnects; no valid operation is rejected; every accepted operation is applied exactly once by every client (no missing or duplicate sequence numbers); all final board states are identical to the server state. Pass: all four conditions hold. Test: TC-019 |
| NFR-003 | The board view shall be ready — every TB-STD object rendered and editing tools enabled — at most 3 s after navigation starts, for a logged-in Owner. | Performance | Medium | Quantity: seconds from navigation start (time origin 0) to the `board-ready` mark. Conditions: supported browser, new browser context with empty cache for every run, 10 runs. Pass: all 10 runs ≤ 3 s; all values are reported. Test: TC-020 |
| NFR-004 | After connectivity returns, a disconnected client shall show the current server state with editing tools enabled within 5 s. | Reliability | High | Quantity: seconds from the moment the client's network is re-enabled to the `board-ready` mark after resynchronisation. Conditions: one browser client offline for 30 s while another client makes 20 changes to a TB-STD board; 10 repetitions. Pass: 10/10 repetitions ≤ 5 s and the board equals the server state each time. Test: TC-009 |
| NFR-005 | A restore of a TB-STD version shall be applied by all connected participants within 3 s. | Performance | Medium | Quantity: seconds from the Owner client sending the restore request to the last of 10 connected clients applying the restored state. Conditions: 10 scripted clients (one of them the Owner) in one process; 10 repetitions. Pass: 10/10 repetitions ≤ 3 s. Test: TC-013 |
| NFR-006 | The client shall provide all core functions in the current stable desktop versions of Google Chrome, Mozilla Firefox and Microsoft Edge at a browser viewport width of 1280 px or more. | Portability / Compatibility | Medium | The core flows of TC-001, TC-002, TC-013 and TC-017 pass in each of the three browsers at a 1280 × 720 viewport with no horizontally cut-off controls; "current stable" means the release current on the test date, and versions are recorded. Test: TC-021 |
| NFR-007 | The board view shall show the user's current role and connection status at all times, show every drawing tool directly on the toolbar (no nested menus), label every toolbar control with visible text or a tooltip, and allow every toolbar control to be reached and activated with the keyboard. | Usability / Accessibility | Medium | Checklist inspection of the board view for Owner, Editor and Viewer: all four items pass for every role. Test: TC-021 |

The sixth target from the planning baseline — "all tested unauthorised modification
attempts are rejected" — is specified as the acceptance criterion of SEC-REQ-003 (§5.1.2).
