# Demo guide — Real-Time Collaborative Virtual Whiteboard (Team 11)

A step-by-step script for demonstrating and explaining the project to the mentor or evaluator. Every
step names what to do, what the evaluator sees, what happens inside the system, and where it is in the
code. Only implemented features are included. File paths are relative to the repository root.

Planned length: about 15 minutes of demonstration plus questions. Section 4 explains the architecture in
more depth for questions; section 5 covers what to do if something goes wrong.

---

## 1. Preparation (the day before and 30 minutes before)

### 1.1 Environment

1. Start from the merged `main` and a clean install:
   ```sh
   git switch main && git pull
   npm install
   ```
2. Make sure `server/.env` exists with real secrets (README, "Installation and configuration"). **Never
   open `server/.env` on the projector**; if you need to explain configuration, show
   `server/.env.example`, which contains only placeholders.
3. Build and run the production-like single server, or the development pair:
   ```sh
   npm run db:start          # terminal 1 (skip if a MongoDB service already listens on 27017)
   npm run dev               # terminal 2: API on :4000, client on http://localhost:5173
   ```
   Check http://localhost:5173 opens and http://127.0.0.1:4000/api/v1/health returns
   `{"status":"ok","db":"up"}`.
4. Run the quick checks once so you can say they pass today: `npm run lint` and `npm run test:unit`
   (about 10 seconds). Keep the full results ready instead of running long suites live (section 3.12).

### 1.2 Two users, two browsers

Collaboration needs two independent sessions. Use **two different browsers** (for example Chrome for the
Owner and Edge for the second user) or one normal and one private window. Arrange them side by side.

Create the accounts in advance with obviously fake data (do not use your real e-mail address or a
password you use elsewhere):

| Role in the demo | Display name | E-mail | Browser |
|---|---|---|---|
| Owner | Demo Owner | `owner@demo.test` | Chrome |
| Second user | Demo Editor | `editor@demo.test` | Edge |

Optionally prepare a board with some content in advance as a fallback (section 5).

### 1.3 Things to have open in a code editor

`client/src/board/BoardPage.jsx`, `client/src/board/Canvas.jsx`, `shared/src/syncClient.js`,
`server/src/realtime/boardEngine.js`, `server/src/access/policy.js`, `server/src/db/models.js`,
`docs/diagrams/png/component-diagram.png`.

---

## 2. Demo flow at a glance

| # | Step | Shows | Time |
|---|---|---|---|
| 1 | Open the application, register / log in | Accounts, tokens | 1 min |
| 2 | Create a board, tour the interface | Dashboard, layout, roles | 1.5 min |
| 3 | Draw with every tool | Canvas, operations | 2 min |
| 4 | Text and object editing | Text, select, move, restyle, delete, eraser | 1.5 min |
| 5 | Share a link; second user joins | Share links, membership, presence | 1.5 min |
| 6 | Live collaboration | Real-time sync, ordering | 2 min |
| 7 | Roles and access control | Viewer, role change, server enforcement | 1.5 min |
| 8 | Persistence and reconnection | Reload, offline banner, resync | 1.5 min |
| 9 | Version history: clear, preview, restore | Versions | 2 min |
| 10 | Export PNG, rename | Additions outside the SRS baseline | 1 min |
| 11 | Close: tests and evidence | Quality | 1 min |

---

## 3. Step-by-step script

### Step 1 — Open the application and log in

**Do:** In Chrome open http://localhost:5173. You are redirected to **Log in**. Show **Register** briefly
(display name 1–30 characters, password 8–72 characters), then log in as Demo Owner.

**Evaluator sees:** the login page, then the dashboard "My boards".

**Inside:**
- `client/src/pages/Auth.jsx` sends `POST /api/v1/auth/login`; the response is `{token, expiresAt, user}`.
- `server/src/auth/authService.js` compares the password with the stored **bcrypt** hash (cost 12). For an
  unknown e-mail it compares against a dummy hash, so the response time does not reveal whether the
  account exists, and the error is always "Invalid e-mail or password." Failed logins are limited to 5 per
  address per 15 minutes.
- The token is a **JWT** valid for 24 hours with a unique `jti`; logout stores the `jti` in
  `revokedTokens` so the token stops working immediately.
- The client keeps the session in `localStorage` (`client/src/session.js`).

**Why:** stateless tokens work for both REST and Socket.IO; the `jti` revocation list makes logout real.

### Step 2 — Create a board and tour the interface

**Do:** Type a title (for example "Demo board") and click **Create board**. On the board, point out the
parts of the screen.

