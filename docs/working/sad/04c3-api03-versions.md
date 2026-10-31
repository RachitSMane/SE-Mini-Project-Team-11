<!-- Owner: Rachit | Reviewers: Krishna | Status: v1.0 -->

#### API-03 — Version history (REST, COMP-03/07)

Realises FR-030–FR-035, FR-051, NFR-005. Base path `/api/v1`; bearer token required (session or
guest token for the same board).

| Method and path | Role | Request | Success response | Errors |
|---|---|---|---|---|
| `GET /boards/{boardId}/versions` | Viewer | query `limit` (1–50, default 20), `before` (version number, for paging) | `200 [{number, trigger, restoredFrom, createdAt, createdBy}]`, newest first | 401, 403, 404 |
| `GET /boards/{boardId}/versions/{number}` | Viewer | — | `200 {number, trigger, createdAt, objects: [...]}` (read-only preview, FR-032) | 401, 403, 404 `VERSION_NOT_FOUND` (never existed or removed by retention, FR-035) |
| `POST /boards/{boardId}/versions/{number}/restore` | Owner | header `Idempotency-Key: <UUID>` (required, one per user action) | `201 {newVersion, restoredFrom, seq}`; creates a new version, even if the content equals the current board; COMP-06 then emits `board:state` and `version:restored` to the room (SD-02). A retry with the same key and version returns the recorded `201` body (same `newVersion`, `restoredFrom`, `seq`) without restoring again or creating another version; a new key is a new restore | 400 (missing or malformed key), 401, 403, 404 `BOARD_NOT_FOUND`/`VERSION_NOT_FOUND`, 409 `IDEMPOTENCY_KEY_REUSED` (key already used for a different version), 500 `INTERNAL` (no success: before the commit point nothing changed; after it the restore is completed by recovery, and a retry with the same key reports the outcome) |

`trigger` ∈ `periodic`, `before_clear`, `last_left`, `restore`. Automatic versions follow the
no-change rule of SRS §4.3 (D5b). Versions are created only by the server (FR-030); there is no
endpoint to create, edit or delete a version directly, which protects history integrity
(SEC-OBJ-002).

Restore semantics (journal, commit point, recovery, serialisation and the key-retention limit) are
specified in SAD §3.6.

**Example.**
```
POST /api/v1/boards/b1/versions/12/restore
Authorization: Bearer <session token>
Idempotency-Key: 6f1c2a9e-3b7d-4e21-9a55-0c8d4f2b7e10

201 Created
{"newVersion":19,"restoredFrom":12,"seq":88}

Retry of the same request with the same key (recorded result; nothing restored again):
201 Created
{"newVersion":19,"restoredFrom":12,"seq":88}

Same key reused for a different version:
POST /api/v1/boards/b1/versions/15/restore
Authorization: Bearer <session token>
Idempotency-Key: 6f1c2a9e-3b7d-4e21-9a55-0c8d4f2b7e10

409 Conflict
{"error":{"code":"IDEMPOTENCY_KEY_REUSED",
          "message":"This Idempotency-Key was already used to restore version 12",
          "requestId":"<id>"}}
```
