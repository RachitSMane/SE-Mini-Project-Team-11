<!-- Owner: Prithvi | Reviewers: Krishna, Pranav | Status: v1.0 -->

### 3.9 Security Architecture

All controls below were specified as design decisions (D13) before any of them was implemented (historical v1.0 note). They are now implemented; a control counts as verified only through its security test cases: TC-101 to TC-108 Pass, TC-109 Blocked (no HTTPS deployment), so the transport controls of SEC-REQ-007 are unverified (execution of 12-10-2026, `docs/IMPLEMENTATION_STATUS.md`).

#### 3.9.1 Trust boundaries

1. **Browser ↔ server:** everything arriving from a browser (REST bodies, Socket.IO payloads, tokens) is untrusted. All checks happen on the server; client-side role checks are only for convenience.
2. **Server ↔ database:** only COMP-08 talks to MongoDB, through Mongoose models with schema-typed query values (no string-built queries); board-object adds and updates use the model's native collection with values already validated by the operation schemas (SEC-REQ-005) and the board ID converted to an ObjectId, which avoids re-casting large point arrays; the database listens only on the server host.

#### 3.9.2 Authentication (same tokens for REST and Socket.IO)

- **Registered users:** `POST /api/v1/auth/login` verifies the bcrypt hash (cost factor 12, D13a) and returns a signed JWT (HS256; secret from an environment variable, never committed) with claims `sub` (user ID), `jti` (token ID), `typ: "session"` and `exp` = issue time + 24 hours (D8c). Logout stores the `jti` in `revokedTokens` until expiry (SEC-REQ-002).
- **Guests:** `POST /api/v1/links/resolve` validates a share-link token and returns a guest JWT with claims `guestId`, `boardId`, `linkId`, `role`, `typ: "guest"` and `exp` = min(link expiry, issue time + 24 hours). A guest token is accepted only for its own board; it is kept in the browser's `sessionStorage`, so it ends with the browser session (FR-046). When a guest token expires while the link is still valid, the client returns the guest to the guest entry page, where the link can be resolved again for a new token.
- **Transport of tokens:** always in the `Authorization: Bearer` header (REST) or the Socket.IO handshake `auth` field — never in cookies or URLs. Because no cookie carries authority, cross-site request forgery does not apply; CORS on Express and Socket.IO allows only the configured client origin.
- **Verification:** COMP-04 `verifyToken` checks signature, `exp`, `typ` and (for sessions) the `jti` revocation list. COMP-03 calls it for every protected route; COMP-06 calls it in connection middleware before a socket can join a room, and re-checks expiry on every `op:submit` so an expired token cannot keep editing over an open socket. Failures → `401 UNAUTHENTICATED` / `connect_error` with code `UNAUTHENTICATED`.

#### 3.9.3 Authorisation (same policy for REST and Socket.IO)

- COMP-05 provides one function `authorize(actor, boardId, action)` implementing the FR-051 matrix. The role is always loaded from server data: `boards.ownerId`, `memberships`, or — for a guest — the `shareLinks` entry of the token's `linkId`, re-checked for expiry and revocation. A role or board ID inside a request payload is never trusted (SEC-REQ-003). Besides the FR-051 actions, the policy has an Owner-only `rename` action for the board-rename endpoint (issue #13; outside the SRS baseline, SRS §2.7).
- Every REST route and every Socket.IO event handler calls `authorize` before reading or changing board data. A requester with no role on the board receives `BOARD_NOT_FOUND` (existence not revealed); a requester whose role is too low receives `FORBIDDEN`. Rejected attempts change nothing, are not broadcast and are logged as `authz.denied` (SEC-REQ-008).
- Role changes, member removal, ownership transfer, link revocation or expiry and board deletion are pushed to COMP-06, which updates the cached role of affected sockets immediately and disconnects sockets that lost access within 5 seconds (FR-047 to FR-050, D3a).

#### 3.9.4 Share-link security