**Evaluator sees:** the board page: top bar (back to boards, title, **Owner** badge, "Connected" status,
participant avatars, Export PNG, Members, Share, Clear, panel toggle), the toolbar on the left, the dotted
canvas, and the side panel with **Participants** and **History** tabs.

**Inside:**
- `POST /api/v1/boards` creates the board with the user as `ownerId` (`server/src/access/accessService.js`).
- `client/src/board/BoardPage.jsx` loads the title (`GET /api/v1/boards/{id}`) and opens a Socket.IO
  connection to the namespace `/board` with the token in the handshake (`transports: ['websocket']`).
- It sends `board:join`; the acknowledgement returns the role, the board state `{seq, objects}` and the
  participant list. When everything is drawn the page records the `board-ready` performance mark (used by
  the NFR-003 load-time test).

**Why:** the role badge and connection status are always visible (NFR-007); the server sends the role, so
the UI never trusts a role it invented itself.

### Step 3 — Draw with the tools

**Do:** Draw a rectangle (R), an ellipse (O), a line (L) and a freehand stroke with the pen (P). Change
the colour (preset swatch or the colour picker) and the width (1–20) between shapes.

**Evaluator sees:** each shape appears immediately where the mouse was dragged.

**Inside:**
- `client/src/board/Canvas.jsx` handles pointer events. During a drag it draws a draft; on release it
  creates a board object (`kind` stroke/rect/ellipse/line, geometry, `color`, `strokeWidth`) with a new
  UUID (`newObjectId()` in `geometry.js`, which also works over plain HTTP).
- `BoardPage.jsx` submits `object:add` through a small outbox (at most 20 per second, below the server's
  limit of 30) to `shared/src/syncClient.js`, which **shows it immediately** (optimistic rendering) and
  sends `op:submit {boardId, clientOpId, type, payload}`.
- On the server, `server/src/realtime/boardEngine.js` runs it in the board's FIFO queue: authorise
  (`policy.js`) → validate the schema (`server/src/validation.js`, Ajv) → check the 15 MiB size limit →
  **write to MongoDB** → assign the next sequence number → acknowledge the sender and broadcast
  `op:applied` to everyone else in the room.

**Why:** optimistic rendering keeps drawing responsive; persisting before acknowledging means an
acknowledged change survives a server crash (FR-027).

### Step 4 — Text and editing objects

**Do:**
1. Text tool (T), click on the canvas, type "Release plan", press Enter.
2. Select tool (V), click the rectangle, drag it; with it selected, click a different colour; press
   Delete.
3. Double-click the text with the select tool and change it.
4. Eraser (E): drag across two shapes.

**Evaluator sees:** the text appears; the shape moves, changes colour and disappears; the text is edited;
everything the eraser touches is removed.

**Inside:**
- Text is limited to 500 characters and drawn on the canvas as plain text (never as HTML, so no script
  injection — TC-107).
- Move, restyle and text edit send `object:update {id, ...changedProperties}` with the complete new
  values; delete and eraser send one `object:delete {id}` per object.
- Changing colour or width while an object is selected restyles that object (`changeStyle` in
  `BoardPage.jsx`).

### Step 5 — Share a link; the second user joins

**Do:** As Owner click **Share**, choose **Editor** and **24 hours**, click **Create link**, copy it. In
Edge, log in as Demo Editor and paste the link.

**Evaluator sees:** the Share dialog shows the link **once**, then lists it with role and expiry. In Edge
the board opens with the **Editor** badge; both browsers show two participants.

**Inside:**
- `POST /api/v1/boards/{id}/links {role, expiresIn}`: the server generates 32 random bytes (256 bits)
  and stores only their **SHA-256 hash**, so a database leak does not reveal usable links.
- The link has the form `/join#<token>`: the token is in the URL **fragment**, which browsers do not send
  to the server when the page loads; `client/src/pages/Join.jsx` removes it from the address bar.
- `POST /api/v1/links/resolve` turns a logged-in user into a member with that role. Without an account,
  the page asks for a display name and the person joins as a **guest** with a board-bound guest token
  kept in `sessionStorage` (it ends with the browser session and with the link).
- The server broadcasts `presence:update`; guests are marked "(guest)".

**Optional:** show joining as a guest from a private window with a Viewer link (screenshot
`screenshots/10-viewer-guest.png`).

### Step 6 — Live collaboration

**Do:** Draw in Chrome, then in Edge; then both draw at the same time. Move the same object in both
windows almost simultaneously.

**Evaluator sees:** every change appears in the other window without reloading; after simultaneous edits
both windows show the same board.

