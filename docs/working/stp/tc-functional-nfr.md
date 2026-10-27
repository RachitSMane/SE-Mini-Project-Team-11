<!-- Owner: Pranav | Reviewers: Rachit (acceptance criteria), Krishna | Status: v1.0 -->

## Appendix A — Test case specifications

Execution 12-10-2026 (uncommitted working tree on base commit 82af885): 32 test cases Pass, 2 Blocked (TC-021: stable Firefox not installed at that time, still Blocked after the 16-10-2026 run in stable Firefox 157 because the manual checklist and the TC-009 offline check remain open; TC-109: no deployment), none Fail. TC-021 was executed manually on 17-10-2026 and set to Pass with limitations by team decision (TC-021 record), so 33 test cases are Pass and 1 Blocked (TC-109); details in each test case and in `docs/IMPLEMENTATION_STATUS.md`. "Actual result" records the evidence (test file or harness, measured values, build and date);
allowed status values and their RTM mapping are defined in §13. The automated tests are in
`server/tests/`, `shared/tests/`, `client/tests/` and `e2e/`; the performance harness and the
TB-STD seed are in `scripts/perf/` (§6). Unless stated otherwise, every test case assumes: test environment of §6 running, health
check `ok`, accounts seeded by the seed script, supported browser, test build with the hooks of
SAD §4.1.6. Names used: O = Owner, E/E2 = Editors, V = Viewer, G = guest, M = other member.

### A.1 Functional and non-functional test cases

#### TC-001 — Freehand stroke with colour and width is synchronised

| Field | Value |
|---|---|
| Requirements | FR-001, FR-002, FR-020 |
| Type / Priority | Functional, system (E2E), positive + boundary / High |
| Preconditions | O and E have board B open in two browsers. |
| Test data | Colour `#D32F2F`, stroke width 8; boundary widths 1, 20 (valid) and 0, 21 (invalid). |
| Steps | 1. E selects colour `#D32F2F` and width 8.<br>2. E draws a stroke across the canvas.<br>3. Compare the stroke on O's board with E's (`exportState`).<br>4. E sets widths 1 and 20 and draws one stroke with each.<br>5. E tries to enter widths 0 and 21. |
| Expected result | Step 3: identical stroke on both boards, colour `#D32F2F`, width 8, path following the drag. Step 4: both strokes created with widths 1 and 20. Step 5: widths 0 and 21 are not accepted by the control. |
| Pass/fail criteria | Pass if every expected result holds; fail otherwise. |
| Dependencies / limitations | Requires FR-020 synchronisation; timing is not measured here (see TC-019). |
| Actual result | e2e/whiteboard.spec.cjs (Playwright, Chromium 1280 × 720; also passed in Chrome and Edge): stroke #D32F2F width 8 identical on both boards (exportState); widths 1 and 20 accepted; 0 and 21 marked invalid and not applied. Server side: server/tests/integration/sync.test.js. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-002 — Shapes and text are created and synchronised

| Field | Value |
|---|---|
| Requirements | FR-003, FR-004, FR-020 |
| Type / Priority | Functional, system (E2E), positive + boundary / High |
| Preconditions | O and E have board B open. |
| Test data | Text "Sprint plan"; strings of 500 and 501 characters. |
| Steps | 1. E drags with the rectangle, ellipse and line tools.<br>2. E adds the text "Sprint plan", then edits it to "Sprint plan v2".<br>3. E enters a 500-character text, then tries a 501-character text.<br>4. Compare O's board with E's after each step. |
| Expected result | Each shape's bounding box or end points equal the drag start and end; the text appears and is updated on both boards; 500 characters are accepted and the 501st is not. |
| Pass/fail criteria | Pass if both boards are identical after every step and the length limit holds. |
| Dependencies / limitations | — |
| Actual result | e2e/whiteboard.spec.cjs (Playwright, Chromium 1280 × 720; also passed in Chrome and Edge): rectangle, ellipse and line bounding boxes/end points equal the drags (±1 px); text added, edited to 'Sprint plan v2' and synchronised; 500 typed characters accepted, the 501st not; both boards identical after every step. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-003 — Select, move, restyle and delete an object

| Field | Value |
|---|---|
| Requirements | FR-005 |
| Type / Priority | Functional, system (E2E) / High |
| Preconditions | Board B contains rectangle R; O and E connected. |
| Test data | New colour `#43A047`, new width 4, move of 100 px to the right. |
| Steps | 1. E selects R and drags it 100 px to the right.<br>2. E changes R's colour to `#43A047` and width to 4.<br>3. E deletes R.<br>4. Compare O's board with E's after each step. |
| Expected result | O's board shows R moved, then restyled, then removed, matching E's board each time. |
| Pass/fail criteria | Pass if the boards match after every step. |
| Dependencies / limitations | — |
| Actual result | e2e/whiteboard.spec.cjs (Playwright, Chromium 1280 × 720; also passed in Chrome and Edge): R moved 100 px, restyled to #43A047 width 4, deleted; O's board matched E's after each step. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-004 — Eraser removes whole touched objects

| Field | Value |
|---|---|
| Requirements | FR-006 |
| Type / Priority | Functional, system (E2E) / High |
| Preconditions | Board B contains strokes S1, S2 and text T; S1 and T lie on the planned eraser path, S2 does not. |
| Test data | — |
| Steps | 1. E selects the eraser and drags across S1 and T.<br>2. Compare both boards. |
| Expected result | S1 and T are removed completely; S2 is unchanged. |
| Pass/fail criteria | Pass if exactly S1 and T are deleted on both boards. |
| Dependencies / limitations | — |
| Actual result | e2e/whiteboard.spec.cjs (Playwright, Chromium 1280 × 720; also passed in Chrome and Edge): eraser path across S1 and T removed exactly S1 and T on both boards; S2 unchanged. Hit testing: client/tests/geometry.test.js. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-005 — Clearing a board and the "before clear" version

