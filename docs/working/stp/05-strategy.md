<!-- Owner: Pranav | Reviewers: Krishna, Rachit | Status: v1.0 -->

## 5. Test Approach / Strategy

**Levels:**

- **Unit tests:** permission policy (every cell of the FR-051 matrix), payload schemas, sequencing and last-write-wins logic, version triggers and retention, token issuing and verification, client reconciliation (pending, confirm, rollback).
- **Integration tests:** REST endpoints against a test database (API-02, API-03); Socket.IO event flows with several scripted clients (API-01); interaction of COMP-07 with COMP-06 during restore.
- **System (end-to-end) tests:** browser-driven scenarios with two or more real browser sessions for the functional test cases (TC-001 to TC-018, TC-022, TC-023); TC-024 and TC-025 are integration tests with fault injection.
- **Acceptance tests:** the suites listed in SRS §6, run on the release candidate and reviewed by all four members.

**Types:**

- Functional testing (positive and negative) of every functional requirement.
- Concurrency testing with scripted clients that submit operations at the same time (TC-006, TC-007).
- Recovery testing by disconnecting clients, restarting the server and injecting faults during version writes and restores (TC-009, TC-011, TC-024, TC-025).
- Performance and capacity testing with a latency harness of 10 scripted clients (TC-019) and browser timing (TC-020).
- Security testing: authorisation matrix, crafted messages, link lifecycle, token handling, input validation, rate limiting, log inspection (§5.1).
- Compatibility, viewport and usability checklist testing (TC-021).
- Boundary testing of limits (TC-001, TC-002, TC-015, TC-016, TC-022, TC-105, TC-107).
- Regression testing: the automated unit and integration suites run in CI on every Pull Request (once CI is configured, DECISIONS.md D16) and locally before every push.

**Test design techniques:** equivalence partitioning and boundary values for limits (stroke width
1/20/0/21, text 500/501 characters, password 7/8/72/73 characters, 65,536-byte message size, 15,728,640-byte board content size); decision
tables for the permission matrix; state transitions for share links (active → expired / revoked)
and connections (connected → disconnected → resynchronised).

**Entry criteria** (status at the execution of 12-10-2026: build, health check, test data and test-case review met; the team sign-off of SRS, SAD and STP v1.0 was **not** met — the execution was run before sign-off and must be confirmed or repeated after it, §11): SRS, SAD and STP v1.0 signed off by the team; build deployed in the test environment (§6) and the
health check returns `ok`; test data (TB-STD, accounts) loaded; test cases reviewed by a second
team member.

**Exit criteria:** 100% of planned test cases executed; all High-priority test cases passed; no
open defect of severity Critical or High; every requirement in the RTM has status P or an
approved, documented exception; test summary report reviewed by all four members.

**Defect severity:** Critical — data loss, security breach or crash; High — a requirement fails
with no workaround; Medium — a requirement fails with a workaround; Low — cosmetic.
