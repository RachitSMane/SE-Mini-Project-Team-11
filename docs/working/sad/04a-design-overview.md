<!-- Owner: Krishna | Reviewers: Rachit, Pranav | Status: v1.0 -->

## 4. Design

### 4.1 Design Overview

This section is a design specification (historical v1.0 note: written before any application code
existed). Implementation status and test evidence: execution of 12-10-2026 (uncommitted working tree on base commit 82af885; see `docs/IMPLEMENTATION_STATUS.md`).

#### 4.1.1 Board object model and operations

Every board object has a client-generated UUID `id`, a `kind` (`stroke`, `rect`, `ellipse`,
`line`, `text`) and kind-specific properties: `points` (array of `[x, y]`, at most 2,000 points)
for strokes; `x`, `y`, `w`, `h` for rectangles and ellipses; `x1`, `y1`, `x2`, `y2` for lines;
`x`, `y`, `text` (≤ 500 characters) for text; and `color` (`#RRGGBB`) and `strokeWidth` (1–20)
for all kinds.

Four operation types travel over API-01: `object:add` (full object), `object:update` (object `id`
plus the **complete new values** of the changed properties), `object:delete` (`id`) and
`board:clear` (Owner only). Moving, restyling and editing text are `object:update`; erasing sends
one `object:delete` per touched object.

#### 4.1.2 Server processing of an operation (COMP-06)

Operations for one board pass through a **per-board FIFO queue** and are processed one at a time,
so the server's acceptance order is a total order. For each `op:submit` the server:

1. Checks the per-connection rate limit (SEC-REQ-006) and the payload schema and size (SEC-REQ-005).
2. Calls `authorize(actor, boardId, action)` with the role held on the server (SEC-REQ-003).
3. Checks preconditions: update or delete of a missing object → `OBJECT_NOT_FOUND`; `contentBytes` (conservative BSON size, §3.6) above 15 MiB after the change → `BOARD_FULL` (FR-008), checked before any write; `board:clear` on an empty board → accepted as a no-op without a sequence number (FR-007).
4. Assigns `seq = board.seq + 1` and writes the effect to `boardObjects` (with `updatedSeq = seq`) and the new `seq` to `boards`, both with journaled write concern (`{w: 1, j: true}`). A `board:clear` does not use steps 4–5: it follows the journalled clear procedure of §3.6 (before-clear version, `pendingOp` commit, deletion, completion), so a clear is never acknowledged or broadcast before it is complete and an interrupted clear is completed at start-up (FR-007).
5. Only after both writes succeed: updates the in-memory board cache, sends the acknowledgement to the submitter and broadcasts `op:applied` to the other sockets in the room (**persist before acknowledge and broadcast**, FR-027). If a write fails, the operation is rejected with `INTERNAL`; nothing is acknowledged or broadcast and `seq` is not advanced.

Crash safety without multi-document transactions (a standalone MongoDB does not support them):
on start-up COMP-06 sets each board's `seq` to the maximum of the stored `boards.seq` and the
largest `updatedSeq` in `boardObjects` — as step 2 of the start-up recovery order in §3.6, after
step 1 has completed every journalled clear or restore (`boards.pendingOp`). A sequence number can only be reused if the server
crashed after writing but before acknowledging, in which case no client ever saw it.

#### 4.1.3 Acknowledgement and client reconciliation (COMP-02)

**Acknowledgement contents.** Success: `{ok: true, clientOpId, seq}`. Rejection:
`{ok: false, clientOpId, error: {code, message, requestId}}`. The server never alters an accepted
payload, so the acknowledged effect equals the submitted operation.

**Client state.** Each client keeps:

- `confirmed` — the canonical board state up to `lastSeq` (all operations with sequence number ≤ `lastSeq` applied in order);
- `pending` — its own submitted but unacknowledged operations, in submission order;
- `buffer` — events received with a sequence number greater than `lastSeq + 1`.

The **rendered view** is `confirmed` with the `pending` operations applied on top (optimistic
display).

**Processing rules.**

1. Every accepted operation reaches a client exactly once with its sequence number: as `op:applied` (operations of others) or as a success acknowledgement (own operation).
2. An event with `seq = lastSeq + 1` is applied to `confirmed`, `lastSeq` is incremented, and any buffered events that are now in order are applied. For a success acknowledgement the operation is also removed from `pending`.
3. An event with `seq ≤ lastSeq` is a duplicate or already contained in a resynchronised state: it is not applied again (an acknowledgement still removes its operation from `pending`).
4. An event with `seq > lastSeq + 1` is placed in `buffer`. A **gap** exists while `buffer` is non-empty. If the gap is not closed within 1 s, or `buffer` holds more than 100 events (D6b), the client resynchronises: it emits `board:join`, replaces `confirmed` with the returned state, sets `lastSeq` to the returned `seq`, discards `buffer` and keeps `pending`.
5. On a rejection acknowledgement the operation is removed from `pending`, the view is recomputed (its local effect disappears) and the error message is shown (FR-026). Later pending operations that depended on it (e.g. an update of a rejected new object) are rejected by the server with `OBJECT_NOT_FOUND` and handled the same way.
6. If no acknowledgement arrives within 10 s (D6b), the client treats the connection as unhealthy, disconnects and follows the reconnection procedure.