| Field | Value |
|---|---|
| Requirements | FR-007, FR-030 |
| Type / Priority | Functional, positive + negative + boundary / High |
| Preconditions | Board B with at least 5 objects; O, E and V connected; latest version number L recorded. |
| Test data | — |
| Steps | 1. E submits `board:clear` with a scripted client using E's token.<br>2. O chooses Clear board and cancels the confirmation.<br>3. O makes one change (board now has changed content), chooses Clear board and confirms.<br>4. Open the version list; preview the newest version.<br>5. O adds 3 objects, waits until a periodic version is created (no further change), then clears and confirms.<br>6. Open the version list again.<br>7. O clears the now empty board and confirms. |
| Expected result | Step 1: rejected with `FORBIDDEN`; board unchanged. Step 2: nothing changes. Step 3: board empty for O, E and V. Step 4: a new "before clear" version L+1 exists and contains the pre-clear objects. Step 6: no additional "before clear" version (no-change rule); the newest version (the periodic one) contains the 3 objects. Step 7: no change, no new version, acknowledgement `noop: true`. |
| Pass/fail criteria | Pass if every expected result holds. |
| Dependencies / limitations | Step 5 waits for interval *T* of the build under test (record the configured value; the production value is 5 min, D11a). Rejection of a clear whose before-clear version cannot be stored (FR-007) is tested in TC-025 (step 1, fault injection), not in this system test. |
| Actual result | server/tests/integration/sync.test.js: Editor clear FORBIDDEN; before-clear version holds the pre-clear objects; no extra version after a periodic version (periodic trigger invoked directly instead of waiting T); empty clear noop:true without version. E2E: cancel changes nothing; confirmed clear empties both boards. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-006 — Concurrent edits to different objects

| Field | Value |
|---|---|
| Requirements | FR-021, FR-022 |
| Type / Priority | Functional, integration (scripted clients), concurrency / High |
| Preconditions | Board B contains objects X and Y; scripted clients C1 and C2 joined with Editor tokens, in one process. |
| Test data | C1 moves X; C2 recolours Y; 50 rounds. |
| Steps | 1. In each round, C1 and C2 submit their updates at the same moment (shared start signal).<br>2. After each round, compare `{lastSeq, objects}` of C1, C2 and a fresh `board:join`.<br>3. Inspect the sequence numbers each client applied. |
| Expected result | In every round both updates are present on all three states; on every client the applied sequence numbers are strictly increasing, without gaps or duplicates, and in the same order. |
| Pass/fail criteria | Pass if 50/50 rounds converge with both changes present. |
| Dependencies / limitations | — |
| Actual result | server/tests/integration/sync.test.js: 50/50 rounds converged (both clients and a fresh board:join identical); applied seq strictly increasing, contiguous and in the same order. Rounds paced ≥ 50 ms (30 ops/s limit). Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-007 — Concurrent edits to the same object (last write wins)

| Field | Value |
|---|---|
| Requirements | FR-021, FR-023 |
| Type / Priority | Functional, integration (scripted clients), concurrency / High |
| Preconditions | Board B contains object Z; scripted clients C1, C2 (Editors) and C3 (observer) joined, in one process. |
| Test data | Same property: C1 sets colour `#1E88E5`, C2 sets colour `#FB8C00`. Different properties: C1 moves Z, C2 sets width 6. |
| Steps | 1. C1 and C2 update Z's colour at the same moment; record both sequence numbers; repeat 50 times.<br>2. Compare Z on C1, C2 and C3 after each round.<br>3. C1 moves Z while C2 changes its width at the same moment; compare.<br>4. C1 deletes Z while C2 updates Z at the same moment; record acknowledgements. |
| Expected result | Step 2: in every round all clients show the colour of the update with the higher sequence number. Step 3: Z has both the new position and width 6 on all clients. Step 4: if the delete has the lower sequence number, the update is rejected with `OBJECT_NOT_FOUND` and Z stays deleted everywhere; otherwise both are accepted and Z is deleted. |
| Pass/fail criteria | Pass if all rounds converge as expected. |
| Dependencies / limitations | — |
| Actual result | server/tests/integration/sync.test.js: 50 rounds, all clients show the colour of the higher seq; move + width 6 merged; delete vs update: update rejected OBJECT_NOT_FOUND or ordered before the delete, Z deleted everywhere. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-008 — Late joiner receives full state

| Field | Value |
|---|---|
| Requirements | FR-024 |
| Type / Priority | Functional, system / High |
| Preconditions | O and E have made at least 20 changes to board B. |
| Test data | — |
| Steps | 1. E2 opens board B.<br>2. Compare E2's `exportState()` with O's.<br>3. Check E2's participant list. |
| Expected result | Identical `lastSeq` and objects; E2 sees O and E in the participant list. |
| Pass/fail criteria | Pass if states are identical and the list is correct. |
| Dependencies / limitations | — |
| Actual result | server/tests/integration/sync.test.js: late joiner after 20 changes has identical lastSeq and objects; participant list shows Owner, Editor, Viewer. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-009 — Reconnection recovery

| Field | Value |
|---|---|
| Requirements | FR-025, NFR-004 |
| Type / Priority | Functional + reliability (recovery), system / High |
| Preconditions | Board B contains TB-STD; O (scripted client) and E (browser, Playwright) connected. |
| Test data | 20 changes by O during the outage; one unacknowledged change by E (see step 2). |
| Steps | 1. Set E's browser context offline (`setOffline(true)`) for 30 s.<br>2. During the outage O makes 20 changes; E attempts to draw (tools should be disabled). In one repetition, make E draw a stroke and go offline before its acknowledgement arrives (by blocking the WebSocket frame).<br>3. Call `setOffline(false)` and record t0 (test clock).<br>4. Record t1 = time of E's `board-ready` mark after resynchronisation; recovery = t1 − t0.<br>5. Compare E's `exportState()` with a fresh `board:join`.<br>6. Repeat 10 times; record every value. |
| Expected result | During the outage the indicator is shown and drawing is impossible. After reconnection E's state equals the server state including O's 20 changes; in the repetition with an unacknowledged stroke, that stroke is gone unless the server had stored it, and the "unconfirmed changes" notice is shown; recovery ≤ 5 s. |
| Pass/fail criteria | Pass if all 10 repetitions match the server state and each recovery ≤ 5 s (NFR-004); the measured values are reported in any case. |
| Dependencies / limitations | Depends on the reconnection settings of SAD §4.1.4; times are from one clock in the Playwright process. |
| Actual result | Banner and disabled tools during the outage, resync equal to server state: e2e/whiteboard.spec.cjs (Playwright, Chromium 1280 × 720; also passed in Chrome and Edge). 10 repetitions, 30 s outage, 20 changes (scripts/perf/browser.js): recovery max 2194 ms (Chromium), max 2322 ms (chrome 154.0.8037.99); state equal every time. Unacknowledged-change repetition (acknowledgement dropped, connection cut): notice shown, state equals server (E2E). Not simulable in Playwright's Firefox (offline emulation leaves WebSockets open). Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-010 — Rejected operation is rolled back

