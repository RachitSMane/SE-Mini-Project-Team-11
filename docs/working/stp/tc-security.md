<!-- Owner: Prithvi | Reviewers: Pranav, Krishna | Status: v1.0 -->

### A.2 Security test cases

A security requirement counts as verified only when its test cases have been executed with status
Pass (RTM status P); documenting a test does not verify anything. Execution 12-10-2026: TC-101 to
TC-108 Pass; TC-109 Blocked (no deployment), so SEC-REQ-007 remains unverified.

#### TC-101 — Crafted real-time messages from unauthorised roles

| Field | Value |
|---|---|
| Requirements | FR-051, SEC-REQ-003 |
| Type / Priority | Security, integration (scripted Socket.IO clients), negative / High |
| Preconditions | Board B (Owner O) with Viewer member V and a Viewer guest G; board B2 owned by another user, on which V has no role; observer client C (Editor) joined to B. |
| Test data | From V and G: `object:add`, `object:update`, `object:delete`, `board:clear`; the same with an extra payload field `role: "owner"`; `op:submit` carrying B2's `boardId`; `board:join` for B2. At least 12 attempts. |
| Steps | 1. Send each crafted message from V's and G's connections.<br>2. Record every acknowledgement.<br>3. Inspect C's received events and the database contents of B and B2 after all attempts.<br>4. Inspect the security log. |
| Expected result | Every attempt is rejected (`FORBIDDEN` on B; `BOARD_NOT_FOUND` for B2); C receives no `op:applied` for any attempt; B and B2 unchanged; each attempt logged as `authz.denied`. |
| Pass/fail criteria | Pass only if 100% of attempts are rejected and nothing is stored or broadcast. |
| Dependencies / limitations | — |
| Actual result | server/tests/integration/access.test.js: 16 crafted messages from Viewer and guest (incl. role:'owner' payloads, foreign boardId, foreign board:join) all rejected; observer received no op:applied; boards unchanged; each logged authz.denied. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-102 — REST authorisation matrix and object references

| Field | Value |
|---|---|
| Requirements | FR-033, FR-044, FR-051, SEC-REQ-003 |
| Type / Priority | Security, integration (API), negative + control / High |
| Preconditions | Board B with Owner O, Editor E, Viewer V, guest G; registered user X with no role on B; board B3 where G has no access. |
| Test data | Owner-only endpoints: delete board, create/list/revoke links, change/remove member, transfer ownership, restore version. Viewer endpoints: get board, list members, list/preview versions. Every restore call carries a valid, new `Idempotency-Key`, so that a rejection reflects authorisation and not a missing header. |
| Steps | 1. Call every Owner-only endpoint as E, V and G.<br>2. Call every Owner-only and Viewer endpoint as X.<br>3. Call every Viewer endpoint for B3 with G's guest token.<br>4. Call each endpoint as the permitted role (control).<br>5. Inspect the database and version list after steps 1–3. |
| Expected result | Step 1: all `403 FORBIDDEN`. Steps 2–3: all `404 BOARD_NOT_FOUND` with no board data in the response (no-role rule, SAD §3.9.3). Step 4: all succeed. Step 5: no data changed and no version created by rejected calls. |
| Pass/fail criteria | Pass only if 100% of unauthorised calls are rejected as specified and every control call succeeds. |
| Dependencies / limitations | — |
| Actual result | access.test.js: Owner-only endpoints as Editor/Viewer/guest → 403; every endpoint as non-member → 404 with no board data; guest token on another board → 404; data and versions unchanged; controls succeed; 40 authz.denied entries. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-103 — Share-link revocation and expiry

