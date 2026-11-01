<!-- Owner: Krishna | Reviewers: Rachit | Status: v1.0 -->

## 3. Architecture

### 3.1 Goals & Constraints

Goals:

- **Consistency:** every participant converges on the same board state, defined by server order (FR-021 to FR-023).
- **Responsiveness:** operations visible to others within the target of NFR-001; local edits shown immediately.
- **Security by default:** every request and real-time message authenticated and authorised on the server (SEC-REQ-002, SEC-REQ-003).
- **Recoverability:** no acknowledged operation is lost (FR-027); clients resynchronise after disconnection (FR-025, NFR-004).
- **Simplicity:** an architecture that a four-person student team can build, test and explain within the course.

Constraints:

- Single server instance for version 1.0 (SRS §2.5); no horizontal scaling.
- Selected stack: MongoDB, Express.js, React, Node.js, Socket.IO (D10).
- Desktop browsers only (NFR-006).
- MongoDB's 16 MiB maximum document size limits one stored snapshot; v1.0 therefore limits board content to 15 MiB (FR-008, §3.6).

### 3.2 Stakeholders & Concerns

| Stakeholder | Main concerns |
|---|---|
| Board owners | Control over who can see and change a board; ability to recover earlier content. |
| Editors and viewers | Low latency, no lost work, clear feedback when something is rejected or the connection drops. |
| Guests | Joining quickly without an account; clear notice when access ends. |
| Developers (Team 11) | Modularity, clear contracts between client and server, testability. |
| Testers (Team 11) | Observable behaviour, measurable targets, test hooks (logs, metrics, health check). |
| Instructor / assessors | Traceability to requirements, documented rationale, security analysis. |
