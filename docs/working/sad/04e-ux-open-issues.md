<!-- Owner: Krishna | Reviewers: Rachit, Pranav | Status: v1.0 -->

### 4.5 UX Design

- **Layout:** top bar (board title, role badge, connection status, connected participants, Members button for every role; Share and Clear board for the Owner); left toolbar (select, pen, eraser, rectangle, ellipse, line, text, colour, stroke width); central canvas; right panel with tabs "Participants" and "History", which can be hidden from the top bar and overlays the canvas in windows 900 px wide or narrower (frontend redesign of 16-10-2026).
  Update 02-11-2026: the top bar also has an **Export PNG** button for every role (issue #16), and below
  1024 px the labelled top-bar buttons become icon buttons with tooltips so that the title, role and status
  stay readable (issue #23, tested at 1280×720, 1366×768, 1920×1080 and the narrower breakpoints in
  `e2e/responsive.spec.cjs`). The dashboard offers **Rename** to the Owner (issue #13). Export and rename are
  outside the SRS version 1.0 baseline (SRS §2.7, scope decision pending).
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
- Done (from 01-11-2026): the GitHub Actions workflows `app-ci` (lint, unit, integration, build, Chromium E2E) and `docs-check` (traceability) run on every Pull Request and push to `main`; both pass on `main` after PR #33 (DECISIONS.md E4).
- Done (02-11-2026): final validation of `main` (`docs/reports/RELEASE_READINESS_2026-11-02.md`): restore without `crypto.randomUUID()` (plain HTTP), forced-colours swatches, lost pointer capture and the top-bar layout were fixed; stable Mozilla Firefox 159 was exercised with Playwright's experimental BiDi driver (22 E2E tests passed; the TC-009 outage, double-click text editing and the PNG download remain manual checks there). Apple Safari has not been tested; WebKit results are engine evidence only.
- Open: the server's `notice` event (`VERSION_NOT_SAVED`, API-01) is not displayed by the client (no subscription in COMP-02).
- Future work (not in version 1.0): idempotent resubmission of unacknowledged real-time operations using `clientOpId`; replay of missed operations instead of full resynchronisation; several server instances with a Socket.IO adapter and a distributed lock for the board queue; chunked snapshot storage (e.g. GridFS) for boards above 15 MiB; CRDT-based merging for text; undo/redo across users; live cursors; export to PDF (PNG export exists, see §4.5).
