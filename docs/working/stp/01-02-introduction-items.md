<!-- Owner: Pranav | Reviewers: Rachit | Status: v1.0 -->

# Software Test Plan (STP) — Real-Time Collaborative Virtual Whiteboard

**Project:** Real-Time Collaborative Virtual Whiteboard

**Team:** Team 11 — Rachit S Mane, P Chinni Krishna Reddy, Pranav V Menon, Prithvi W

**Version:** 1.0

**Date:** 11-10-2026

**Status:** Final for submission — team sign-off pending (see §15). Execution 12-10-2026 (uncommitted working tree on base commit 82af885): 32 test cases Pass, 2 Blocked (TC-021: stable Firefox not installed at that time; TC-109: no deployment), none Fail; details in each test case and in `docs/IMPLEMENTATION_STATUS.md`. Before this execution no test had been run. TC-021 was executed manually on 17-10-2026 (installed Firefox 158 and Chrome by hand; Chrome and Edge automated) and set to **Pass** with limitations accepted by the team after a two-member review (TC-021 record), so 33 test cases are Pass and 1 Blocked (TC-109).

## Revision history

| Version | Date | Author | Change summary |
|---|---|---|---|
| 0.1 | 10-10-2026 | Pranav, Prithvi (draft) | First complete draft for team review |
| 0.2 | 10-10-2026 | Pranav, Prithvi (draft) | Status definitions and RTM mapping; version-history tests aligned with SRS §4.3; TC-018 ownership transfer; new TC-022 (board size limit) and TC-023 (member roles); reproducible performance procedures; dependency field in every test case |
| 0.3 | 10-10-2026 | Pranav, Prithvi (draft) | TC-022 uses the BSON size measure; TC-005 notes unit-level verification of a rejected clear; RTM columns as in the SRS template |
| 0.4 | 10-10-2026 | Pranav, Prithvi (draft) | TC-022 rewritten with measured sizes M1–M4 and a deterministic generator; new TC-024 (version write failure, interrupted restore recovery); stale-permission checks added to TC-018 and TC-103; TC-107 message boundary in bytes; implementation status of all test assets stated |
| 1.0 | 11-10-2026 | Pranav, Prithvi | Final for submission: TC-024 (restore recovery, idempotent retry) and new TC-025 (clear recovery); targets referenced as specified in SRS §5; §11 sign-off stated as a precondition; TC-024 and TC-025 cover every failure point of SAD §3.6; TC-104 checks the log fields of SAD §4.4; TC-108 tests an unregistered e-mail; TC-104 and §5.1 list `subjectId` |

## 1. Introduction

**Purpose:** This document defines the test plan for the Real-Time Collaborative Virtual
Whiteboard v1.0. It describes the objectives, scope, strategy, environment, schedule,
responsibilities, test cases and traceability used to verify the requirements of the SRS.

**Scope:** Testing covers canvas editing, real-time synchronisation and recovery, version
history, accounts and boards, share links and roles, the performance and capacity targets,
browser compatibility and usability, and the security requirements of SRS §5.1. Items excluded
from testing are listed in §4.

**References:** Team 11 SRS v1.0; Team 11 SAD v1.0; master RTM (`docs/traceability/rtm.md`);
Decision Log (`docs/DECISIONS.md`); course brief "Mini-Project Deliverables Part-1"; supplied STP template.

**Definitions:** SRS (Software Requirements Specification), SAD (Software Architecture and Design
Specification), RTM (Requirements Traceability Matrix), TC (test case), TB-STD (standard test
board, §6), SUT (system under test), E2E (end-to-end), p95 (95th percentile). Other terms as in SRS §1.4.

## 2. Test Items

| Test item | Component (SAD §3.4) |
|---|---|
| Whiteboard client: canvas, toolbar, panels, dialogs | COMP-01 |
| Client synchronisation and reconnection logic | COMP-02 |
| REST API (accounts, boards, links, members, versions) | COMP-03 |
| Authentication service | COMP-04 |
| Board and access service, permission policy, share links | COMP-05 |
| Real-time collaboration server (Socket.IO events, sequencing, presence) | COMP-06 |
| Version history service | COMP-07 |
| Persistence layer and database indexes | COMP-08 |
| Logging and monitoring, health endpoint | COMP-09 |
