<!-- Owner: Rachit | Reviewers: Pranav | Status: v1.0 -->

## 6. Quality attributes & Acceptance tests

- **Exit criteria for acceptance:** every High-priority functional and security requirement is implemented and its test cases pass; every NFR test case passes against the targets of §5; the RTM (§8) shows every requirement linked to at least one executed test case with status "P" (passed); no open defect of severity Critical or High.
- **Acceptance test suites** (defined in STP §5 and §13):
  - Canvas editing — TC-001 to TC-005, TC-022
  - Real-time synchronisation and recovery — TC-006 to TC-011
  - Version history and recovery — TC-012 to TC-014, TC-024, TC-025
  - Accounts, boards, sharing and roles — TC-015 to TC-018, TC-023
  - Performance and capacity — TC-019, TC-020 (and the timing parts of TC-009, TC-013)
  - Compatibility and usability — TC-021
  - Security — TC-101 to TC-109
- **Quality attributes and their measures:** responsiveness (NFR-001, NFR-003, NFR-005), capacity (NFR-002), reliability and recoverability (FR-025, FR-027, NFR-004), consistency (FR-021 to FR-023), usability (NFR-007), portability (NFR-006), security (§5.1).
- **Status of results:** historical (v1.0): no test had been executed. After the execution of 12-10-2026 (uncommitted working tree on base commit 82af885; see `docs/IMPLEMENTATION_STATUS.md`): 32 test cases Pass, 2 Blocked (TC-021, TC-109), none Fail; RTM status P for every requirement except NFR-006, NFR-007 and SEC-REQ-007 (N). Addendum 17-10-2026: TC-021 was executed manually and set to Pass with limitations (STP TC-021 record), so 33 test cases are Pass and 1 Blocked (TC-109), none Fail; RTM status P for every requirement except SEC-REQ-007 (N). The STP exit criteria are not yet met (TC-109 Blocked; four-member review of the test summary outstanding, STP §14). Results will be recorded in the STP test-case "Actual result" and "Status" fields, and the RTM status is derived from them by the rules in §8.