**Inside:**
- The server is the **single authority**: every accepted operation gets a per-board sequence number in one
  queue, so all clients apply the same operations in the same order.
- `syncClient.js` applies events strictly by sequence number, ignores duplicates, buffers out-of-order
  events, and if a gap is not closed within 1 second it re-joins to fetch the server state.
- If two users change the **same property** of the same object, the later sequence number wins (last
  write wins, SRS FR-023); changes to different objects or different properties are both kept.

**Why:** a server-ordered log is simple to reason about and test (the five-client integration suite
`server/tests/integration/multiClient.test.js` checks convergence against MongoDB). The trade-off is
documented: same-property conflicts are not merged.

### Step 7 — Roles and access control

**Do:** As Owner open **Members**, change Demo Editor to **Viewer**.

**Evaluator sees:** in Edge the badge changes to "View only" and the drawing tools disappear, without a
reload. Change it back to Editor.

**Inside:**
- `PATCH /api/v1/boards/{id}/members/{userId}`; the server sends `role:changed` to that user's sockets.
- Every REST route and every Socket.IO event calls the same `authorize()` (`server/src/access/policy.js`)
  with the role read from the database, never from the request. A Viewer who sends a crafted
  `op:submit` anyway gets `FORBIDDEN` and nothing is stored or broadcast (TC-101).
- Someone with no role gets `404 BOARD_NOT_FOUND`, so the existence of a board is not revealed; a too-low
  role gets `403 FORBIDDEN`.

**Also available (mention or show):** revoking a link (guests admitted by it are disconnected within 5
seconds), removing a member, and **transferring ownership** (Members → "Make Owner", with a confirmation;
the old Owner becomes an Editor).

### Step 8 — Persistence and reconnection

**Do:**
1. Reload the Chrome page — the board comes back.
2. In Edge open DevTools → Network → set throttling to **Offline**. Draw something in Chrome. Set Edge back
   to **No throttling**.

**Evaluator sees:** after the reload, the same content. In Edge a yellow banner "Disconnected —
reconnecting… Editing is disabled until the board is resynchronised" and disabled tools; after going back
online the banner disappears and Edge shows the change made meanwhile.

**Inside:**
- Every accepted operation is in MongoDB (`boardObjects`, plus `boards.seq`), so reload and even a server
  restart lose nothing acknowledged (TC-011, tested by killing the server).
- Socket.IO reconnects automatically (0.5–2 s back-off); the server's heartbeat detects a dead link within
  20 s. On reconnection the client joins again and **replaces** its state with the server's.
  Unconfirmed local changes are discarded with a notice rather than silently re-sent.

**Note:** with DevTools "Offline" the banner usually appears within a few seconds; if the network is cut
in a way the browser does not notice, the heartbeat needs up to 20 seconds — keep talking while it
happens.

### Step 9 — Version history: clear, preview, restore

**Do:** As Owner click the **trash** icon (Clear board), read the confirmation, confirm. Open the
**History** tab, click the "Before clear" version, show the read-only preview, click **Restore this
version…** and confirm.

**Evaluator sees:** both boards empty; the version list; the preview; then both boards get the content
back, and Edge shows "… restored version 1 (saved as version 2)".

**Inside:**
- Before clearing, the server saves a "before clear" version (only if the content changed — the
  no-change rule), so a clear can always be undone. Only the Owner can clear.
- Versions are full snapshots in the `versions` collection. They are also created every 5 minutes while
  the board changes and when the last participant leaves; at least the 20 newest are kept.
