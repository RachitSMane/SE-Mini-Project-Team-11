<!-- Owner: Prithvi | Reviewers: Pranav, Rachit | Status: v1.0 -->

## 13. Test Case Management & Traceability

- Test case identifiers: TC-001 to TC-099 for functional and non-functional tests (owned by the STP lead), TC-101 to TC-199 for security tests (owned by the security lead). Identifiers are registered in `docs/traceability/id-registry.md` and never renumbered; a changed scope is recorded in the registry change log (e.g. TC-018 narrowed to ownership transfer in v0.2, with FR-049 moved to the new TC-023).
- Each test case lists the requirement IDs it verifies. The master RTM below maps every requirement to its test cases. `tools/check_trace.py` checks that every requirement has at least one test case, that every referenced test case exists, that the SRS, RTM and test cases agree on these links, and that RTM statuses agree with test-case statuses.
- Test case specifications are maintained in the repository (Appendix A) and changed only through reviewed Pull Requests. Execution results are recorded in the "Actual result" and "Status" fields; a result is recorded only from an actual run, together with the build (Git commit) and date.

**Test-case status values**

| Status | Meaning |
|---|---|
| Not executed | The test has not been run on the current build (initial value). |
| Pass | The test was run and every pass criterion was met; "Actual result" records the evidence. |
| Fail | The test was run and at least one pass criterion was not met; a defect is raised. |
| Blocked | The test could not be run (e.g. missing environment, blocking defect, no deployment); the reason is recorded in "Actual result". |

**RTM status per requirement (derived; never set by hand)**

| RTM status | Rule |
|---|---|
| P | Every linked test case has status Pass. |
| A | At least one linked test case has status Fail (attempted, defect open). |
| N | Otherwise: at least one linked test case is Not executed or Blocked and none has failed. Blocked tests are named, with the reason, in the RTM "Comments" column. |

A Blocked or Not executed test never counts as a pass. After the execution of 12-10-2026 the RTM
status is P for every requirement except NFR-006 and NFR-007 (TC-021 Blocked) and SEC-REQ-007
(TC-109 Blocked), which remain N. After TC-021 was set to Pass on 17-10-2026 (with limitations, TC-021
record), NFR-006 and NFR-007 are P; only SEC-REQ-007 remains N.

<!-- include: docs/traceability/rtm.md -->
<!-- Owner: Prithvi | Reviewers: Pranav, Rachit | Status: v1.0 -->

## 13. Test Case Management & Traceability

- Test case identifiers: TC-001 to TC-099 for functional and non-functional tests (owned by the STP lead), TC-101 to TC-199 for security tests (owned by the security lead). Identifiers are registered in `docs/traceability/id-registry.md` and never renumbered; a changed scope is recorded in the registry change log (e.g. TC-018 narrowed to ownership transfer in v0.2, with FR-049 moved to the new TC-023).
- Each test case lists the requirement IDs it verifies. The master RTM below maps every requirement to its test cases. `tools/check_trace.py` checks that every requirement has at least one test case, that every referenced test case exists, that the SRS, RTM and test cases agree on these links, and that RTM statuses agree with test-case statuses.
- Test case specifications are maintained in the repository (Appendix A) and changed only through reviewed Pull Requests. Execution results are recorded in the "Actual result" and "Status" fields; a result is recorded only from an actual run, together with the build (Git commit) and date.

**Test-case status values**

| Status | Meaning |
|---|---|
| Not executed | The test has not been run on the current build (initial value). |
| Pass | The test was run and every pass criterion was met; "Actual result" records the evidence. |
| Fail | The test was run and at least one pass criterion was not met; a defect is raised. |
| Blocked | The test could not be run (e.g. missing environment, blocking defect, no deployment); the reason is recorded in "Actual result". |

**RTM status per requirement (derived; never set by hand)**

| RTM status | Rule |
|---|---|
| P | Every linked test case has status Pass. |
| A | At least one linked test case has status Fail (attempted, defect open). |
| N | Otherwise: at least one linked test case is Not executed or Blocked and none has failed. Blocked tests are named, with the reason, in the RTM "Comments" column. |

A Blocked or Not executed test never counts as a pass. After the execution of 12-10-2026 the RTM
status is P for every requirement except NFR-006 and NFR-007 (TC-021 Blocked) and SEC-REQ-007
(TC-109 Blocked), which remain N. After TC-021 was set to Pass on 17-10-2026 (with limitations, TC-021
record), NFR-006 and NFR-007 are P; only SEC-REQ-007 remains N.

<!-- include: docs/traceability/rtm.md -->