**Convergence.** Each client applies exactly the server's accepted operations in sequence order to
`confirmed`. Because updates carry complete property values, applying the same sequence to the
same starting state gives the same result on every client and on the server, so all `confirmed`
states equal the server state at the same `seq`. Pending operations only affect the submitter's
view until they are acknowledged (then part of `confirmed`) or rejected (then removed). Since
Socket.IO delivers messages on one connection in order and the server emits in sequence order,
rules 3 and 4 are safeguards rather than the normal path.

**Conflict policy (last write wins).** When two updates change the same property of the same
object, the one with the higher sequence number is applied last and determines the final value
on every client (FR-023). Different properties or different objects are both preserved
(FR-022). A delete followed by an update of the same object rejects the update with
`OBJECT_NOT_FOUND`. Limitation: a concurrent edit of the same text object keeps only the later
text; no merge is performed.

#### 4.1.4 Reconnection (COMP-02, COMP-06)

- The Socket.IO client reconnects automatically with `reconnectionDelay` 500 ms, `reconnectionDelayMax` 2,000 ms and `randomizationFactor` 0.2 (D6b). The library default maximum of 5,000 ms would make NFR-004 (5 s) unattainable, so the lower maximum is required.
- The server detects a silently lost connection with the Socket.IO heartbeat: `pingInterval` 10 s and `pingTimeout` 10 s (library defaults 25 s and 20 s; `server/src/server.js`), so the disconnected indicator of FR-025 appears within about 20 s of an outage (TC-009). The heartbeat is answered on the event loop, so a connection is also dropped if either side's event loop is blocked for longer than this; the longest synchronous server step is saving a full-board version (BSON size check and serialisation of up to about 15 MiB; measured 0.5–0.8 s in plain Node.js on the development laptop, 15-10-2026). In TC-022, which runs the server and both test clients in one Jest process, the same step took several seconds and, under artificial CPU load, longer than the heartbeat, so the test clients reconnected (STP TC-022).
- While disconnected the client shows the indicator and disables tools (FR-025).
- After `connect` the client emits `board:join`, replaces `confirmed` with the returned state and `lastSeq` with the returned `seq`, and clears `buffer`. Pending operations whose acknowledgement was lost cannot be distinguished from operations that never reached the server; version 1.0 therefore **discards all pending operations** after resynchronisation and shows the "unconfirmed changes may not have been saved" notice if any were pending (FR-025). Idempotent resubmission using `clientOpId` is future work (§4.6).
- The client records the `board-ready` performance mark after the resynchronised state is rendered and tools are enabled (used by NFR-004).

#### 4.1.5 Version triggers (COMP-07)

COMP-07 keeps one timer per active board with interval *T* (configuration `VERSION_INTERVAL_MS`;
5 minutes, D11a). It also receives "before clear" and "last participant left" events from
COMP-06. Every automatic trigger applies the no-change rule of SRS §4.3: COMP-07 compares the
board's `seq` with the `seq` recorded in the latest version (`versions.boardSeq`) and creates a
snapshot only if they differ. Restore always creates a version. Version creation, clear and
restore run as tasks in the board's queue (§3.6), so every snapshot corresponds exactly to one
sequence number and no operation is applied while a clear or restore is in progress.

#### 4.1.6 Test hooks (test builds only)

The STP relies on the following hooks (all implemented; historical v1.0 note: none existed when this was written). They are compiled only into test builds
(`NODE_ENV=test` / client test build) and are never enabled in a deployed system:

| Hook | Purpose | Used by |
|---|---|---|
| `performance.mark("board-ready")` in COMP-01 | Defines the end point of load and reconnection timing (always present; harmless in production) | NFR-003, NFR-004; TC-009, TC-020 |
| `window.__wbTest.exportState()` | Returns `{lastSeq, objects}` of the client for comparison | TC-006 to TC-008, TC-011 |
| `window.__wbTest.submitRaw(op)` | Submits an operation without client-side validation | TC-010, TC-107 |
| `VERSION_INTERVAL_MS` | Shorter periodic version interval in tests (value recorded in the test log) | TC-012, TC-014 |
| `LINK_EXPIRY_OVERRIDE_SEC` | Allows a 60 s link expiry in tests | TC-103 |
| Test JWT secret in `.env.test` | Lets tests sign deliberately expired tokens | TC-106 |
| `FAULT_INJECT` (`version_write_error`, `after_preclear_version`, `commit_write_error`, `after_pending_clear`, `during_object_delete`, `after_pending_restore`, `after_version_insert`, `during_object_replace`, `after_complete`, `db_error_after_commit`, `recovery_db_error`) | Makes the server stop the process or fail a database write at a chosen point of a clear, a restore or start-up recovery (§3.6) | TC-024, TC-025 |

### 4.2 UML Sequence Diagrams

Five project-specific flows are specified (the template requires at least two). Each is split into
numbered parts so that its labels stay legible; wide parts are printed on landscape pages. Sources
are in `docs/diagrams/src/`.
