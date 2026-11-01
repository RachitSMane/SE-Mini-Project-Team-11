<!-- Owner: Rachit | Reviewers: Prithvi | Status: v1.0 -->

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional requirements, non-functional
requirements, security requirements, external interfaces and acceptance criteria of the Real-Time
Collaborative Virtual Whiteboard developed by Team 11. It is the baseline against which the Software
Architecture and Design Specification (SAD) and the Software Test Plan (STP) are written. Every
requirement has a stable identifier that is reused unchanged in the SAD, the STP and the
Requirements Traceability Matrix (RTM).

### 1.2 Scope

The system is a web application that allows several people to draw, write and edit the same
whiteboard at the same time from their own browsers. Changes made by one participant are
synchronised to every other participant of the board in real time, and the system keeps a basic
version history from which the board owner can restore an earlier state.

In scope for version 1.0:

- Registered user accounts, and guest access to a board through a shareable link.
- Owner, Editor and Viewer roles with server-side enforcement.
- Freehand drawing, erasing, basic shapes, text, colour and stroke-width controls, and basic object editing.
- Real-time synchronisation with server-authoritative ordering and recovery after reconnection.
- Participant presence on a board.
- Automatic version history with read-only preview and owner-only restore.

Out of scope for version 1.0 (candidate enhancements, see §2.2): undo/redo across users, live
cursors, PNG/PDF export, chat or comments, advanced version comparison, mobile-specific
optimisation, offline editing, automatic resubmission of unacknowledged changes after a disconnection,
chunked storage of very large boards, and deployment on multiple server instances.

### 1.3 Audience

Team 11 developers and testers, the course instructor and teaching assistants who assess the
project, and any reviewer who needs to verify the system against its requirements.

### 1.4 Definitions and acronyms

| Term | Meaning |
|---|---|
| Board | A single shared whiteboard with its own content, members, share links and version history. |
| Board object | One item on a board: a freehand stroke, a shape (rectangle, ellipse, line) or a text object. |
| Operation | A single change submitted to the server: add object, update object, delete object or clear board. |
| Participant | A user (registered or guest) currently connected to a board. |
| Registered user | A person with an account (e-mail address and password). |
| Guest | A person who joins a board through a share link without logging in. |
| Member | A registered user who has a stored role on a board. |
| Owner / Editor / Viewer | Board roles; permissions are defined in §4.4 (FR-051). |
| Share link | A URL containing a secret token that grants the Viewer or Editor role on one board until it expires or is revoked. |
| Version | A saved, numbered snapshot of the complete content of a board. |
| Changed content | The state of a board whose current objects differ from its latest version (§4.3, rule 1). |
| *T* | The periodic version interval, 5 minutes (§4.3, rule 4). |
| Restore | Making the content of an earlier version the current board content by creating a new version. |
| Sequence number | A per-board number assigned by the server to every accepted operation; it defines the order of operations. |
| TB-STD | The standard test board defined in DECISIONS.md D7a and STP §6, used to measure performance targets. |
| AC | Acceptance criterion. |
| API | Application Programming Interface. |
| LWW | Last write wins. |
| REST | Representational State Transfer (HTTP-based API style). |
| RTM | Requirements Traceability Matrix. |
| SAD | Software Architecture and Design Specification. |
| STP | Software Test Plan. |
| TLS | Transport Layer Security. |
| UI | User interface. |
| XSS | Cross-site scripting. |

### 1.5 References

- Team 11 Software Architecture and Design Specification (SAD), version 1.0.
- Team 11 Software Test Plan (STP), version 1.0.
- Team 11 Decision Log (`docs/DECISIONS.md`) and ID registry (`docs/traceability/id-registry.md`).
- Software Engineering Mini-Project Deliverables Part-1 (course brief) and the supplied SRS template.