| Field | Value |
|---|---|
| Requirements | FR-047, FR-048, SEC-REQ-004 |
| Type / Priority | Security + functional, system / High |
| Preconditions | Owner O on board B; Editor link L1 (7 days) and Viewer link L2 with expiry shortened to 60 s by `LINK_EXPIRY_OVERRIDE_SEC`; guest G1 joined via L1, guest G2 via L2; registered user R became a member via L1. |
| Test data | — |
| Steps | 1. O revokes L1; measure the time until G1 is disconnected.<br>2. Open L1 in a new browser.<br>3. Check R's access to B.<br>4. Wait until L2 expires; measure the time until G2 is disconnected.<br>5. Open L2 in a new browser.<br>6. G1's client retries the connection with its old guest token. |
| Expected result | G1 receives `access:revoked` and is disconnected within 5 s; L1 → "link revoked" (`410 LINK_REVOKED`); R still has access; G2 is disconnected within 5 s after expiry; L2 → "link expired" (`410 LINK_EXPIRED`); step 6: the reconnection is refused and `board:join` is rejected (no stale guest permission). |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Uses a test-build override for the 60 s expiry; production expiry options are 1 h, 24 h and 7 days. |
| Actual result | access.test.js: revoked link → guest disconnected < 5 s, 410 LINK_REVOKED, member keeps access, old guest token refused at the handshake; expiry with LINK_EXPIRY_OVERRIDE_SEC=3 → guest disconnected < 5 s with LINK_EXPIRED notice, 410 LINK_EXPIRED. E2E revocation notice in the browser. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-104 — Link token strength, storage and secret-free logs

| Field | Value |
|---|---|
| Requirements | SEC-REQ-004, SEC-REQ-008 |
| Type / Priority | Security, integration + inspection / High |
| Preconditions | No share links in the test database; log file `logs/server.log` cleared; the log schema of SAD §4.4 available to the scan script. |
| Test data | 1,000 generated links. |
| Steps | 1. Generate 1,000 links; check token length, alphabet and uniqueness.<br>2. Inspect `shareLinks` in the database.<br>3. Run TC-101 to TC-103 and TC-105 to TC-108; in addition, attempt one login with an unregistered e-mail and one with a registered e-mail and a wrong password, and as Owner change a member's role, transfer ownership, restore a version and delete a test board.<br>4. Parse every log line as JSON and check each security entry against the field rules of SAD §4.4.<br>5. Search the log for every generated password, session token, guest token, link token, the `Authorization` header values, the entered e-mail addresses and a known board text string. |
| Expected result | Tokens are ≥ 22 base64url characters (design: 43) and unique; the database holds only `tokenHash` values. The log contains at least one entry for each of `auth.login_failed`, `authz.denied`, `link.created`, `link.revoked`, `member.role_changed`, `board.ownership_transferred`, `version.restored` and `board.deleted`; every security entry has `event`, a UTC `timestamp`, a non-empty `requestId`, `outcome`, and `reason` (an error code for rejections, `null` for successes); both failed logins have `actorType: "anonymous"`, `actorId: null`, `boardId: null` and `reason: "UNAUTHENTICATED"`, with `subjectId` set to U's internal account ID only for the registered e-mail and `null` for the unregistered one; role-change and ownership events carry the affected member's account ID as `subjectId`; board events carry the board's ID and the acting user's or guest's ID. The search finds no password, token, `Authorization` value, entered e-mail address or board text. |
| Pass/fail criteria | Pass if all checks succeed. |
| Dependencies / limitations | Runs after the other security tests so that the log contains their events. |
| Actual result | access.test.js: 1,000 tokens of 43 base64url characters, unique, only SHA-256 hashes stored. server/tests/integration/securityLog.test.js (LOG_LEVEL=debug, separate run instead of after the other security tests): every listed event type present with the required fields; failed logins anonymous with subjectId only for the registered e-mail; no password, token, Authorization value, entered e-mail or board text in any log line. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-105 — Password policy and storage

| Field | Value |
|---|---|
| Requirements | SEC-REQ-001 |
| Type / Priority | Security, integration + inspection, boundary / High |
| Preconditions | Test database available. |
| Test data | Passwords of 7, 8, 72 and 73 characters, generated at run time. |
| Steps | 1. Register with each password length.<br>2. Register two accounts with the same password; inspect both user records.<br>3. Search the log for the passwords. |
| Expected result | 7 and 73 rejected; 8 and 72 accepted; records contain bcrypt hashes that differ for identical passwords (salts) and no plain text; passwords absent from logs. |
| Pass/fail criteria | Pass if all checks succeed. |
| Dependencies / limitations | — |
| Actual result | server/tests/integration/auth.test.js: 7 and 73 characters rejected, 8 and 72 accepted; bcrypt hashes differ for identical passwords; no plain text in records or logs. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-106 — Authentication tokens: missing, tampered, expired, logged out, wrong board

