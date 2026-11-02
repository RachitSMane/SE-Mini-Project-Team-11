<!-- Owner: Krishna | Reviewers: Rachit, Prithvi | Status: v1.0 -->

### 4.3 API Design

Three interfaces are specified (the template requires at least two components): API-01 for the
Real-time Collaboration Server (COMP-06), API-02 for accounts, boards, links, members and
ownership transfer (COMP-03/04/05) and API-03 for version history (COMP-03/07). REST and
Socket.IO use the same tokens (SAD §3.9.2) and the same `authorize` policy (§3.9.3). All payloads are JSON. Placeholders
such as `<token>` stand for real values and are never real secrets.

**Common error object** (REST bodies and Socket.IO acknowledgements):
`{"error": {"code": "<CODE>", "message": "<human-readable text>", "requestId": "<id>"}}`

| Code | HTTP status (REST) | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Payload does not match the schema or exceeds limits, or a required confirmation is missing (SEC-REQ-005) |
| `INVALID_TARGET` | 400 | Ownership-transfer target is not an eligible registered member (FR-050) |
| `UNAUTHENTICATED` | 401 | Missing, invalid, expired or revoked token (SEC-REQ-002) |
| `FORBIDDEN` | 403 | Role does not permit the action (FR-051, SEC-REQ-003) |
| `BOARD_NOT_FOUND`, `VERSION_NOT_FOUND`, `LINK_NOT_FOUND`, `OBJECT_NOT_FOUND` | 404 | Target does not exist (also used when the requester may not know it exists) |
| `EMAIL_TAKEN` | 409 | Registration with an existing e-mail (FR-040) |
| `BOARD_FULL` | — (Socket.IO only) | Operation would exceed the 15 MiB BSON board content limit (FR-008); rejected before anything is stored |
| `IDEMPOTENCY_KEY_REUSED` | 409 | A restore `Idempotency-Key` was reused for a different version (API-03) |
| `LINK_EXPIRED`, `LINK_REVOKED` | 410 | Share link no longer valid (FR-047, FR-048) |
| `RATE_LIMITED` | 429 | Rate limit exceeded (SEC-REQ-006) |
| `INTERNAL` | 500 | Unexpected server error; details only in server log |

#### API-01 — Real-time board events (Socket.IO, COMP-06)

Realises FR-001–FR-008 (operations), FR-020–FR-026, FR-034, FR-047–FR-050, FR-052,
SEC-REQ-002, SEC-REQ-003, SEC-REQ-005, SEC-REQ-006.

**Connection.** Namespace `/board`. Handshake: `io("/board", { auth: { token: "<session or guest token>" } })`.
Invalid token → `connect_error` with `data.code = "UNAUTHENTICATED"`. Maximum message size 65,536 bytes per packet (measure M1, SAD §3.6).

**Client → server events** (every event uses a Socket.IO acknowledgement callback):

| Event | Payload | Acknowledgement (success) | Errors |
|---|---|---|---|
| `board:join` | `{boardId}` | `{ok: true, role, state: {seq, objects: [...]}, participants: [{id, displayName, role, guest}]}` | `FORBIDDEN`, `BOARD_NOT_FOUND`, `LINK_EXPIRED`, `LINK_REVOKED` |
| `board:leave` | `{boardId}` | `{ok: true}` | — |
| `op:submit` | `{boardId, clientOpId, type, payload}` with `type` ∈ `object:add` (payload = full object), `object:update` (`{id, ...changedProperties}` with complete new values), `object:delete` (`{id}`), `board:clear` (`{}`, Owner only) | `{ok: true, clientOpId, seq}`; for `board:clear` on an empty board `{ok: true, clientOpId, seq: null, noop: true}` | `{ok: false, clientOpId, error}` with `VALIDATION_FAILED`, `FORBIDDEN`, `OBJECT_NOT_FOUND`, `BOARD_FULL`, `RATE_LIMITED`, `INTERNAL` |

**Server → client events:**

| Event | Payload | When |
|---|---|---|
| `op:applied` | `{boardId, seq, clientOpId, actor: {id, displayName}, type, payload}` | After every accepted operation, to all sockets in the room except the submitter (who receives the acknowledgement) |
| `board:state` | `{boardId, seq, objects: [...]}` | After a restore, to every socket in the room (FR-034); the client replaces `confirmed` and `lastSeq` and keeps its pending operations. Gap repair uses the `board:join` acknowledgement instead (§4.1.3) |
| `version:restored` | `{boardId, restoredFrom, newVersion, actor}` | After a restore, for the version panel and notification |
| `version:created` | `{boardId, number, trigger, createdAt}` | After any new version (version panel refresh) |
| `presence:update` | `{boardId, participants: [{id, displayName, role, guest}]}` | On join, leave, disconnect, role change |
| `role:changed` | `{boardId, role}` | When the Owner changes this member's role (FR-049), and to both users after an ownership transfer (FR-050); the client updates its enabled tools immediately |
| `access:revoked` | `{boardId, reason}` with `reason` ∈ `LINK_REVOKED`, `LINK_EXPIRED`, `MEMBER_REMOVED`, `BOARD_DELETED` | Immediately before the server disconnects the socket (FR-044, FR-047–FR-049) |
| `board:renamed` | `{boardId, title}` | After the Owner renames the board through `PATCH /boards/{boardId}` (API-02; added 02-11-2026, issue #13); the board page updates its title without a reload |
| `notice` | `{boardId, code: "VERSION_NOT_SAVED", message}` | To the Owner's sockets when an automatic version could not be stored because its snapshot is too large (defensive check, §3.6). **Known gap (02-11-2026):** the client sync module does not subscribe to this event, so the notice is currently not shown |

**Example.** Each line shows the direction and event name, followed by the complete JSON payload of that message.
```
client → op:submit {"boardId":"b1","clientOpId":"c1","type":"object:add",
                    "payload":{"id":"o1","kind":"rect","x":10,"y":20,"w":120,"h":60,
                               "color":"#1E88E5","strokeWidth":3}}
server → ack       {"ok":true,"clientOpId":"c1","seq":41}
server → room      op:applied {"boardId":"b1","seq":41,"clientOpId":"c1",
                    "actor":{"id":"u7","displayName":"Rachit"},
                    "type":"object:add",
                    "payload":{"id":"o1","kind":"rect","x":10,"y":20,"w":120,"h":60,
                               "color":"#1E88E5","strokeWidth":3}}
```

**Ordering and delivery guarantees** (details in §4.1.2–§4.1.4): the server processes operations
of one board strictly in queue order, persists each before acknowledging or broadcasting it, and
emits acknowledgements and `op:applied` events in sequence order. Clients apply events strictly
by `seq`, ignore duplicates, buffer out-of-order events and resynchronise with `board:join` when a
gap is not closed within 1 s or after reconnection.
