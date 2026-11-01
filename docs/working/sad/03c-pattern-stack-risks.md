<!-- Owner: Krishna | Reviewers: Rachit, Prithvi | Status: v1.0 -->

### 3.5 Chosen Architecture Pattern and Rationale

**Pattern:** client–server with a **layered server** (interface layer → service layer →
persistence layer) combined with **event-driven publish/subscribe** for real-time collaboration
(one Socket.IO room per board) and a **server-authoritative state** model.

- The interface layer (COMP-03 for REST, COMP-06 for Socket.IO) authenticates, validates and authorises every input before calling services.
- The service layer (COMP-04, COMP-05, COMP-07, and the sequencing logic of COMP-06) contains the business rules; the permission policy exists in exactly one place (COMP-05).
- The persistence layer (COMP-08) hides MongoDB behind repository functions.
- The server orders every operation (sequence numbers) and is the only source of truth; clients render optimistically but always converge to server order.

**Why this pattern:**

| Concern | How the pattern addresses it |
|---|---|
| Consistency (FR-021–FR-023) | One authority orders all operations; per-property last-write-wins is deterministic because order is global per board. |
| Security (SEC-REQ-003) | All changes pass through the server, where role checks use server-side data only. |
| Latency (NFR-001) | Persistent Socket.IO connections avoid per-operation HTTP overhead; rooms limit broadcast to one board. |
| Team size and testability | Layers can be developed and unit-tested separately; REST and Socket.IO contracts are explicit (§4.3). |

**Alternatives considered and rejected:**

| Alternative | Reason for rejection |
|---|---|
| Peer-to-peer (WebRTC mesh) | No central authority for ordering and permission checks; harder to secure and persist. |
| CRDT or operational transformation | Merges concurrent edits more precisely but adds significant complexity; per-property LWW is sufficient for strokes, shapes and short text (limitation recorded in SRS §4.2). |
| Microservices | Operational overhead disproportionate to a single-instance student project. |
| REST polling for updates | Cannot meet NFR-001 efficiently; higher server load. |

### 3.6 Technology Stack & Data Stores

**Selected technology stack (DECISIONS.md D10):**

| Layer | Technology | Purpose |
|---|---|---|
| Client | React (SPA) with the HTML Canvas 2D API | UI, rendering of board objects |
| Real-time transport | Socket.IO (server and client libraries) | Board events, presence, notifications (API-01) |
| Server runtime | Node.js (current LTS release) | Application server |
| HTTP framework | Express.js | REST API (API-02, API-03), middleware |
| Database | MongoDB (Community edition, local) with Mongoose ODM | Persistent data |
| Authentication | JWT session tokens; bcrypt password hashing (D13) | SEC-REQ-001, SEC-REQ-002 |
| Validation | JSON-schema validation of REST bodies and Socket.IO payloads | SEC-REQ-005 |

**Data stores (MongoDB collections):**

| Collection | Key fields | Notes |
|---|---|---|
| `users` | `_id`, `email` (unique index), `passwordHash`, `displayName`, `createdAt` | No plain-text password (SEC-REQ-001) |
| `boards` | `_id`, `title`, `ownerId`, `seq` (last committed sequence number), `contentBytes`, `pendingOp`, `updatedAt` | `seq` advanced once per accepted operation (§4.1.2); `contentBytes` = M3 (FR-008); `pendingOp` = durable journal of an unfinished clear or restore (see below) |
| `boardObjects` | `boardId`, `objectId`, `kind`, geometry, `color`, `strokeWidth`, `text`, `updatedSeq` | Unique index (`boardId`, `objectId`); current state only. Additions and updates are written through the MongoDB driver directly, not through Mongoose document casting, after the payload has passed the operation schemas (SEC-REQ-005: no additional properties, whitelisted update fields); the stored fields and BSON types are the same as the Mongoose model's (`server/tests/integration/persistence.test.js`). Deletions, `boards` and `versions` writes use Mongoose. |
| `memberships` | `boardId`, `userId`, `role` (`editor`/`viewer`) | The Owner is stored on the board, not here |
| `shareLinks` | `_id`, `boardId`, `tokenHash`, `role`, `expiresAt`, `revokedAt`, `createdBy` | Token stored only as SHA-256 hash (SEC-REQ-004); TTL index for cleanup |
| `versions` | `boardId`, `number`, `boardSeq`, `trigger`, `restoredFrom`, `requestId`, `createdAt`, `createdBy`, `objects[]` | Full snapshot; unique index (`boardId`, `number`); sparse unique index (`boardId`, `requestId`) for idempotent restores; `boardSeq` implements the no-change rule |
| `revokedTokens` | `jti`, `expiresAt` | Logout revocation list; TTL index removes entries after expiry |