| Field | Value |
|---|---|
| Requirements | SEC-REQ-002 |
| Type / Priority | Security, integration (API + Socket.IO), negative / High |
| Preconditions | Registered user U with board B; guest token GT for board B; board B4 owned by U; test JWT secret available to sign expired tokens. |
| Test data | No token; session token with one changed signature character; expired session token; session token after logout; expired guest token; GT used for B4. |
| Steps | 1. Call `GET /boards` and `GET /boards/{B}` and connect to `/board` with each invalid session-token variant.<br>2. Log in, log out, then reuse the old token on both interfaces.<br>3. Use the expired guest token for `GET /boards/{B}` and `board:join`.<br>4. Use GT for `GET /boards/{B4}` and `board:join` on B4.<br>5. On an open socket whose token expires during the test, submit an operation after expiry.<br>6. Control: valid tokens. |
| Expected result | Steps 1–3: `401 UNAUTHENTICATED` / `connect_error` `UNAUTHENTICATED`; step 4: rejected (guest token not valid for B4) with no board data; step 5: operation rejected with `UNAUTHENTICATED`; step 6 succeeds. |
| Pass/fail criteria | Pass if every invalid variant is rejected on both interfaces and the controls succeed. |
| Dependencies / limitations | Uses the test JWT secret (`.env.test`) to create expired tokens. |
| Actual result | auth.test.js: missing, tampered, forged, expired, wrong-secret, alg none, logged-out tokens → 401 on REST and connect_error UNAUTHENTICATED; expired guest token rejected; guest token on another board → no data; open socket after logout/expiry cannot submit; controls succeed. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-107 — Input validation, XSS and oversized messages

| Field | Value |
|---|---|
| Requirements | SEC-REQ-005 |
| Type / Priority | Security, integration + browser, negative + boundary / High |
| Preconditions | Editor E connected to board B with a scripted client; observer O in a browser. |
| Test data | Missing `kind`; unknown `kind`; `color: "red"`; `strokeWidth` 0 and 21; text of 501 characters; non-numeric coordinates; unknown extra field; a message of 65,537 bytes (M1) and a valid message of at most 65,536 bytes as control; text object `<script>alert(1)</script><img src=x onerror=alert(2)>`. |
| Steps | 1. Send each invalid payload as E.<br>2. Send the 65,537-byte message, then the control message.<br>3. Add the markup text object through the normal UI.<br>4. Observe O's browser (dialogs, console). |
| Expected result | Step 1 and the 65,537-byte message rejected (`VALIDATION_FAILED`, or connection-level rejection by the message limit) with the board unchanged; the control message accepted; in step 3 the text is displayed literally and no dialog or script runs. |
| Pass/fail criteria | Pass if every invalid input is rejected and no script executes. |
| Dependencies / limitations | Tests the message limit (M1) only; the board content limit (M3) is tested in TC-022. |
| Actual result | sync.test.js: every invalid payload VALIDATION_FAILED with the board unchanged; 65,537-byte frame closes the connection, 65,536-byte frame delivered; e2e/whiteboard.spec.cjs (Playwright, Chromium 1280 × 720; also passed in Chrome and Edge): markup text drawn literally, no dialog, no img element. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-108 — Rate limiting

