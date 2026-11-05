# Testing reports — Team 11

The four testing reports required for the final evaluation (checklist Part 3, "Generated Reports (docs
folder)"; FAQ "What artifacts must be finalized"). All four come from one test session on
**05-11-2026** on the code that is on `main` (`64876d8`); the application and its tests were not changed.

| Report | Key result |
|---|---|
| [Unit Testing Report](UNIT_TESTING_REPORT.md) | 110 / 110 unit tests passed (9 suites) |
| [System Validation Report](SYSTEM_VALIDATION_REPORT.md) | integration 100 / 100, E2E 31 / 31 (Chromium); STP 33 Pass, 1 Blocked (TC-109), 0 Fail; 49 of 50 requirements verified |
| [Code Coverage Report](CODE_COVERAGE_REPORT.md) | lines: server 95.21 %, shared 97.11 %, whole code base 58.24 % (React UI is E2E-tested, not measured) |
| [Branch Coverage Report](BRANCH_COVERAGE_REPORT.md) | branches: server 90.00 %, shared 89.91 %, all measured 89.67 % (unloaded files excluded, see §2 there) |

## Contents of this folder

| Path | What it is |
|---|---|
| `evidence/2026-11-05/00-environment.txt` | machine, versions, tested commit, timings |
| `evidence/2026-11-05/01-…` to `08-…` | console logs: unit + coverage, unit + integration + coverage, E2E, lint, traceability, documentation tool tests, size model, documentation consistency |
| `evidence/2026-11-05/jest-results-*.json` | Jest per-test results (`--json`) |
| `evidence/2026-11-05/coverage-summary-*.json`, `lcov-*.info` | coverage data |
| `coverage-html/` | browsable HTML coverage report (open `coverage-html/index.html`) |
| `make_coverage_tables.py` | regenerates the coverage tables from a `coverage-summary.json` |

## Reproducing

```
npm ci
npm run test:unit                    # unit only
npm test                             # unit + integration (needs mongod on PATH, or TEST_MONGO_URL)
npm run test:e2e                     # client test build + Playwright Chromium
# coverage: add  --coverage --coverageProvider=v8 --collectCoverageFrom=...  to the Jest command (full command in CODE_COVERAGE_REPORT.md §2)
python docs/testing-reports/make_coverage_tables.py coverage/coverage-summary.json
```

Earlier test evidence (not repeated here): `docs/evidence/` (per date) and
`docs/reports/RELEASE_READINESS_2026-11-02.md`.
