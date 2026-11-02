<!-- Owner: Krishna | Reviewers: Rachit | Status: v1.0 -->

# Software Architecture and Design Specification

**Project:** Real-Time Collaborative Virtual Whiteboard

**Team:** Team 11 — Rachit S Mane, P Chinni Krishna Reddy, Pranav V Menon, Prithvi W

**Version:** 1.0

**Date:** 11-10-2026

**Status:** Final for submission — written against SRS v1.0; team sign-off pending (see Approvals); written as a design before implementation (historical); implemented and tested in the execution of 12-10-2026 (uncommitted working tree on base commit 82af885; see `docs/IMPLEMENTATION_STATUS.md`); updated 02-11-2026 to the implementation on `main` after PR #33 (API-02 board rename, API-01 `board:renamed` and `notice`, §4.5–§4.6)

## Revision History

| Version | Date | Author | Change Summary |
|---|---|---|---|
| 0.1 | 10-10-2026 | Krishna, Rachit, Prithvi (draft) | First complete draft for team review |
| 0.2 | 10-10-2026 | Krishna, Rachit, Prithvi (draft) | Acknowledgement/reconciliation protocol and reconnection settings (§4.1); ownership-transfer endpoint and SD-04; snapshot size policy and FR-008; security control mapping; test hooks |
| 0.3 | 10-10-2026 | Krishna, Rachit, Prithvi (draft) | Board limit defined on BSON size with conservative accounting; clear/restore never completed without their version (restore writes the version first, roll-forward on start-up); sequence diagrams split into legible parts, SD-01 adds reconnection, SD-04 adds all rejection cases; component diagram shows Version History → Board & Access and Board & Access → Real-time dependencies; numbered figures |
| 0.4 | 10-10-2026 | Krishna, Rachit, Prithvi (draft) | Size measures M1–M4 with version-document margin derivation; restore consistency and recovery design with mandatory start-up order (roll-forward before sequence recovery); component diagram split into overview and server-dependency figures; `FAULT_INJECT` test hook; message limit stated in bytes |
| 1.0 | 11-10-2026 | Krishna, Rachit, Prithvi | Final for submission: durable per-board journal (`pendingOp`) for clear and restore with start-up recovery; idempotent restore (`Idempotency-Key`); new SD-05 (clear); SD-02 redrawn; size bound checked by computing the encoded worst case (`tools/size_model.py`; a calculation, not a test of the system); selected technology stack; security event record (§4.4, D13b); restore pre-commit checks, failed start-up recovery and retry/concurrency rules made explicit (§3.6, API-03, SD-02, SD-05); failed logins without account enumeration and `subjectId` defined (§3.9.6, §4.4) |

## Approvals

| Role | Name | Signature/Date |
|---|---|---|
| SAD Lead | P Chinni Krishna Reddy | |
| SRS Lead | Rachit S Mane | |
| STP Lead | Pranav V Menon | |
| Security & Traceability Lead | Prithvi W | |

## 1. Introduction

### 1.1 Purpose

This document specifies the architecture and design of the Real-Time Collaborative Virtual
Whiteboard. It explains how the requirements of the SRS are realised by components, interfaces,
data stores and protocols, and records the main design decisions and their rationale.

### 1.2 Scope

The document covers the browser client, the application server (request interface, real-time
collaboration, access control and version history), the database, and the cross-cutting concerns
of security, error handling, logging and monitoring for version 1.0 as scoped in SRS §1.2.
Technologies named here are the selected stack for version 1.0 (DECISIONS.md D10).

### 1.3 Audience

Team 11 developers and testers, the course instructor and teaching assistants, and reviewers
assessing security and maintainability.

### 1.4 Definitions

Terms defined in SRS §1.4 apply. Additional terms: **ADR** — architecture decision record;
**JWT** — JSON Web Token; **Room** — the Socket.IO group of connections attached to one board;
**STRIDE** — Spoofing, Tampering, Repudiation, Information disclosure, Denial of service,
Elevation of privilege; **SPA** — single-page application; **ODM** — object-document mapper.

## 2. Document Overview

### 2.1 How to use this document

Section 3 describes the architecture: goals, stakeholders, components (COMP-xx), the chosen
pattern, technology, risks, requirement traceability and security architecture. Section 4
describes the design: sequence diagrams (SD-xx), API contracts (API-xx), error handling, logging,
monitoring and UX. Every component and API lists the SRS requirement IDs it realises.

### 2.2 Related Documents

- Team 11 SRS v1.0 (requirement IDs FR-, NFR-, SEC-OBJ-, SEC-REQ-).
- Team 11 STP v1.0 (test case IDs TC-).
- Requirements Traceability Matrix (`docs/traceability/rtm.md`) and ID registry.
- Decision Log (`docs/DECISIONS.md`).