- Token = 32 random bytes from Node.js `crypto.randomBytes` (256 bits; meets SEC-REQ-004's 128-bit minimum), encoded base64url (43 characters, D8e). Link URL: `https://<host>/join#<token>` — the token is in the URL fragment, so browsers do not send it in HTTP request lines and it does not appear in server access logs; the client posts it to `/links/resolve`.
- Only `SHA-256(token)` is stored in `shareLinks.tokenHash`; the plain token is shown to the Owner once at creation.
- Expiry (`expiresAt`) and revocation (`revokedAt`) are checked on resolve and every time a guest's role is evaluated. A COMP-06 timer (every 1 s) disconnects guest sockets whose link has expired, which keeps disconnection within the 5 s of FR-048.

#### 3.9.5 Threat model (STRIDE)

| STRIDE category | Threat to this system | Affected components | Mitigation | Requirement / test |
|---|---|---|---|---|
| Spoofing | Attacker reuses a stolen session token, guesses a share-link token, or brute-forces a password. | COMP-03, COMP-04, COMP-06 | 24-hour token expiry and logout revocation; guest tokens bound to one board; 256-bit link tokens; login rate limit; TLS in deployment. | SEC-REQ-002, SEC-REQ-004, SEC-REQ-006, SEC-REQ-007; TC-104, TC-106, TC-108, TC-109 |
| Tampering | Viewer or guest sends crafted `op:submit` events or changes `boardId`/`role` fields in payloads; malformed objects corrupt board state. | COMP-05, COMP-06 | `authorize` on every event using server-held roles; schema validation and 65,536-byte message limit; whole-object validation before applying. | SEC-REQ-003, SEC-REQ-005; TC-101, TC-107 |
| Repudiation | A user denies having restored a version, revoked a link, transferred ownership or deleted a board. | COMP-09, COMP-05, COMP-07 | Security event log (§4.4) with event type, UTC time, request ID, actor (`null` before identification), board (`null` if none) and reason code; `createdBy` on versions and links. | SEC-REQ-008; TC-104 |
| Information disclosure | Leaked share link; non-member reads a board by guessing its ID (IDOR); tokens or passwords in logs; user text rendered as HTML (XSS) steals tokens. | COMP-01, COMP-03, COMP-05, COMP-09 | Link expiry and revocation; `authorize` on every read with 404 for non-members; token in URL fragment and hashed at rest; log redaction; text rendered as plain text only. | SEC-REQ-003, SEC-REQ-004, SEC-REQ-005, SEC-REQ-008; TC-102, TC-103, TC-104, TC-107 |
| Denial of service | One client floods operations or sends oversized payloads; a board grows without bound; brute-force login. | COMP-03, COMP-06, COMP-08 | 30 operations/s per connection; 64 KiB (65,536-byte) message limit (`maxHttpBufferSize`, measure M1); 15 MiB board content limit; login rate limit; capacity verified by TC-019 (Pass on 12-10-2026: 10 clients, p95 80 ms, 0 rejected). | SEC-REQ-005, SEC-REQ-006, FR-008, NFR-002; TC-107, TC-108, TC-022, TC-019 |
| Elevation of privilege | Editor attempts Owner actions (clear, restore, manage links, transfer ownership); guest calls Owner endpoints; removed member keeps an open socket. | COMP-03, COMP-05, COMP-06 | Permission matrix in one place (COMP-05); Owner actions checked on the server; guest tokens can never act as Owner; role cache updated and socket disconnected on removal or revocation. | FR-051, SEC-REQ-003, FR-047, FR-049, FR-050; TC-101, TC-102, TC-103, TC-018, TC-023 |

#### 3.9.6 Security control mapping

| Security requirement | Design control(s) | Component(s) | Validating test(s) |
|---|---|---|---|
| SEC-REQ-001 | Length check 8–72 in schema; bcrypt (cost 12) with per-password salt; password fields redacted from logs | COMP-03, COMP-04, COMP-08, COMP-09 | TC-105 |
| SEC-REQ-002 | JWT session tokens (24 h, `jti` revocation on logout); board-bound guest tokens (min(link expiry, 24 h)); verification on every route, socket connection and operation | COMP-03, COMP-04, COMP-06 | TC-106 |
| SEC-REQ-003 | Single `authorize` policy with server-held roles; 404/403 rule; no trust in payload roles or board IDs | COMP-03, COMP-05, COMP-06 | TC-101, TC-102 |
| SEC-REQ-004 | 256-bit CSPRNG tokens; SHA-256 hash at rest; token only in URL fragment; expiry and revocation checks; 1 s expiry timer | COMP-05, COMP-06, COMP-08 | TC-103, TC-104 |
| SEC-REQ-005 | JSON-schema validation of every REST body and Socket.IO payload; 65,536-byte `maxHttpBufferSize` (M1); text rendered with React text nodes only (no `dangerouslySetInnerHTML`) | COMP-01, COMP-03, COMP-06 | TC-107 |
| SEC-REQ-006 | Login limiter (5 failures / entered e-mail address / 15 min, registered or not, keyed by an HMAC of the address; identical status, code and message either way, §4.4); token-bucket limiter (30 ops/s / connection) | COMP-03, COMP-06 | TC-108 |
| SEC-REQ-007 | TLS 1.2+ at the deployment's HTTPS endpoint; HTTP→HTTPS redirect; `wss://` for Socket.IO | COMP-03, COMP-06 (deployment configuration) | TC-109 |
| SEC-REQ-008 | Security event record (§4.4) created by the detecting component (COMP-03 to COMP-07) and written by COMP-09 with a field allow-list: event, timestamp, request ID, actor or `null`, board or `null`, affected account (`subjectId`) or `null`, outcome and reason; passwords, tokens, `Authorization` headers, entered e-mail addresses and board content are never written | COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-09 | TC-104 |

**Deployment assumptions for SEC-REQ-007 (as implemented in `server/src/config.js`, `rest/app.js` and
`server.js`).** TLS ends at a reverse proxy in front of the server; the server itself speaks plain HTTP.
`FORCE_HTTPS=true` enables the controls below and is accepted only together with `TRUST_PROXY=true`
and an `https://` `PUBLIC_URL`, otherwise the server refuses to start (without trusted
`X-Forwarded-Proto` every request would look like HTTP and be redirected in a loop). `TRUST_PROXY`
trusts exactly one proxy hop. With `FORCE_HTTPS`: a plain-HTTP request receives a 308 redirect to the
origin of `PUBLIC_URL` (never to the client-supplied `Host` header); every response of the Express application (REST API and built client) carries
`Strict-Transport-Security: max-age=31536000`; a Socket.IO connection is refused unless the proxy reports
HTTPS; and the built client's Content-Security-Policy allows `connect-src 'self' wss:` only (without
`FORCE_HTTPS`, local development, also `ws:`). The proxy must therefore *set* (overwrite, not append)
`X-Forwarded-Proto`, forward WebSocket upgrades, and offer TLS 1.2 or later; the server must listen only
on the loopback interface (`HOST=127.0.0.1`, the default) or a private network, because a client that
reaches it directly could claim `X-Forwarded-Proto: https`. These proxy and network settings are
deployment configuration and are verified only by TC-109.

#### 3.9.7 Secrets handling

The JWT signing secret and database connection string are read from environment variables
(`.env` locally, excluded from Git). No secret, password or token appears in the repository, in
documentation examples (placeholders such as `<token>` are used) or in logs. Test builds use a
separate test secret (`.env.test`, also excluded from Git).
