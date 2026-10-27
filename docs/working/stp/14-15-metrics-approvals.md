<!-- Owner: Pranav | Reviewers: Prithvi | Status: v1.0 -->

## 14. Test Metrics & Reporting

Metrics collected:

- Percentage of planned test cases executed
- Percentage passed / failed
- Requirement coverage (requirements with RTM status P ÷ all requirements; see §13 for the derivation)
- Defects by severity, defect density (defects per component), defect ageing
- Performance results: p95 latency (NFR-001), maximum participants without errors (NFR-002), load, reconnect and restore times (NFR-003 to NFR-005) with hardware recorded

Reports:

- Execution status in each Pull Request (CI result and local test command output)
- Weekly execution summary during system testing
- Final Test Summary Report: results per test case, RTM status, open defects, measured performance values, and deviations from this plan

Every performance result is reported with its measured value, not only as pass or fail. Metrics of
the 12-10-2026 execution: 34 test cases; 32 Pass (94%), 0 Fail, 2 Blocked (TC-109 not run at all;
TC-021 run in Chrome and Edge only); requirement coverage 47 of 50 requirements with RTM status P; measured values in the TC-009,
TC-013, TC-019 and TC-020 records and `perf-results/*.csv`; defects found during execution are
listed in `docs/IMPLEMENTATION_STATUS.md` (all fixed and re-tested); test-reliability issues found in the re-verification of the same day (one intermittent TC-022 failure under load) are listed there; on 14-10-2026 the TC-022 failure was traced to the test harness, the changed test passed idle and once under CPU load, and a later loaded run (on battery power) finished only after the 300 s budget had elapsed (303.7 s; not a clean pass; TC-022 record). On 16-10-2026 the team decided to retain TC-022 as Pass with this timing overrun and the unresolved timing margin under load recorded as limitations (TC-022 record; `docs/reviews/TEAM_REVIEW_AGENDA.md` D-03 to D-07). On 17-10-2026 TC-021 was executed manually and, after a two-member review, set to Pass with its limitations recorded (TC-021 record); current totals: 34 test cases, 33 Pass, 0 Fail, 1 Blocked (TC-109); 49 of 50 requirements with RTM status P. The exit criteria of §5 are **not** yet met: TC-109 is Blocked without an approved exception, and the test summary has not been reviewed by all four members.

Regression run after the frontend redesign, 16-10-2026 (separate from the results above, which were obtained before it; automated only): the client's board view was restyled (layout, toolbar, side panel and dialog styling in `client/src`; no change to the server, the shared module, the APIs or the tests). On the same uncommitted working tree (base commit 82af885) afterwards: `npm run lint` clean; `npm run test:unit` 33/33 passed; `npm run test:integration` 53/53 passed; `npm run test:e2e` 10/10 passed in Playwright's Chromium; the same E2E suite with `E2E_BROWSERS=msedge,firefox` 19 passed and 1 skipped (TC-009 in Playwright's patched Firefox build, skipped by design) in Edge 155.0.4283.45 and Playwright's Firefox. Stable Firefox 157 and installed Chrome were not rerun, and no manual check was made, so TC-021 and the status of every test case are unchanged; TC-022 was not rerun under load.

## 15. Approvals

| Role | Name | Signature / Date |
|---|---|---|
| QA Lead | Pranav V Menon | |
| Security Test Lead | Prithvi W | |
| Dev Lead (SAD) | P Chinni Krishna Reddy | |
| Product Owner (SRS) | Rachit S Mane | |
