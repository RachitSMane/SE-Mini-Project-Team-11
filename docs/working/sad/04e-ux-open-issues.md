<!-- Owner: Krishna | Reviewers: Rachit, Pranav | Status: v1.0 -->

### 4.5 UX Design

- **Layout:** top bar (board title, role badge, connection status, connected participants, Members button for every role; Share and Clear board for the Owner); left toolbar (select, pen, eraser, rectangle, ellipse, line, text, colour, stroke width); central canvas; right panel with tabs "Participants" and "History", which can be hidden from the top bar and overlays the canvas in windows 900 px wide or narrower (frontend redesign of 16-10-2026).
- **Role awareness:** Viewers see no drawing tools and a "View only" badge; Editors do not see Clear, Share or Restore; Editors and Viewers can open Members as a read-only list, while role changes, removal and ownership transfer are shown only to the Owner (enforced by the server, SEC-REQ-003); disabled actions show a tooltip explaining why (NFR-007).
- **Feedback:** local strokes appear immediately (optimistic rendering); rejected changes disappear with a short message, including "Board is full" (FR-008, FR-026); a banner "Disconnected — reconnecting…" appears and tools are disabled while offline, followed by a notice if unconfirmed changes were discarded (FR-025); a notice is shown when the board is restored by the Owner (`version:restored`) or when access ends (`access:revoked`).
- **Destructive actions:** Clear board, Restore version, Delete board, Revoke link and Transfer ownership require a confirmation dialog naming the consequence (the transfer dialog names the new Owner and states that the current Owner becomes an Editor).
- **Version history panel:** list newest first with number, time and trigger (FR-031); selecting a version opens a read-only preview overlay with "Restore" (Owner only) and "Close" (FR-032).
- **Sharing dialog:** role selector (Viewer/Editor), expiry selector (1 h / 24 h / 7 days), "Create link", copy-to-clipboard; list of active links with revoke buttons (FR-045, FR-047).
- **Accessibility and viewport:** toolbar buttons have visible labels or tooltips and can be reached and activated with the keyboard (NFR-007); status is never shown by colour alone; the layout fits a 1280 px wide viewport without horizontally cut-off controls (NFR-006).

### 4.6 Open Issues & Next Steps

- Team sign-off of the v1.0 documents (DECISIONS.md E1).
- Done (12-10-2026): implementation of the system and of the test assets (generator, scripted clients, fault-injection hook), execution of the STP and measured verification of NFR-001 to NFR-005 (`docs/IMPLEMENTATION_STATUS.md`).
- Done (17-10-2026): TC-021 (NFR-006, NFR-007), Pass with limitations recorded in the STP TC-021 record.
- Open: the TC-009 offline check in the current stable Mozilla Firefox is not verified (the automated driver cannot simulate the outage there; TC-009 itself is Pass from Chromium, Chrome and Edge runs; not part of TC-021), and TC-109 on a deployed HTTPS instance (SEC-REQ-007, DECISIONS.md E3).
- Open: a run of the GitHub Actions workflows on the committed code (local runs only so far, DECISIONS.md E4).
- Future work (not in version 1.0): idempotent resubmission of unacknowledged real-time operations using `clientOpId`; replay of missed operations instead of full resynchronisation; several server instances with a Socket.IO adapter and a distributed lock for the board queue; chunked snapshot storage (e.g. GridFS) for boards above 15 MiB; CRDT-based merging for text; undo/redo across users; live cursors; export to PNG/PDF.