**Database prerequisites.** Version 1.0 runs one MongoDB server without a replica set, so
multi-document transactions are **not** used. The design relies only on guarantees a standalone
server provides: every single-document write is atomic, and writes issued with write concern
`{w: 1, j: true}` are durable in the journal before they are acknowledged. Journaling must be
enabled (the WiredTiger default). Running a single-node replica set would allow transactions, but
the recovery design below does not depend on them.

**Version storage, triggers and retention (behaviour per SRS §4.3):**

- *Storage:* each version is one document containing a full copy of the board's objects (`objects[]`) and the board `seq` it corresponds to (`boardSeq`). Each element of `objects[]` is the object in **snapshot form** — `id`, `kind`, geometry, `color`, `strokeWidth`, `text` — without the storage-only fields `_id`, `boardId` and `updatedSeq` of `boardObjects`.
- *Triggers:* (a) every *T* = 5 minutes (configuration `VERSION_INTERVAL_MS`, D11a), (b) before a clear, (c) when the last participant leaves. Each automatic trigger creates a version only if `boards.seq` differs from the latest version's `boardSeq` (no-change rule). A restore always creates a version with `trigger = "restore"` and `restoredFrom = n`.
- *Retention:* after each completed version write, versions older than the 20 most recent are deleted (FR-035), except a version referenced by `pendingOp`. No other operation modifies or deletes a version.

**Serialisation.** Every change to a board — real-time operations, clear, restore, automatic
version creation and ownership transfer — runs as a task in that board's single FIFO queue in
COMP-06 (one task at a time per board). A REST restore request is enqueued as such a task and its
HTTP response is sent when the task finishes. Start-up recovery (below) completes before the
server accepts any connection or request. The design assumes exactly one server instance;
several instances would need a distributed lock and are out of scope (§4.6).

**Durable operation journal (`boards.pendingOp`).** Clear and restore are the two operations that
change many documents. Before their first destructive write, the task records the operation in
`boards.pendingOp` with one atomic, journaled single-document update; the same update that sets
the new `seq` at the end also removes `pendingOp`. The **commit point** is the journaled write of
`pendingOp`: from then on the operation is always completed (never rolled back), either by the
running task or by start-up recovery. No client receives an acknowledgement, `op:applied`,
`board:state` or HTTP success before `pendingOp` has been removed.

| Step | Clear (task for `board:clear`, FR-007) | Restore of version *n* (API-03, FR-033) |
|---|---|---|
| 1 | If the board is empty: acknowledge `{ok: true, seq: null, noop: true}`; stop. | If a version with the request's `requestId` exists for this board: if its `restoredFrom` is *n*, return the recorded result `{newVersion: number, restoredFrom, seq: boardSeq}` without applying anything again (idempotent retry); otherwise reject with `409 IDEMPOTENCY_KEY_REUSED`; stop. Load snapshot *n* (`VERSION_NOT_FOUND` if not retained). |
| 2 | Apply the "before clear" trigger: write version *v* if the board has changed content (no-change rule). On failure: reject with `INTERNAL`; nothing else changed. | Compute M4 of version *r* (snapshot *n* plus metadata); above the defensive threshold, reject with `INTERNAL` and log `version.snapshot_too_large` (should not occur, FR-008). |
| 3 | **Commit:** set `pendingOp = {type: "clear", seq: s, preClearVersion: v}` where `s = seq + 1` (journaled). | **Commit:** set `pendingOp = {type: "restore", seq: s, version: r, restoredFrom: n, requestId}` where `s = seq + 1` and `r` is the next version number (journaled). |
| 4 | Delete all `boardObjects` of the board. | Insert version *r* (`trigger: "restore"`, `restoredFrom: n`, `boardSeq: s`, `requestId`) unless it already exists. |
| 5 | — | Delete all `boardObjects` of the board; insert the snapshot objects with `updatedSeq = s`. |
| 6 | **Complete:** set `seq = s`, `contentBytes = 0`, unset `pendingOp` (one atomic, journaled update). | **Complete:** set `seq = s`, `contentBytes` = M3 of the snapshot, unset `pendingOp` (one atomic, journaled update); apply retention. |
| 7 | Acknowledge the submitter `{ok: true, seq: s}`; broadcast `op:applied` (type `board:clear`). | Broadcast `board:state` and `version:restored`; respond `201 {newVersion: r, restoredFrom: n, seq: s}`. |

**Failure handling and recovery (D5c):**

