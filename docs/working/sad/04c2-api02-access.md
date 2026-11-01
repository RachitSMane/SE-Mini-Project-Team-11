<!-- Owner: Prithvi | Reviewers: Krishna | Status: v1.0 -->

#### API-02 — Accounts, boards, share links, members and ownership (REST, COMP-03/04/05)

Realises FR-040–FR-051, SEC-REQ-001, SEC-REQ-002, SEC-REQ-003, SEC-REQ-004, SEC-REQ-005,
SEC-REQ-006, SEC-REQ-008. Base path `/api/v1`. Authenticated endpoints require
`Authorization: Bearer <token>`. "Role" is the minimum board role required (checked by COMP-05).
**403 vs 404 rule:** a requester with no role on the board receives `404 BOARD_NOT_FOUND` (the
board's existence is not revealed); a requester with a role that is too low receives
`403 FORBIDDEN`.

| Method and path | Auth / role | Request body | Success response | Errors |
|---|---|---|---|---|
| `POST /auth/register` | none | `{email, password, displayName}` | `201 {userId}` | 400 `VALIDATION_FAILED`, 409 `EMAIL_TAKEN` |
| `POST /auth/login` | none | `{email, password}` | `200 {token, expiresAt, user: {id, displayName}}` | 401 `UNAUTHENTICATED`, 429 `RATE_LIMITED` |
| `POST /auth/logout` | registered user | — | `204` | 401 |
| `GET /boards` | registered user | — | `200 [{id, title, role, updatedAt}]` | 401 |
| `POST /boards` | registered user | `{title}` | `201 {id, title, role: "owner"}` | 400, 401 |
| `GET /boards/{boardId}` | Viewer | — | `200 {id, title, ownerId, role, updatedAt}` | 401, 403, 404 |
| `DELETE /boards/{boardId}` | Owner | — | `204` | 401, 403, 404 |
| `POST /boards/{boardId}/links` | Owner | `{role: "viewer" \| "editor", expiresIn: "1h" \| "24h" \| "7d"}` | `201 {linkId, url, role, expiresAt}` (`url` contains the token; shown once) | 400, 401, 403, 404 |
| `GET /boards/{boardId}/links` | Owner | — | `200 [{linkId, role, expiresAt, createdAt}]` (no tokens) | 401, 403, 404 |
| `DELETE /boards/{boardId}/links/{linkId}` | Owner | — | `204` (revokes; COMP-06 disconnects affected guests) | 401, 403, 404 |
| `POST /links/resolve` | link token in body; bearer session token optional | `{token, displayName?}` (`displayName` required when no session token is sent) | With a valid session token: `200 {boardId, role}` and membership created or kept (FR-046); without: `200 {boardId, role, guestToken, expiresAt}` | 400, 404 `LINK_NOT_FOUND`, 410 `LINK_EXPIRED`/`LINK_REVOKED`, 429 |
| `GET /boards/{boardId}/members` | Viewer | — | `200 [{userId, displayName, role}]` | 401, 403, 404 |
| `PATCH /boards/{boardId}/members/{userId}` | Owner | `{role: "viewer" \| "editor"}` | `200 {userId, role}` | 400, 401, 403, 404 |
| `DELETE /boards/{boardId}/members/{userId}` | Owner | — | `204` | 401, 403, 404 |
| `POST /boards/{boardId}/transfer-ownership` | Owner (session token) | `{newOwnerId, confirm: true}` | `200 {boardId, ownerId, previousOwner: {userId, role: "editor"}}` | 400 `VALIDATION_FAILED`/`INVALID_TARGET`, 401, 403, 404 (details below) |
| `GET /health` | none | — | `200 {status: "ok", db: "up"}` | 503 if the database is down |

**Example.**
```
POST /api/v1/boards/b1/links
Authorization: Bearer <session token>
{"role":"editor","expiresIn":"24h"}

201 Created
{"linkId":"l3","url":"https://<host>/join#<token>","role":"editor",
 "expiresAt":"2026-10-11T18:30:00Z"}
```

##### Transfer ownership — `POST /api/v1/boards/{boardId}/transfer-ownership`

Realises FR-050 (with FR-051, SEC-REQ-003, SEC-REQ-008). Flow: SD-04. Tests: TC-018, TC-102.

| Aspect | Specification |
|---|---|
| Authentication | Bearer **session** token of a registered user. A guest token is rejected with `403 FORBIDDEN` (guests can never hold the Owner role). Missing, invalid or expired token → `401 UNAUTHENTICATED`. |
| Authorisation | The requester must be the board's current Owner (`boards.ownerId`). Editor or Viewer → `403 FORBIDDEN`; no role on the board → `404 BOARD_NOT_FOUND`. |
| Request body | `{"newOwnerId": "<userId>", "confirm": true}`. Unknown fields are rejected. |
| Safeguards | The client shows a confirmation dialog naming the new Owner and the loss of Owner rights; the API additionally requires `confirm: true` (missing or not `true` → `400 VALIDATION_FAILED`). The update is conditional on the requester still being the Owner, so two concurrent transfers cannot both succeed (the second receives `403`). |
| Target validation | `newOwnerId` must identify a registered user who currently has an Editor or Viewer membership on this board. Self, unknown user IDs, non-members and guest IDs → `400 INVALID_TARGET`. |
| Effect (in this order) | 1. Board queue paused. 2. Upsert membership of the requester with role `editor`. 3. Conditional update `boards.ownerId: requester → newOwnerId`. 4. Delete the new Owner's membership row (the Owner is stored on the board only). 5. Queue resumed. A crash after step 2 leaves the requester as Owner (the Owner check precedes membership lookup); a crash after step 3 leaves a redundant membership row for the new Owner that is ignored and removed on the next membership change. |
| Success response | `200 {"boardId": "b1", "ownerId": "<newOwnerId>", "previousOwner": {"userId": "<requesterId>", "role": "editor"}}` |
| Notifications | COMP-06 sends `role:changed {role: "owner"}` to the new Owner's sockets and `role:changed {role: "editor"}` to the former Owner's sockets, then `presence:update` to the room. Both dashboards show the new roles on next load. |
| Logging | Security event `board.ownership_transferred` (§4.4): `actorId` = former Owner, `subjectId` = new Owner, `boardId`, time, request ID, `outcome` (SEC-REQ-008). |
| Errors | `400 VALIDATION_FAILED` (body invalid or `confirm` missing), `400 INVALID_TARGET`, `401 UNAUTHENTICATED`, `403 FORBIDDEN` (not Owner, or guest token), `404 BOARD_NOT_FOUND` (board missing or requester has no role), `500 INTERNAL`. |

```
POST /api/v1/boards/b1/transfer-ownership
Authorization: Bearer <session token>
{"newOwnerId":"u9","confirm":true}

200 OK
{"boardId":"b1","ownerId":"u9","previousOwner":{"userId":"u7","role":"editor"}}
```