| Field | Value |
|---|---|
| Requirements | SEC-REQ-006 |
| Type / Priority | Security, integration, negative / Medium |
| Preconditions | Registered user U; board B with scripted Editor clients F (flooder) and N (normal). |
| Test data | — |
| Steps | 1. Attempt 6 failed logins for U within 15 minutes, then the correct password.<br>2. Attempt 6 failed logins for an unregistered e-mail address within 15 minutes; compare status codes and bodies with step 1, ignoring the per-request `requestId`.<br>3. F sends 100 operations within one second while N sends 2 per second.<br>4. Record F's and N's acknowledgements. |
| Expected result | The 6th failed attempt and the immediately following correct attempt return `RATE_LIMITED`; in step 2 attempts 1–5 return `401 UNAUTHENTICATED` with the same error code and message as for U and the 6th returns `429 RATE_LIMITED` with the same code and message as U's 6th attempt (only `requestId` differs), so the responses do not reveal whether the account exists; F's operations beyond 30 in that second are rejected with `RATE_LIMITED`; every operation of N is accepted. |
| Pass/fail criteria | Pass if all expected results hold. |
| Dependencies / limitations | Limits from D8b. Compares status, error code and message only; response timing of registered and unregistered addresses is not measured, so this test does not demonstrate timing equality. |
| Actual result | auth.test.js: 6th failed login and the following correct one RATE_LIMITED; identical status/code/message for the unregistered address; 100 operations in one second → exactly 30 accepted, 70 RATE_LIMITED, every operation of the other client accepted. Run 12-10-2026 on the uncommitted working tree of branch docs/setup (base commit 82af885); Windows 10, Node.js 26.7.0, MongoDB 8.2.1. |
| Status | Pass |

#### TC-109 — Transport security in deployment

| Field | Value |
|---|---|
| Requirements | SEC-REQ-007 |
| Type / Priority | Security, manual inspection / High |
| Preconditions | A deployed (non-local) instance exists. |
| Test data | — |
| Steps | 1. Open `http://<host>/` and observe the redirect.<br>2. Inspect the TLS connection details in the browser (protocol version).<br>3. Confirm the Socket.IO connection uses `wss://`.<br>4. Attempt a TLS 1.1 connection with a TLS client tool. |
| Expected result | HTTP redirects to HTTPS; protocol TLS 1.2 or 1.3; WebSocket uses `wss://`; the TLS 1.1 connection is refused. |
| Pass/fail criteria | Pass if all checks succeed on the deployed instance. |
| Dependencies / limitations | **No deployed instance exists.** Until one exists this test stays "Blocked" (reason: no deployment, §13) and SEC-REQ-007 remains unverified; the local test environment uses plain HTTP/WS by design. |
| Actual result | No deployed HTTPS instance exists (DECISIONS.md E3). FORCE_HTTPS/TRUST_PROXY are implemented but unverified. No step of this test was executed; status recorded 12-10-2026. 14-10-2026: the application-side controls were corrected — `FORCE_HTTPS` now requires `TRUST_PROXY` and an `https://` `PUBLIC_URL` (otherwise the server refuses to start instead of looping redirects), the redirect target comes from `PUBLIC_URL` instead of the request's `Host` header, real-time connections not forwarded as HTTPS are refused, and the client CSP allows only `wss:` — and were tested locally with a simulated TLS-terminating proxy (`server/tests/integration/transport.test.js`, 5 passed; `server/tests/unit/config.test.js`; uncommitted working tree, base commit 82af885; `docs/evidence/2026-10-14-full-verification/`). These local checks are not steps of this test: no TLS endpoint, certificate, TLS version or `wss://` connection to a deployment was tested, so the status stays Blocked. Later on 14-10-2026: steps 1–4 are automated by `scripts/verify-tls.js` (no account needed). Its local self-test (`server/tests/integration/tls.test.js`: the server behind a local TLS 1.2+ proxy with a throw-away self-signed certificate) passed all seven checks — 308 redirect to the configured HTTPS origin, HSTS, TLS 1.2 with the trusted certificate, TLS 1.1 refused by the server, Socket.IO over `wss://` reaching the application, plain `ws://` refused (`docs/evidence/2026-10-14-tls-local/`). The TLS settings checked there are the test proxy's, not a deployment's; status unchanged (Blocked). 15-10-2026: the local checks were repeated on the same code — self-test 7/7 PASS (including TLS 1.1 refused), and the transport and configuration tests passed, now with one more regression test: REST requests and real-time connections read a multi-valued `X-Forwarded-Proto` identically (first value, as Express does), shown to fail when the Socket.IO check is deliberately changed to the last value. Still no deployment; status unchanged (Blocked). |
| Status | Blocked |