- `POST /api/v1/boards/{id}/versions/{n}/restore` with an `Idempotency-Key` header: the restore is
  journalled on the board document, so a crash in the middle is completed or rolled back at start-up, and
  a retry with the same key does not restore twice. It always creates a **new** version ("Restore of
  version n"); history is never deleted. The server sends `board:state` to every participant.

**Why:** restore must be safe for everyone on the board at once; journalling and idempotency were tested
with fault injection (TC-024, TC-025).

### Step 10 — Export PNG and rename

**Do:** Click **Export PNG**. On the dashboard, use **Rename** on a board while the board is open in Edge.

**Evaluator sees:** a file `<title>-<date>.png` is downloaded with the toast "Board exported as …"; the
renamed title appears in Edge without a reload.

**Inside:**
- Export runs entirely in the browser (`client/src/board/exportImage.js`): it draws the objects with the
  same renderer as the canvas (`render.js`) onto an off-screen canvas starting at the board origin, scales
  very large boards down to fit browser limits, and refuses an empty board with a message.
- Rename is `PATCH /api/v1/boards/{id}` (Owner only); the server broadcasts `board:renamed`.

**Be transparent:** these two functions were added during the sprints (issues #16 and #13) but are
**outside the SRS version 1.0 requirement baseline** — the SRS lists export as a candidate enhancement.
Their scope is a pending decision with the mentor (SRS §2.7); they are tested, but not counted in the
requirement coverage.

### Step 11 — Close with quality evidence

**Do:** Show `docs/reports/RELEASE_READINESS_2026-11-02.md` §3 and a green GitHub Actions run.

**Say:** 210 unit and integration tests and 31 end-to-end tests pass; the E2E suite also passes in
installed Chrome and Edge and in Playwright's Firefox and WebKit builds; CI runs on every Pull Request; 49
of the 50 requirements are verified — the remaining one, HTTPS deployment (TC-109), needs a deployed
server.

---

## 4. Technical explanation (for questions)

### 4.1 Frontend architecture

- React 18 single-page application built with Vite (`client/`). A minimal history-API router
  (`client/src/router.jsx`) serves five pages: `/login`, `/register`, `/` (dashboard), `/join` (share
  link entry) and `/boards/:id`.
- `BoardPage.jsx` owns the board session: the Socket.IO connection, the sync client, the outbox, role and
  connection state, dialogs and toasts. `Canvas.jsx` handles pointer input and drawing; `render.js` draws
  objects; `geometry.js` does hit testing, shapes from drags and object IDs; `Toolbar.jsx`,
  `SidePanel.jsx` and `OwnerDialogs.jsx` are the UI parts; `exportImage.js` creates the PNG.
- **State management** uses plain React state plus the sync client, which holds the board state outside
  React and triggers a re-render when it changes. No Redux is needed because the board state has one
  owner (the sync client) and one source of truth (the server).

### 4.2 Shared synchronisation logic (`shared/src/syncClient.js`)

- Three structures: `confirmed` (server state up to `lastSeq`), `pending` (own operations waiting for
  acknowledgement) and `buffer` (events that arrived ahead of the next sequence number). The displayed
  board is `confirmed` plus `pending`.
- Acknowledgement → move the operation to `confirmed`; rejection → drop it and show the reason (rollback).
- The same module runs in the browser and in the Node.js test harness, so tests exercise the real client
  logic. It is in the `shared/` workspace for exactly this reason.

### 4.3 Backend architecture

- Express 5 REST API (`server/src/rest/app.js`) under `/api/v1`: accounts, boards, links, members,
  ownership transfer, versions, health. Every request gets an ID (`X-Request-Id`) that appears in logs
  and error responses.
- Socket.IO server (`server/src/realtime/realtimeServer.js`): namespace `/board`, JWT authentication in
  the handshake, one room per board, 30 operations per second per connection, 64 KiB message limit.
- Services: `authService` (accounts, tokens), `accessService` (boards, members, links, ownership),
  `versionService` (versions, restore), all sharing `policy.js` for authorisation.
- `boardQueue.js` gives each board a FIFO queue, so operations, clear, restore and version snapshots of one
  board never interleave, while different boards run independently.
- Start-up: connect to MongoDB, run recovery of interrupted clears and restores and the integrity check,
  then accept connections (`server/src/server.js`, `recovery.js`, `db/integrity.js`).

### 4.4 MongoDB data model (`server/src/db/models.js`)

| Collection | Main fields | Notes |
|---|---|---|
| `users` | `email` (unique, lower-case), `passwordHash` (bcrypt), `displayName` | never the password |
| `boards` | `title`, `ownerId`, `seq`, `contentBytes`, `pendingOp` | `pendingOp` journals an unfinished clear or restore |
| `boardObjects` | `boardId`, `objectId`, `kind`, geometry/points/text, `color`, `strokeWidth`, `updatedSeq` | unique (`boardId`, `objectId`); a MongoDB `$jsonSchema` validator also protects direct driver writes |
| `memberships` | `boardId`, `userId`, `role` (editor/viewer) | the Owner is stored on the board, not here |
| `shareLinks` | `boardId`, `tokenHash` (SHA-256), `role`, `expiresAt`, `revokedAt` | expired links are removed by a TTL index after a day |
| `versions` | `boardId`, `number`, `boardSeq`, `trigger`, `restoredFrom`, `objects` | full snapshots; unique (`boardId`, `number`) |
| `revokedTokens` | `jti`, `expiresAt` | logout list; TTL index removes entries when the token would have expired anyway |

### 4.5 Authentication and authorisation

- Registered users: JWT session token (24 h). Guests: JWT guest token bound to one board and one link,
  expiring with the link (at most 24 h). The server re-checks the link's expiry and revocation on use.
- One permission policy (`policy.js`) implements the SRS FR-051 matrix: Viewer can view; Editor can edit
  content; only the Owner can clear, restore, manage links and members, transfer ownership, rename and
  delete. Unknown actions throw instead of defaulting to allow.

### 4.6 Error handling

- One error table shared by client and server (`shared/src/errorCodes.js`): every error has a code, an
  HTTP status, a server message and a user message.
- The server turns any error into `{error: {code, message, requestId}}` and never sends stack traces or
  database messages (`server/src/errors.js`). The client shows the shared user message
  (`describeError()` in `client/src/api.js`), including for a server that cannot be reached.

### 4.7 Testing strategy (actual numbers, 02-11-2026)

| Level | Tool | Count | Examples |
|---|---|---|---|
| Unit | Jest | 110 tests, 9 suites | permission matrix, validation, sync rules, geometry, export layout |
| Integration | Jest + real `mongod` + scripted Socket.IO clients | 100 tests, 13 suites | five-client sync, recovery with fault injection, database integrity, TLS |
| End-to-end | Playwright | 31 tests | drawing sync, sharing, roles, versions, reconnection, layout, validation, smoke |
| Cross-browser | Playwright | same 31 | Chrome and Edge 31/31; Playwright Firefox 28 + 3 skipped; WebKit 29 + 2 skipped |
| Performance | harness | TC-019, 013, 020, 009 | measured on 12-10-2026, all targets met (STP records) |

Be precise about browsers: Playwright's Firefox and WebKit are engine builds, not stable Mozilla Firefox
or Apple Safari. Safari has not been tested.

---

## 5. Contingencies

| Problem | What to do |
|---|---|
| **The API server does not start** | Read the terminal: "server.start_failed" with a reason. Most common: `server/.env` missing or a secret shorter than 32 characters (the server refuses to start), or MongoDB not reachable within 5 seconds. Fix and run `npm run dev` again. Do not show `.env` on screen. |
| **MongoDB is unavailable** | The server does not start without it (it exits rather than run without storage). Start it with `npm run db:start`, or start the Windows MongoDB service. If MongoDB stops during the demo, `/api/v1/health` returns `503` and changes are rejected with an error message instead of being lost — you can show this as error handling, then restart MongoDB and reload. |
| **The client shows "The server cannot be reached"** | The API is down; the client is still served by Vite. Restart `npm run dev`. |
| **Collaboration does not appear** | Check both windows show "Connected" and two participants. Make sure the second browser is a different browser or a private window (two tabs of one browser share the same login). Reload the second window; it re-joins and receives the full state. |
| **Port 4000 or 5173 is busy** | Stop the other process, or set `PORT` in `server/.env` and `WB_API_URL` for Vite accordingly. |
| **Reconnection takes long** | The heartbeat may need up to 20 seconds; use DevTools "Offline" rather than unplugging the network. |
| **No network at the venue** | Nothing in the demo needs the Internet: browser, API and MongoDB all run on `localhost`. Install dependencies and Playwright browsers beforehand. |
| **Everything fails** | Use the real screenshots in `docs/final-submission/screenshots/` (taken from the running application on 02-11-2026) and the test evidence in `docs/evidence/2026-11-02-final-validation/`; explain the flow with the component diagram. There is no other offline mode of the application. |

**Do not expose credentials:** never show `server/.env`, browser storage (DevTools → Application) or a
share link from a real board on screen; use the fake demo accounts; the share link in the dialog is
shown only once — close the dialog after copying.

---

## 6. Likely questions and short answers

- **Why Socket.IO instead of plain WebSockets?** Acknowledgements per message, automatic reconnection,
  rooms and a heartbeat, all of which the synchronisation design relies on.
- **Why not CRDTs?** For whole objects with a single authoritative server, a sequenced log with
  last-write-wins per property is simpler and fully testable; CRDT merging of text is listed as future
  work (SAD §4.6).
- **What happens if two people delete and edit the same object?** The operation with the lower sequence
  number is applied first; an update to an already deleted object is rejected, and every client ends up
  with the same state (tested in `multiClient.test.js`).
- **How do you know a restore cannot corrupt the board?** It is journalled and idempotent; the tests kill
  the server at every point of a restore and check recovery (TC-024).
- **What is not finished?** HTTPS deployment verification (TC-109), Safari testing, physical-device
  checks, the scope decision for export/rename, team sign-off of the documents.