| Field | Value |
|---|---|
| Requirements | FR-026 |
| Type / Priority | Functional, negative, system / High |
| Preconditions | O and E have board B open; E's test build exposes `submitRaw`. |
| Test data | Rectangle with `strokeWidth` 50 (invalid). |
| Steps | 1. E submits the invalid rectangle with `submitRaw` (it is rendered optimistically).<br>2. Record the time the rejection arrives and the time the rectangle disappears from E's view.<br>3. Check E's message and O's board. |
| Expected result | Server rejects with `VALIDATION_FAILED`; E sees an error message; the rectangle disappears within 1 s of the rejection; O never receives it. |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Uses a test-build hook; not possible in a production build. |
| Actual result | e2e/whiteboard.spec.cjs (Playwright, Chromium 1280 × 720; also passed in Chrome and Edge): submitRaw strokeWidth 50 → VALIDATION_FAILED message, rectangle removed (< 1 s, sync.test.js), O never received it. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-011 — Board survives server restart

| Field | Value |
|---|---|
| Requirements | FR-027 |
| Type / Priority | Functional, recovery / High |
| Preconditions | Board B open by O (scripted client). |
| Test data | 30 operations, each acknowledged. |
| Steps | 1. O submits 30 changes and waits for all 30 acknowledgements; record O's `{lastSeq, objects}`.<br>2. All participants leave.<br>3. Stop the server process (kill) and restart it.<br>4. O rejoins board B and compares the state with step 1. |
| Expected result | The rejoined state contains all 30 acknowledged changes and `seq` continues above the last acknowledged value. |
| Pass/fail criteria | Pass if no acknowledged change is missing. |
| Dependencies / limitations | MongoDB must use journaling (default). |
| Actual result | server/tests/integration/recovery.test.js: 30 acknowledged changes, server process killed and restarted; rejoined state identical; next seq 31. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-012 — Automatic versions, no-change rule, list and preview

| Field | Value |
|---|---|
| Requirements | FR-030, FR-031, FR-032 |
| Type / Priority | Functional, system, positive + no-change / High |
| Preconditions | Board B open by O, E and V; interval *T* as configured in the build under test (record it; a test build may set e.g. 30 s via `VERSION_INTERVAL_MS`). Record latest version number L. |
| Test data | — |
| Steps | 1. E makes a change and waits one interval *T*.<br>2. Without further changes, wait two more intervals.<br>3. E makes another change; all participants leave; O reopens B.<br>4. All participants leave again without changes; O reopens B.<br>5. V opens the version list.<br>6. V previews version L+1; during the preview, E makes a change. |
| Expected result | Step 1: exactly one "periodic" version L+1. Step 2: no new version. Step 3: exactly one "last participant left" version L+2. Step 4: no new version. Step 5: list shows L+2, L+1, … newest first with number, time and trigger. Step 6: preview shows version L+1's objects read-only; E's change appears on the live boards and not in the preview. |
| Pass/fail criteria | Pass if version counts, triggers, list fields and preview behaviour all match. |
| Dependencies / limitations | Result is valid for the interval configured in the build under test; the production value is 5 min (D11a). Steps 3 and 4 must each be completed within one interval so that no periodic trigger interferes. |
| Actual result | server/tests/integration/versions.test.js: VERSION_INTERVAL_MS=1000: one periodic version, none in two unchanged intervals; last_left version once, none on a no-change leave (timer disabled for these steps); list newest first with number, createdAt, trigger; preview unchanged by a live edit. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-013 — Owner restore creates a new version for all participants

| Field | Value |
|---|---|
| Requirements | FR-033, FR-034, NFR-005 |
| Type / Priority | Functional + performance, system / High |
| Preconditions | Board B with TB-STD content saved as version n; afterwards content changed and saved as later versions; 10 scripted clients connected in one process (one of them O); one browser client for the UI check. |
| Test data | TB-STD. |
| Steps | 1. UI check: O (browser) selects version n, confirms Restore; check the browser board and version list.<br>2. Timing run: the scripted O sends `POST …/versions/n/restore` with a new `Idempotency-Key` for every repetition (each repetition is a distinct restore); record t0 when the request is sent.<br>3. Record, for each of the 10 clients, the time it applies `board:state`; t1 = the latest of these.<br>4. Repeat steps 2–3 ten times; restore = t1 − t0 each time.<br>5. Restore the version that is currently identical to the board content once more. |
| Expected result | All participants show version n's content without reload; the list contains every previously retained version unchanged plus a new "restore of n" version; restore ≤ 3 s; step 5 also creates a new "restore" version. |
| Pass/fail criteria | Pass if content and history are correct in all runs and 10/10 timings ≤ 3 s (NFR-005); measured values are reported in any case. |
| Dependencies / limitations | Timing uses one clock in the harness process; browser rendering of the restored board is checked in step 1 but not timed. |
| Actual result | UI restore (E2E) and history unchanged plus 'restore of n' (versions.test.js); identical-content restore creates a version. Timing, TB-STD, 10 clients, 10 runs (scripts/perf/restore.js): max 1661 ms, median 1005.1 ms (≤ 3,000 ms). Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-014 — Version retention

| Field | Value |
|---|---|
| Requirements | FR-035 |
| Type / Priority | Functional, integration, boundary / Medium |
| Preconditions | New board B; short `VERSION_INTERVAL_MS` configured. |
| Test data | 25 versions with distinct content (one change before each interval). |
| Steps | 1. Create 25 versions.<br>2. List versions.<br>3. Preview and restore the oldest listed version.<br>4. Request the preview of version 1 by number. |
| Expected result | At least the 20 newest versions are listed; the oldest listed one can be previewed and restored; if version 1 is no longer retained, the request returns `404 VERSION_NOT_FOUND`. |
| Pass/fail criteria | Pass if ≥ 20 newest versions are available and usable and removed versions return `VERSION_NOT_FOUND`. |
| Dependencies / limitations | Retention count 20 (D5a). |
| Actual result | server/tests/integration/versions.test.js: 25 versions → 20 newest listed; version 6 previewed and restored (new version 26); version 1 → 404 VERSION_NOT_FOUND. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-015 — Register, log in, log out

| Field | Value |
|---|---|
| Requirements | FR-040, FR-041 |
| Type / Priority | Functional, integration (API) + E2E, positive + negative + boundary / High |
| Preconditions | E-mail address `tc015@example.test` not registered. |
| Test data | Valid password generated at run time; display names of 0, 1, 30 and 31 characters. |
| Steps | 1. Register with valid data (display name of 1 character), then a second account with a 30-character display name.<br>2. Register again with the first e-mail address.<br>3. Register with display names of 0 and 31 characters.<br>4. Log in with a wrong password, then with the correct one.<br>5. Log out and try to open the dashboard. |
| Expected result | Step 1 succeeds twice; step 2 → `EMAIL_TAKEN`; step 3 → `VALIDATION_FAILED`; wrong password → generic "invalid e-mail or password"; correct password opens the dashboard; after logout the dashboard redirects to login. |
| Pass/fail criteria | Pass if every step gives the expected outcome. |
| Dependencies / limitations | Password rules are tested in TC-105. |
| Actual result | server/tests/integration/auth.test.js (display names 1/30 accepted, 0/31 rejected, EMAIL_TAKEN, generic login failure, logout revokes) and E2E register → dashboard → logout → login page. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-016 — Create, list and delete boards

