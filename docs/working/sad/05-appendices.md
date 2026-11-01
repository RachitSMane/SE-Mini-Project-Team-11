<!-- Owner: Krishna | Reviewers: Prithvi | Status: v1.0 -->

## 5. Appendices

**5.1 Glossary:** see SRS §1.4 and SAD §1.4 (Board, Board object, Operation, Participant, Share
link, Version, Sequence number, LWW, ADR, JWT, Room, STRIDE, SPA, ODM).

**5.2 References:** ISO/IEC/IEEE 42010 (architecture description); OWASP Top 10 and OWASP
Cheat Sheet Series (authentication, session management, input validation); NIST SP 800-160
(systems security engineering); Socket.IO, Express.js, MongoDB and React official documentation.

**5.3 Tools:** PlantUML (all UML diagrams; sources in `docs/diagrams/src/`), Markdown working
sources assembled into the supplied Word template by `tools/build_docs.py`, and
`tools/check_trace.py` for ID and traceability checks, `tools/size_model.py` for the size calculation, and `tools/export_pdf.ps1` for the PDF export.

**5.4 Architecture decision summary:**

| ADR | Decision | Status |
|---|---|---|
| ADR-1 | Client–server, layered server, Socket.IO rooms, server-authoritative state (§3.5) | Selected (D10, D12) |
| ADR-2 | MERN + Socket.IO technology stack (§3.6) | Selected (D10) |
| ADR-3 | Per-property last-write-wins in server sequence order; persist before acknowledge/broadcast; client reconciliation and full-state resync (§4.1.2–§4.1.4) | Selected (D6, D12) |
| ADR-4 | Full snapshots for versions with the no-change rule; restore always creates a new version; 15 MiB board content limit; durable per-board journal for clear and restore (§3.6) | Selected (D5, D5b, D11, D11c) |
| ADR-5 | JWT sessions, bcrypt, hashed 256-bit share-link tokens in URL fragment (§3.9) | Selected (D13) |
