<!-- Owner: Rachit | Reviewers: Prithvi, Krishna, Pranav | Status: v1.0 -->

# Software Requirements Specification (SRS)

**Project:** Real-Time Collaborative Virtual Whiteboard

**Team:** Team 11 — Rachit S Mane, P Chinni Krishna Reddy, Pranav V Menon, Prithvi W

**Version:** 1.0

**Date:** 11-10-2026

**Status:** Final for submission — team sign-off pending (see Approvals); written before implementation (historical); implemented and tested in the execution of 12-10-2026 (uncommitted working tree on base commit 82af885): 47 of 50 requirements verified (RTM status P); NFR-006 and NFR-007 (TC-021) and SEC-REQ-007 (TC-109) not verified because those tests are Blocked; see `docs/IMPLEMENTATION_STATUS.md`. Update 17-10-2026: TC-021 is Pass with limitations (STP TC-021 record), so 49 of 50 requirements are verified (RTM status P); only SEC-REQ-007 is not verified (TC-109 Blocked).

## Revision history

| Version | Date | Author | Change summary | Approval |
|---|---|---|---|---|
| 0.1 | 10-10-2026 | Rachit, Prithvi (draft) | First complete draft for team review | Pending |
| 0.2 | 10-10-2026 | Rachit, Prithvi (draft) | Version-history rules made consistent (D5b); FR-008 board size limit added; NFR measurement definitions; guest-token expiry; ownership-transfer details; FR-049 test moved to TC-023; RTM status rules | Pending |
| 0.3 | 10-10-2026 | Rachit, Prithvi (draft) | FR-008 limit defined on BSON size (15 MiB); FR-007 clear rejected if the pre-clear version cannot be stored; permission matrix lists members view; measurable acceptance exit criterion; numbered figures; RTM columns as in the template | Pending |
| 0.4 | 10-10-2026 | Rachit, Prithvi (draft) | FR-008 rewritten with explicit size measures and boundary/deletion/version acceptance criteria; message limit stated as 65,536 bytes per packet (SEC-REQ-005, §3.4); FR-007 and FR-033 cover version-write failure and interrupted-restore recovery (TC-024) | Pending |
| 1.0 | 11-10-2026 | Rachit, Prithvi | Final for submission: interrupted-clear and restore recovery and idempotent restore in FR-007/FR-033 (TC-024, TC-025); design values stated with decision references; NFR targets specified (verification pending); SEC-REQ-008 log fields and `null` representation defined; FR-033 distinguishes new restores, retries and key reuse; SEC-REQ-006 login limit per entered e-mail; SEC-REQ-008 lists the affected account (`subjectId`) | Team sign-off pending |

## Approvals

| Role | Name | Signature / Email | Date |
|---|---|---|---|
| Course Coordinator | | | |
| SRS Lead | Rachit S Mane | | |
| SAD Lead | P Chinni Krishna Reddy | | |
| STP Lead | Pranav V Menon | | |
| Security & Traceability Lead | Prithvi W | | |

## Table of Contents

1. Introduction
2. Overall description
3. External interface requirements
4. System features (detailed)
5. Non-functional requirements (detailed), including 5.1 Security
6. Quality attributes & Acceptance tests
7. System models and diagrams (UML use-case diagrams)
8. Requirements Traceability Matrix (RTM)