| Field | Value |
|---|---|
| Requirements | FR-042, FR-043, FR-044 |
| Type / Priority | Functional, system, positive + boundary / High |
| Preconditions | Registered users O and M; M is an Editor member of O's existing board B1 and is connected to it. |
| Test data | Titles of 0, 1, 100 and 101 characters. |
| Steps | 1. O creates board B2 with a 100-character title and B3 with a 1-character title; try 0 and 101 characters.<br>2. Check O's and M's dashboards.<br>3. O deletes B1 and confirms.<br>4. Open one of B1's share links. |
| Expected result | B2 and B3 created with role Owner, invalid titles rejected; O's dashboard lists B1–B3, M's lists B1 as Editor; after deletion M sees "board deleted" and is disconnected, B1 disappears from both dashboards, and the link is rejected. |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Non-Owner deletion is tested in TC-102. |
| Actual result | server/tests/integration/access.test.js (titles 1/100 accepted, 0/101 rejected; dashboards; deletion cascade; link rejected) and E2E dashboard delete with 'board deleted' notice at the connected member. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-017 — Share link creation, joining and presence

| Field | Value |
|---|---|
| Requirements | FR-045, FR-046, FR-052 |
| Type / Priority | Functional, system / High |
| Preconditions | O has board B open; registered user R (not a member) is logged in; a third browser is not logged in. |
| Test data | Editor link (24 h); Viewer link (default expiry); guest name "Asha"; guest names of 0 and 31 characters. |
| Steps | 1. O creates an Editor link with 24 h expiry and a Viewer link with the default expiry.<br>2. Check O's link list and that the full URL is shown only at creation.<br>3. R opens the Editor link.<br>4. The third browser opens the Viewer link; try names of 0 and 31 characters, then join as "Asha".<br>5. Asha leaves. |
| Expected result | Both links listed with correct role and expiry (default 7 days); R becomes an Editor member and can draw; invalid guest names rejected; "Asha (guest)" appears in every participant list with Viewer rights and no drawing tools; after Asha leaves, all lists update. |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Revocation and expiry are tested in TC-103. |
| Actual result | access.test.js (link list, expiry 24 h / default 7 d, token shown once, member upgrade, guest names) and E2E: link created in the Share dialog, guest 'Asha (guest)' in participant list with View only, registered user joins as Editor after logging in. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-018 — Ownership transfer

| Field | Value |
|---|---|
| Requirements | FR-050 |
| Type / Priority | Functional, integration (API) + system, positive + negative / High |
| Preconditions | Board B with Owner O, Editor member E, Viewer member V, guest G and a registered non-member X; O and E connected in browsers. |
| Test data | Endpoint `POST /api/v1/boards/{B}/transfer-ownership`. |
| Steps | 1. E calls the endpoint with `{newOwnerId: V, confirm: true}`.<br>2. G (guest token) calls it with `{newOwnerId: E, confirm: true}`.<br>3. O calls it with `{newOwnerId: E}` (no `confirm`).<br>4. O calls it with `newOwnerId` = O, = X, = G's guest ID and = an unknown ID (each with `confirm: true`).<br>5. O calls it for a non-existent board ID.<br>6. O uses the Members dialog to transfer ownership to E and confirms.<br>7. Check E's and O's tools without reload, both dashboards and the members list.<br>8. O tries to create a link, restore a version, change V's role and transfer ownership back through the API, and sends `board:clear` over the socket that was opened while O was Owner.<br>9. E (new Owner) creates a share link, restores a version and changes V's role to Editor.<br>10. E deletes board B and confirms. |
| Expected result | Step 1: 403 `FORBIDDEN`. Step 2: 403 `FORBIDDEN`. Step 3: 400 `VALIDATION_FAILED`. Step 4: 400 `INVALID_TARGET` each time. Step 5: 404 `BOARD_NOT_FOUND`. Steps 1–5 change no role. Step 6: 200 with `ownerId` = E and `previousOwner.role` = `editor`. Step 7: E sees Owner controls and O sees Editor tools without reload; dashboards show E as Owner and O as Editor; E no longer appears as a member row. Step 8: every API action of O is rejected with 403 and the `board:clear` is rejected with `FORBIDDEN` (no stale Owner permission on the open socket). Steps 9–10: every action of E succeeds and the board is deleted. |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Unauthenticated calls are covered by TC-106. |
| Actual result | access.test.js steps 1–10 (403, 403, 400, 400 INVALID_TARGET ×4, 404, roles unchanged, 200, former Owner rejected incl. board:clear on the old socket) and E2E transfer with confirmation, roles updated without reload. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-019 — Synchronisation latency and capacity

| Field | Value |
|---|---|
| Requirements | NFR-001, NFR-002 |
| Type / Priority | Performance / High |
| Preconditions | Board B empty; latency harness with 10 scripted Editor clients in one Node.js process using `performance.now()`; environment conditions of §6 and SRS §5. |
| Test data | Each client submits 2 valid operations per second (random adds and updates of its own objects, well below the 30/s rate limit). |
| Steps | 1. Connect all 10 clients; run 10 s of warm-up (not recorded).<br>2. For 60 s, for every operation record t_submit at the sender immediately before `emit("op:submit")`, the acknowledgement time at the sender, and t_apply at each of the 9 receivers when the operation has been applied to its state.<br>3. Count rejected operations; they are excluded from latency samples and reported separately.<br>4. Latency samples = t_apply − t_submit for every (accepted operation, receiver) pair (≈ 10,800); compute p95 by the nearest-rank method; also report median, p99 and maximum, and the sender acknowledgement times separately.<br>5. Check every client's applied sequence numbers for missing or duplicate values and compare all final states with a fresh `board:join`.<br>6. Record results in a CSV with commit hash, hardware and software versions. |
| Expected result | p95 ≤ 500 ms; no disconnection; zero rejected operations; no missing or duplicate sequence numbers; identical final states. |
| Pass/fail criteria | Pass if all conditions hold against the NFR-001 and NFR-002 targets; measured values are reported in any case. |
| Dependencies / limitations | Rendering time in browsers is not included (scripted clients apply but do not render). Results are valid only for the recorded hardware. |
| Actual result | scripts/perf/latency.js, 10 clients, 10 s warm-up, 60 s: p95 80 ms, median 34.7, p99 181.4, max 383.2 ms, 10566 samples; rejected 0, disconnects 0, seq problems 0, final states identical. Results in perf-results/tc019-latency.csv. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-020 — Initial board load time