| Failure point | State left behind | What happens |
|---|---|---|
| Before step 3, or the commit write itself fails (including a failed before-clear version, a missing snapshot or a refused size check) | Board unchanged; at most an extra "before clear" version identical to the current content | Request rejected (`INTERNAL` or `VERSION_NOT_FOUND`); the extra version is harmless (its `boardSeq` equals `seq`, so the no-change rule is unaffected). |
| After step 3, before step 6 (server crash) | `pendingOp` present; objects partly or fully deleted (clear) or partly replaced (restore); version *r* may or may not exist | Start-up recovery completes the operation from `pendingOp`, repeating steps 4–6. Every step is idempotent: deleting already-deleted objects changes nothing; version *r* is inserted only if missing; the object set is replaced as a whole. |
| After step 6, before or during step 7 (crash, or the acknowledgement or HTTP response is lost) | Operation complete; `pendingOp` absent | Nothing is repeated. Clients resynchronise from the full state (FR-025) and see the result; the Owner's restore retry with the same key returns the recorded result. |
| During start-up recovery (crash or database error) | `pendingOp` still present | A crash: recovery runs again on the next start-up with the same result, because steps 4–6 are idempotent. A database error: retried up to 3 times; then `recovery.required` is logged with the board ID and the server exits with a non-zero status without accepting any connection, so no client ever sees a half-completed board; recovery is repeated at the next start. |
| A database error (not a crash) during steps 4–6 | `pendingOp` present | The task retries the remaining steps up to 3 times; if they still fail, the server logs `recovery.required`, stops accepting new tasks for that board (operations are rejected with `INTERNAL`) and completes the operation at the next start-up. It never reports success. |

**Start-up recovery order (for every board, before the server accepts any connection or request):**

1. *Complete journalled operations:* if `pendingOp` is set, repeat steps 4–6 of its type (for a restore, re-create version *r* from snapshot `restoredFrom` if missing). The snapshot is still available because retention never deletes a version referenced by `pendingOp`. Log `board.clear_rolled_forward` or `version.restore_rolled_forward`.
2. *Sequence recovery:* set `boards.seq` to the maximum of `boards.seq` and the largest `updatedSeq` in `boardObjects` (covers a crash between the two writes of an ordinary operation, §4.1.2). Step 1 runs first so that objects written by an unfinished restore cannot raise `seq` past an incomplete operation.
3. *Content size:* recompute `contentBytes` (M3) from `boardObjects`.

**Duplicate requests and client view.**

- *Distinct restores:* every restore request carries an `Idempotency-Key` (a new UUID per user action, API-03). A request with a new key is a distinct restore and always creates a new version, even if the same version was restored before.
- *Retries:* a retry with the same key and the same version *n* returns the recorded result (same `newVersion`, `restoredFrom` and `seq`) and applies nothing again. Because tasks of a board run in FIFO order, a retry that arrives while the original is still queued or running is processed after it and therefore sees its result. A failure before the commit point writes no `requestId`, so a later retry with that key performs the restore normally.
- *Key reuse:* the same key with a different version number is rejected with `409 IDEMPOTENCY_KEY_REUSED`; nothing changes.
- *Concurrency:* concurrent restores (and clears) of one board are serialised by the board queue; each distinct request gets its own version number and sequence number in queue order.
- *Limit:* the key is remembered through the `requestId` of version *r*; once retention (FR-035) has removed version *r*, the key is no longer recognised. Clients retry only immediately after a failed or interrupted request, so this does not arise in normal use.
- *Clear:* a clear has no idempotency key. A clear repeated after it was applied finds an empty board and is a no-op; the client never resubmits a clear automatically (pending operations are discarded after resynchronisation, §4.1.4), so a second clear always needs a new Owner confirmation.
- *Client view:* a client whose request was interrupted receives no success; after reconnection it shows the server state, and the Owner's client retries an interrupted restore once with the same key to learn the outcome.

Logged events (§4.4): `op.clear_failed`, `version.restore_failed`, `board.clear_rolled_forward`,
`version.restore_rolled_forward`, `recovery.required`.

These mechanisms are a design specification; they are verified by TC-024 (restore) and
TC-025 (clear). Historical v1.0 note: when this was written the system did not exist and neither
test had been executed; both were executed with status Pass on 12-10-2026 (STP Appendix A,
`docs/IMPLEMENTATION_STATUS.md`).

**Size measures (used consistently in SRS FR-008, SEC-REQ-005 and STP TC-022, TC-107):**

| Measure | Definition | Limit | Enforced by |
|---|---|---|---|
| M1 — message size | Bytes of one Socket.IO packet as received by the server (event name, acknowledgement id, framing and JSON payload) | 64 KiB = 65,536 bytes (`maxHttpBufferSize`) | Socket.IO engine before any handler runs (SEC-REQ-005) |
| M2 — object size | `BSON.calculateObjectSize(object)` of one board object in snapshot form (`id`, `kind`, geometry, `color`, `strokeWidth`, `text`) | none on its own; bounded in practice by M1 | Computed by COMP-06 for every add/update |
| M3 — content size | Sum over all objects of (M2 + 9 bytes); the 9 bytes cover the array element header (type byte, index key of up to 7 digits, terminator) and over-estimate it for indices below 10^6 | 15 MiB = 15,728,640 bytes (FR-008) | COMP-06, before any write (`BOARD_FULL`) |
| M4 — version document size | `BSON.calculateObjectSize` of the complete `versions` document (metadata + `objects[]`) | MongoDB maximum 16 MiB = 16,777,216 bytes; defensive refusal above 16 MiB − 64 KiB = 16,711,680 bytes | COMP-07, before inserting a version |

M1 and M3 are independent: a single message can never exceed 65,536 bytes, while M3 accumulates over
many operations. JSON (M1) and BSON (M2) sizes of the same object differ — BSON stores each
coordinate as an 8-byte double with a per-element header — therefore neither size is inferred from
a point count; TC-022 measures both.

*Bound of M4 (derivation):* a version document consists of the document header and terminator
(5 bytes); the metadata fields `_id` (ObjectId, 17 bytes), `boardId` (ObjectId, 21), `number`
(int32, 12), `boardSeq` (int64, 18), `trigger` (string of at most 16 characters, ≤ 30),
`restoredFrom` (int32 or null, ≤ 18), `createdAt` (date, 19), `createdBy` (ObjectId or guest ID of
at most 64 characters, ≤ 80) and `requestId` (UUID string or null, ≤ 52) — at most 267 bytes; the
`objects` field header (9 bytes) and the array's own header and terminator (5 bytes); and the
elements. The elements occupy at most M3 bytes because M3 counts every element header with 9
bytes, the maximum for indices below 10^7 (a 15 MiB board cannot hold that many objects: the
smallest object is larger than 30 bytes). Hence **M4 ≤ M3 + 286 bytes ≤ 15,728,926 bytes**, which
is 982,754 bytes below the defensive threshold and 1,048,290 bytes below MongoDB's limit. COMP-06
therefore rejects every operation that would break the bound before anything is stored,
acknowledged or broadcast, and COMP-07 additionally measures M4 before every insert. The
derivation assumes that versions store objects in snapshot form only and that the schema enforces
the metadata bounds above; `tools/size_model.py` reproduces this calculation with a BSON encoder
(a design calculation, not a measurement of the application), and TC-022 measures the real system.

**Snapshot size (version 1.0 vs. future):**

| Aspect | Version 1.0 (specified) | Future option (not in v1.0) |
|---|---|---|
| Maximum board content | M3 ≤ 15 MiB (15,728,640 bytes), enforced by COMP-06 on every add/update before anything is written (`BOARD_FULL`, FR-008, D11c). `contentBytes` increases on add, changes by the size difference on update, decreases on delete and clear, and is recomputed from `boardObjects` at start-up. | Higher limit with chunked storage |
| Snapshot storage | One MongoDB document per version; M4 ≤ M3 + 286 bytes (derivation above) | Chunked snapshots (e.g. GridFS) |
| Snapshot larger than allowed | Prevented by the M3 limit. Defensive check: above 16,711,680 bytes the version is not written and `version.snapshot_too_large` is logged; for a periodic or last-participant trigger the Owner gets an error notice and the live board continues unchanged; for a before-clear trigger the clear is rejected; for a restore the restore is rejected | — |
| Reference size | TB-STD is estimated at about 2 MiB BSON (300 strokes × 200 points; see `tools/size_model.py` for the calculated value) | — |

### 3.7 Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Single server instance is a single point of failure | Board unavailable during outages | Persistence before broadcast (FR-027); automatic client reconnection (FR-025); scaling with a Socket.IO adapter recorded as future work (§4.6). |
| Snapshot exceeds MongoDB 16 MiB document limit | Version creation would fail | Prevented in v1.0 by the 15 MiB board content limit (FR-008) and a defensive size check before writing; `snapshot_bytes` metric; chunked storage is future work (§4.6). |
| LWW overwrites a concurrent change to the same object | User's edit silently replaced | Documented limitation (SRS §4.2); updates carry complete property values so every client converges; candidate future CRDT. |
| Performance targets prove infeasible when measured | NFRs fail | Latency harness (TC-019) built in the first implementation sprint; if a target cannot be met, a change request updates NFR-001 to NFR-005. |
| Leaked share link | Unauthorised access | Expiry, revocation with forced disconnect, hashed storage, Owner-visible link list (§3.9). |
| Team unfamiliar with canvas rendering or Socket.IO | Schedule slip | Spike prototypes before implementation; pair work on COMP-02/COMP-06. |
| Clock differences distort latency measurement | Misleading NFR-001 results | Measure with all clients in one process or one machine (SRS §5 test conditions). |