| Field | Value |
|---|---|
| Requirements | NFR-003 |
| Type / Priority | Performance / Medium |
| Preconditions | Board B contains TB-STD; logged-in Owner session available to Playwright. |
| Test data | TB-STD. |
| Steps | 1. Create a new browser context (empty cache) and navigate to board B.<br>2. Read the `board-ready` mark's `startTime` (ms since navigation start).<br>3. Repeat 10 times; record every value and the browser version. |
| Expected result | Every run ≤ 3,000 ms. |
| Pass/fail criteria | Pass if 10/10 runs ≤ 3 s (NFR-003); all values reported in any case. |
| Dependencies / limitations | Run in Chrome; other browsers are covered functionally by TC-021. |
| Actual result | scripts/perf/browser.js, TB-STD, new context per run, 10 runs: max 1110 ms in chrome 154.0.8037.99; max 380.6 ms in Playwright Chromium (≤ 3,000 ms). Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-021 — Browser compatibility, viewport and usability checklist

| Field | Value |
|---|---|
| Requirements | NFR-006, NFR-007 |
| Type / Priority | Compatibility + usability, manual / Medium |
| Preconditions | Current stable Chrome, Firefox and Edge installed; versions recorded. |
| Test data | Viewport 1280 × 720. |
| Steps | 1. In each browser at 1280 × 720, run the core flows of TC-001, TC-002, TC-013 (step 1) and TC-017.<br>2. Check that no control is horizontally cut off.<br>3. For each role (O, E, V), check: role badge visible; connection status visible; all drawing tools directly on the toolbar; every toolbar control has visible text or a tooltip; every toolbar control can be reached with Tab and activated with Enter or Space. |
| Expected result | Core flows succeed in all three browsers; no cut-off controls; every checklist item passes for every role. |
| Pass/fail criteria | Pass if all flows and all checklist items pass. |
| Dependencies / limitations | Manual inspection; not a formal accessibility audit. |
| Actual result | Stable Mozilla Firefox is not installed on the test machine. Chrome 154 and Edge 155 (installed stable channels): every E2E core flow (TC-001, TC-002, TC-013, TC-017) and the automated checklist e2e/usability.spec.cjs (role badge, connection status, all tools on the toolbar, labelled controls, Tab reach, Enter/Space activation, no cut-off at 1280 px) passed for Owner, Editor and Viewer. Playwright's patched Firefox 134 build passed the same, except TC-009 (offline emulation not possible there); it does not count as stable Firefox. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. 14/15-10-2026 addendum (automated only; same working tree): the E2E suite including `e2e/usability.spec.cjs` passed again in Chrome 155.0.8059.41 and Edge 155.0.4283.45 and in Playwright's Firefox build (29 passed, 1 skipped — TC-009 in that build), in four runs (14-10-2026 twice, 15-10-2026 twice). Reference screenshots of the Owner, Editor and Viewer board views at 1280 × 720 were captured in all three browsers; they show the role badge ("Owner", "Editor", "View only") and "Connected" as text, all seven tools on the toolbar for Owner and Editor, and no drawing tools for the Viewer. Stable Mozilla Firefox is still not installed (re-checked 15-10-2026), and no manual run or human usability judgement has been recorded in any browser. 16-10-2026 addendum (automated only; same working tree): stable Mozilla Firefox 157.0.1 (release channel; official Mozilla installer, signature valid) was extracted with the installer's `/ExtractDir` option and run without installation, because installation needs administrator approval. Driven through Playwright 1.50's experimental WebDriver BiDi driver: 8 passed, 2 failed. Both failures are driver limitations, shown by a probe without application code: the driver sends two single clicks and no `dblclick` event (TC-001 to TC-004 text edit), and `setOffline()` leaves `navigator.onLine` true, so no outage occurs (TC-009). TC-001 to TC-004 then passed in full with the double-click dispatched as a DOM event; the automated checklist `e2e/usability.spec.cjs` passed; Owner, Editor and Viewer screenshots at 1280 × 720 were captured. TC-009 is not verified in stable Firefox. The manual checklist and human judgement are still outstanding. 17-10-2026 manual execution and team decision (record: `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md`; uncommitted working tree on base commit 82af885; local app via `npm run dev`). Manual, tester-reported, in installed Mozilla Firefox 158.0 (64-bit) at 1280 × 720 (Responsive Design Mode, DPR 1): the TC-001, TC-002, TC-013 step 1 and TC-017 flows passed; for Owner, Editor and Viewer the role badge, the "Connected" text, the seven tools on the toolbar (none for the Viewer), no cut-off and no horizontal scroll passed; tooltips on the seven tools and the keyboard checks passed. Manual, tester-reported, in Chrome at 1280 × 720: layout, role badges, "Connected" text, the seven tools and their tooltips, Tab navigation, Enter/Space activation and colour-swatch selection by keyboard passed; the core flows were not run by hand in Chrome. Edge was not checked by hand (tester's decision). Automated, 17-10-2026 20:17 IST, Chrome 155.0.8059.82 and Edge 155.0.4283.45, on the client test build of 16-10-2026: `e2e/usability.spec.cjs` and the E2E tests for TC-001 to TC-004, TC-005/TC-013 and both TC-017 tests, 10 passed, 0 failed, 0 skipped. Screenshots: About Firefox, the 1280 × 720 viewport and the Owner, Editor and Viewer boards in Firefox. Defect found and fixed during TC-021: the stroke-width "Increase" and "Decrease" buttons had no visible text and no tooltip (only an `aria-label`, which the automated checklist accepts); the existing tooltip pattern was added to both in `client/src/board/Toolbar.jsx` (17-10-2026), `npm run lint` clean; the tester re-checked in Firefox only that both tooltips appear on hover and on Tab focus and disappear when the button is disabled at widths 20 and 1. Two team members reviewed the record and the team accepted these limitations: the exact name stored for the 31-character guest-name attempt was not recorded (the team accepts the 30-character input limit as "not accepted"); the manual TC-017 flow did not follow this test's role sequence exactly (a guest used the Editor link instead of a registered non-member); the tooltip fix was re-checked in Firefox only, with no post-fix Chrome/Edge check and no automated run after the fix; the Editor keyboard result was accepted without separate role-specific evidence; manual Edge testing was skipped, and the automated Chrome/Edge run predates the fix; tooltip and core-flow end-state screenshots and Chrome screenshots were not captured; the build is uncommitted. TC-009 is not part of TC-021. |
| Status | Pass |

#### TC-022 — Board content size limit

| Field | Value |
|---|---|
| Requirements | FR-008 |
| Type / Priority | Functional, integration (scripted client + database inspection), boundary + negative / Medium |
| Preconditions | Empty board B; scripted Editor client E and observer client O (both in one Node.js process); a test server with the periodic timer disabled (`VERSION_INTERVAL_MS=0`); version creation is triggered through the same function the timer calls; read access to the test MongoDB. |
| Test data | Produced by the deterministic generator `gen-board-fill` (fixed seed): strokes of at most 2,000 points (the object schema limit, SAD §4.1.1) whose JSON-encoded event payload is at most 60,000 bytes, leaving at least 5,536 bytes for Socket.IO framing below the 65,536-byte message limit (M1). For every generated object the generator records the encoded packet size (M1), `BSON.calculateObjectSize` of the object in snapshot form (M2) and the running content size M3 = Σ(M2 + 9). No size is assumed from the point count. |
| Steps | 1. Fill: E submits generated strokes one at a time (each submission waits for its acknowledgement and then 40 ms, i.e. fewer than 25 per second, below the 30 operations/s limit), until R = 15,728,640 − M3 is smaller than the M2 + 9 of a typical stroke. Record the largest M1 (every M1 is checked against 65,536 bytes) and the final M3; cross-check M3 with the board's stored content size (`boards.contentBytes`) and, for the rejected operation of step 3, with `attemptedBytes` in the `op.rejected` log line.<br>2. Boundary — fits: build an object (stroke or text, adjusting points or text length) with M2 + 9 ≤ R and as close to R as achievable; record its M2 + 9 and the resulting M3; submit it.<br>3. Boundary — exceeds: compute the new R; build an object with M2 + 9 = R + 1 byte (or the smallest achievable value above R; record it); submit it.<br>4. Inspect: compare `exportState()` of E and O and the `boardObjects` count and `boards.seq` in MongoDB before and after step 3; check the log for `op.rejected` with `BOARD_FULL`. With M3 at the limit, also submit an update that grows an object, a new object, and an update that does not grow the content.<br>5. Version near the limit: trigger a periodic version directly (same code path as the timer); measure the BSON size of the newest version document with MongoDB's `$bsonSize` (equivalent to `Object.bsonsize` in `mongosh`).<br>6. Recovery after deletion: delete two strokes, then submit a new stroke whose M2 + 9 is smaller than the space freed. |
| Expected result | Step 1: every message M1 ≤ 65,536 bytes; every operation accepted. Step 2: accepted; resulting M3 ≤ 15,728,640. Step 3: rejected with `BOARD_FULL`; E removes its optimistic stroke and shows the message (the scripted client checks the removal only, see Dependencies); O receives no `op:applied`; `boards.seq`, object count and content are identical before and after (step 4); at the limit the growing update and the new object are rejected with `BOARD_FULL` and the non-growing update is accepted. Step 5: a new version exists; its BSON size is ≤ 16,711,680 bytes (defensive threshold) and therefore below 16,777,216 bytes; the test also checks the tighter bound 15,728,640 + 286 + 1,024 bytes (D11c bound plus the version metadata fields). Step 6: accepted. |
| Pass/fail criteria | Pass if every expected result holds, using the recorded M1, M2, M3 and M4 values as evidence (all values are reported). Fail if any message exceeds 65,536 bytes, any over-limit operation is stored or broadcast, or the version is missing or above the threshold. |
| Dependencies / limitations | The generator (`gen-board-fill` in `server/tests/integration/boardLimit.test.js`), the scripted clients and the test hooks are implemented (historical v1.0 note: they were planned and not yet implemented). The 15 MiB limit and its accounting are specified in D11c. The M4 margin is derived in SAD §3.6; this test supplies the measurement that confirms it. Rejection of a clear whose version cannot be stored and recovery of an interrupted clear are covered by TC-025. TC-022 checks the rejection through the client sync module only (scripted clients, no UI): whether the "Board is full" message appears in the browser is not covered by its evidence. The 300 s limit is the test's Jest time budget (`jest.setTimeout(300000)`), not a pass/fail criterion of this test case. |
| Actual result | server/tests/integration/boardLimit.test.js: 243 generated strokes; max M1 31,881 bytes; object of exactly R + 1 bytes rejected BOARD_FULL with no change or broadcast; object of exactly R accepted (M3 = 15,728,640); version M4 15,727,703 bytes; after deleting two strokes a new stroke accepted. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. Re-verification the same day (`docs/evidence/2026-10-12-reverification/`), five full `npm test` runs: run 1 — TC-022 passed (another suite failed, see the status report); run 2, on a heavily loaded machine — TC-022 failed at step 6: deleting stroke `fill-0000` was rejected; the test does not record the error code and the cause is not known; runs 3, 4 and 5 — all 77 tests passed. TC-022 run alone afterwards: passed with the values above. Kept as Pass on Rachit's decision of 12-10-2026 with this reliability issue open and team review pending (`docs/IMPLEMENTATION_STATUS.md` §6). 14-10-2026 addendum: the step-6 failure was reproduced under artificial CPU load (16 busy processes on 8 logical CPUs) with the error code now recorded — `NOT_READY`: both test clients had been disconnected by the Socket.IO heartbeat (`ping timeout`) and the reconnecting client did not send the delete, so the server never received it (`docs/evidence/2026-10-14-tc022-investigation/`). The test was changed: it records the error code, disconnects and timings, and before step 6 waits (at most 60 s) until both clients have joined again; steps 1–5 and all expected results are unchanged. Final test version, same day, uncommitted working tree (base commit 82af885), Windows 10, Node.js 26.7.0, MongoDB 8.2.1: passed alone and in two full `npm test` runs on an idle machine, and passed once under the same 16-process load (Jest time 295.6 s of the 300 s timeout; two `ping timeout` disconnects at 209.6 s, both clients rejoined; max M1 31,881 bytes; M4 15,727,703 bytes; `docs/evidence/2026-10-14-full-verification/15-tc022-cpuload-final.txt`). Why heartbeats are missed under load is not explained. Status unchanged; the team review of this record is still pending (`docs/reviews/TEAM_REVIEW_AGENDA.md` D-03 to D-07). Later on 14-10-2026 (`docs/evidence/2026-10-14-tc022-performance/`): the heartbeat misses were traced to multi-second event-loop stalls in the test process, which hosts the server and both clients (11.1 s and 6.1 s stalls during step 5 on an idle machine running on battery); the earlier statement that the event loop never stalled for more than 133 ms came from a step-5-only measurement that cannot record a stall starting before its first sample, and is withdrawn. Inside Jest's module sandbox the BSON work of the 15 MiB version runs about 15 times slower than in plain Node.js (measured: 4,957 ms versus 324 ms for the size calculation). Two changes followed: the server now writes object additions and updates through the native driver after schema validation (Mongoose re-casting of 2,000-point strokes cost about ten times the write; stored documents verified identical by `server/tests/integration/persistence.test.js`), and the test measures M4 with MongoDB's `$bsonSize` instead of reading the 15 MiB document back (same value, 15,727,703 bytes). Idle, on battery: 147 s before, 67.4 s after, no disconnects. Under the 16-process load, on battery: passed, but the test's own timer measured 303.7 s from start to end against the 300 s timeout (one 52.7 s stall during the version step; two `ping timeout` disconnects, both clients rejoined), so this is not a clean pass; options are listed under D-07. 15-10-2026 addendum (same uncommitted working tree, Windows 10, Node.js 26.7.0, MongoDB 8.2.1, **AC power**; logs kept outside the repository pending team review): TC-022 alone, three runs back to back on an idle machine — all passed, Jest 39.0 s, 38.6 s and 38.6 s (32.7 s measured inside the test each time), acknowledgement p50 29–30 ms, no disconnects, one event-loop stall of 4.1–4.2 s per run during the version step (step 5); under the same 16-process load — passed, Jest 174.6 s (143.4 s inside the test) against 295.6 s for the loaded run before the persistence change (also on AC power), with a 36.2 s stall during the version step and two `ping timeout` disconnects at 102.7 s, both clients rejoined. Also `npm test`: 14 suites, 85 passed. The remaining stall is the synchronous work of the 15 MiB version snapshot (`Version.create` through Mongoose and the BSON size check) in the process that also hosts both test clients. Status unchanged; D-03 to D-07 still pending. Later on 15-10-2026, same code, **on battery**: TC-022 alone twice — passed, Jest 101.2 s (a 12.3 s stall in step 5 and two `ping timeout` disconnects, both clients rejoined, **without artificial load**) and 58.6 s (6.4 s stall, no disconnect); under the 16-process load — passed, Jest 290.6 s (260.7 s inside the test, 9.4 s below the 300 s timeout), 84.5 s stall in step 5, two disconnects, both rejoined; `npm test` 14 suites, 86 passed. A measurement of the version write alone (full 15 MiB board, three repetitions) found the event loop blocked 178–277 ms by the size check and 354–536 ms by `Version.create` in plain Node.js, and 2.2–2.8 s and 2.4–4.0 s respectively inside Jest; writing the version through the native driver instead of Mongoose blocked 272–433 ms (plain) and 1.9–3.2 s (Jest), so the stall is dominated by BSON processing of the snapshot, which Jest's module sandbox slows by roughly ten times. Status unchanged. **Team decision, 16-10-2026** (`docs/reviews/TEAM_REVIEW_AGENDA.md` §4, D-03 to D-07, as communicated to the documentation session; individual approvals and meeting minutes are not recorded): the status is retained as **Pass**, with the following evidence acknowledged. (1) Time budget: the test runs under a 300 s Jest timeout, a test-harness budget and not a pass/fail criterion of TC-022. (2) The loaded run of 14-10-2026 (16-process CPU load, on battery; `docs/evidence/2026-10-14-tc022-performance/10-cpuload-after.txt`) took 303.7 s from test start to end by the test's own timer: it did **not** meet the 300 s budget and is **not** a clean pass, although Jest reported it as passed and all its assertions held. The recorded explanation, not independently verified, is that Jest's timeout timer was itself delayed by the 52.7 s event-loop stall in the version step. (3) Other recorded runs, passed unless stated: 12-10-2026 — alone, and runs 1, 3, 4 and 5 of the re-verification; run 2 (heavily loaded) failed at step 6. 14-10-2026 — changed test alone and in two full `npm test` runs (idle), one 16-process loaded run in 295.6 s; after the persistence change, idle on battery in 67.4 s. 15-10-2026 — idle 39.0, 38.6 and 38.6 s and loaded 174.6 s (AC power); idle 101.2 and 58.6 s and loaded 290.6 s (battery). 16-10-2026 — idle, within the integration suite after the frontend redesign (STP §14). (4) Explanation: the step-6 failure mechanism (both scripted clients dropped by the Socket.IO heartbeat, `NOT_READY`, the delete never sent) was reproduced under load on 14-10-2026; that run 2 of 12-10-2026 had the same cause is consistent with this but not confirmed. The stalls are attributed to BSON processing of the 15 MiB version snapshot inside Jest's module sandbox, where the server and both clients share one process (measured roughly 10–15 times slower than plain Node.js); that the timing overrun is a harness effect rather than an application fault is the team's working explanation and is not proven by TC-022. (5) Rationale (`docs/reviews/TC022_CORRECTION_PROPOSAL.md`, items D and E): apart from run 2 of 12-10-2026, every expected result the test checks held in every run; no recorded TC-022 value changed; the failure and the overrun concern the test harness rather than a violated FR-008 criterion. Limitations accepted with the decision: the timing margin under load is not resolved, no loaded run was made after 15-10-2026, and the test has not been run on a committed build (STP §13). |
| Status | Pass |

#### TC-023 — Member role change and removal

| Field | Value |
|---|---|
| Requirements | FR-049 |
| Type / Priority | Functional, system, positive + negative / Medium |
| Preconditions | Board B with Owner O and Editor members E and M, all connected in browsers. |
| Test data | — |
| Steps | 1. O changes E to Viewer; E tries to draw.<br>2. O changes E back to Editor; E draws.<br>3. O removes M.<br>4. M reloads the dashboard.<br>5. E (Editor) tries to change O's or M's role through the API. |
| Expected result | Step 1: E's tools are disabled without reload and E's attempted edit (sent with `submitRaw`) is rejected with `FORBIDDEN`. Step 2: E can draw again. Step 3: M receives `access:revoked` (member removed) and is disconnected. Step 4: B is not on M's dashboard. Step 5: 403 `FORBIDDEN`. |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Replaces the role-change part of TC-018 v0.1 (TC-018 now covers ownership transfer only). |
| Actual result | access.test.js and E2E: Editor → Viewer disables tools without reload and the next edit is FORBIDDEN; back to Editor; removed member receives MEMBER_REMOVED and is disconnected, board gone from dashboard; Editor PATCH → 403. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-024 — Restore: failure before commit, interrupted restore recovery and idempotent retry

| Field | Value |
|---|---|
| Requirements | FR-033 |
| Type / Priority | Functional, integration (fault injection) + recovery / High |
| Preconditions | Test build with the `FAULT_INJECT` hook (SAD §4.1.6); board B with TB-STD content saved as version n, later changed and versioned again; Owner O as scripted client; observer client V; access to the test MongoDB. |
| Test data | TB-STD; idempotency keys K1–K8 (UUIDs); a second retained version m; fault points `commit_write_error`, `after_pending_restore`, `after_version_insert`, `during_object_replace`, `after_complete`, `db_error_after_commit`. |
| Steps | 1. Set `commit_write_error` (the journaled write of `pendingOp` fails). O restores version n with key K1. Clear the fault; O retries with K1.<br>2. Set `after_pending_restore`; O restores n with key K2 (the server stops right after the commit). Restart the server.<br>3. Set `after_version_insert`; O restores n with key K3 (the server stops after inserting the restore version). Restart.<br>4. Set `during_object_replace`; O restores n with key K4 (the server stops after replacing part of the objects). Restart; restart a second time without any request.<br>5. O repeats the restore of n with key K4; then sends a restore of version m with key K4.<br>6. Set `after_complete`; O restores n with key K5 (the server stops after the completing update, before any response or broadcast). Restart; O retries with K5.<br>7. Set `db_error_after_commit` (database writes fail after the commit; the process keeps running); O restores n with key K6; V submits an operation. Clear the fault and restart; O retries with K6.<br>8. Without faults, O sends a restore of n with key K7 and a restore of m with key K8 concurrently while V submits operations.<br>9. After every restart and request, compare the board objects with the restored version, `boards.seq` with the newest version's `boardSeq`, check that `pendingOp` is absent, count the restore versions, record the version numbers and `seq` values returned, and read the log. |
| Expected result | Step 1: 500 `INTERNAL`; board, `seq` and version list unchanged; no `board:state` to V; `version.restore_failed` logged; the retry with K1 then succeeds with 201 and exactly one new "restore of n" version (the failed attempt recorded no key). Steps 2–4: O received no 201 and V no `board:state` before the crash; after the restart the board equals version n, exactly one new "restore of n" version exists for that key with `boardSeq = boards.seq`, `pendingOp` is absent and `version.restore_rolled_forward` is logged; the second restart in step 4 changes nothing. Step 5: the retry returns 201 with the same `newVersion`, `restoredFrom` and `seq` as the completed restore and no additional version; the request for version m returns 409 `IDEMPOTENCY_KEY_REUSED` and changes nothing. Step 6: after the restart nothing is rolled forward (no `version.restore_rolled_forward`), the board equals n, and the retry with K5 returns the recorded result without a new version. Step 7: O receives 500 `INTERNAL` (no success); `recovery.required` is logged; V's operation is rejected with `INTERNAL`; after the restart the restore is complete as in step 2 and the retry with K6 returns the recorded result. Step 8: both requests succeed with consecutive version numbers and different `seq` values; the board equals the version restored by the request answered last; every operation of V is applied entirely before or after each restore, as shown by the `seq` order. |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Requires the `FAULT_INJECT` hook (test builds only; implemented, historical v1.0 note: planned when this was written). |
| Actual result | server/tests/integration/recovery.test.js with TB-STD as version n: steps 1–7 with every listed fault point (server killed and restarted as a child process), and step 8 in versions.test.js; board equals n, one restore version per key with boardSeq = boards.seq, pendingOp absent, retries return the recorded result, key reuse 409. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-025 — Clear: version write failure and interrupted clear recovery

| Field | Value |
|---|---|
| Requirements | FR-007 |
| Type / Priority | Functional, integration (fault injection) + recovery / High |
| Preconditions | Test build with the `FAULT_INJECT` hook; board B with at least 50 objects and changed content since its latest version; Owner O and observer V as scripted clients; access to the test MongoDB. |
| Test data | Fault points `version_write_error`, `after_preclear_version`, `after_pending_clear`, `during_object_delete`, `after_complete`, `db_error_after_commit`, `recovery_db_error`. |
| Steps | 1. Set `version_write_error` (the before-clear version write fails); O sends `board:clear`.<br>2. Set `after_preclear_version` (the server stops after writing the before-clear version, before the commit); O sends `board:clear`. Restart; O and V reconnect.<br>3. Set `after_pending_clear`; O sends `board:clear` (the server stops right after the commit). Restart; O and V reconnect.<br>4. Add 50 objects; set `during_object_delete`; O sends `board:clear` (the server stops after deleting part of the objects). Restart; restart a second time without any request.<br>5. O sends `board:clear` again on the now empty board.<br>6. Add objects; set `after_complete`; O sends `board:clear` (the server stops after the completing update, before the acknowledgement and broadcast). Restart.<br>7. Add objects; set `db_error_after_commit`; O sends `board:clear`; V submits an operation; then restart the server.<br>8. Add objects; set `after_pending_clear`; O sends `board:clear`. Restart with `recovery_db_error` (database writes fail during start-up recovery); then restart without the fault.<br>9. After each step check the board objects, `boards.seq`, `pendingOp`, the newest versions, the acknowledgements and broadcasts received by O and V, and the log. |
| Expected result | Step 1: rejected with `INTERNAL`; board content and `seq` unchanged; V receives no `op:applied`; `op.clear_failed` logged. Step 2: after the restart the board still holds its content, `seq` is unchanged, `pendingOp` is absent and nothing is rolled forward; the extra "before clear" version (if any) equals the current content. Steps 3–4: O received no acknowledgement and V no `op:applied` before the crash; after the restart the board is empty, `boards.seq` is one higher than before the clear, `pendingOp` is absent, a "before clear" version holds the pre-clear content, `board.clear_rolled_forward` is logged, and the reconnected clients show the empty board; the second restart changes nothing. Step 5: acknowledgement `noop: true`; no new version; `seq` unchanged. Step 6: after the restart nothing is rolled forward; the board is empty with the `seq` of the completed clear; O never receives a success acknowledgement and the client shows the "unconfirmed changes" notice. Step 7: no success acknowledgement for the clear; `recovery.required` logged; V's operation rejected with `INTERNAL`; after the restart the clear is complete as in step 3. Step 8: the first restart logs `recovery.required` and the server exits with a non-zero status without accepting connections; after the second restart the clear is complete as in step 3. |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Requires the `FAULT_INJECT` hook (test builds only; implemented, historical v1.0 note: planned when this was written). |
| Actual result | server/tests/integration/recovery.test.js steps 1–8 with 50 objects (steps 6–8: 5 objects): version_write_error rejected; crashes before/after the commit rolled back/forward as specified; second restart changes nothing; noop clear; unconfirmed-changes notice; recovery_db_error exits non-zero and the next start completes the clear. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |
