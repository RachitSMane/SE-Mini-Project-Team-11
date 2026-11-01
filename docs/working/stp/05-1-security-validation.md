<!-- Owner: Pranav | Reviewers: Prithvi (security lead) | Status: v1.0 -->

### 5.1 Security Validation

Every security requirement of SRS §5.1.2 is validated by at least one test case. Security test
cases TC-101 to TC-109 are specified in Appendix A (drafted by the security lead, reviewed by the
STP lead). Historical (v1.0): all were planned and none had been executed. Status after the execution of 12-10-2026 (uncommitted working tree on base commit 82af885; see `docs/IMPLEMENTATION_STATUS.md`):
TC-101 to TC-108 Pass; TC-109 Blocked (no deployment).

| Security requirement | Validation activity | Method | Test case(s) |
|---|---|---|---|
| SEC-REQ-001 Password policy and hashing | Boundary tests on password length; inspection of stored user records and logs | Automated (API) + database inspection | TC-105 |
| SEC-REQ-002 Tokens, expiry, logout | Requests, socket connections and operations with missing, tampered, expired, logged-out and wrong-board tokens (session and guest) | Automated (API, Socket.IO) | TC-106 |
| SEC-REQ-003 Server-side authorisation | Full permission matrix over REST (including ownership transfer and restore); crafted Socket.IO messages from Viewers and guests, including forged `role`/`boardId` fields; access to other boards' IDs (IDOR, 404 rule) | Automated (API, scripted Socket.IO clients) | TC-101, TC-102 |
| SEC-REQ-004 Share-link tokens | Token length/alphabet check over 1,000 generated tokens; database holds only hashes; expired and revoked links rejected | Automated + database inspection | TC-103, TC-104 |
| SEC-REQ-005 Input validation and XSS | Malformed, out-of-range and oversized (65,537-byte) messages, as distinct from the board content limit of FR-008 tested in TC-022; text containing `<script>` and HTML markup rendered in the browser | Automated (Socket.IO, API) + browser check | TC-107 |
| SEC-REQ-006 Rate limiting | Six failed logins in 15 minutes for a registered and for an unregistered e-mail address (identical status, error code and message; only `requestId` differs); 100 operations in one second from one connection | Automated | TC-108 |
| SEC-REQ-007 Transport security | Configuration review and TLS connection check of the deployed instance; HTTP → HTTPS redirect | Manual inspection | TC-109 |
| SEC-REQ-008 Security logging without secrets | Run the security suite, then check that each required event type has an entry with event, timestamp, request ID, outcome and reason, actor or `null`, board or `null` and affected account (`subjectId`) or `null` as defined in SAD §4.4 (including a failed login with an unknown and with a registered e-mail); search the log for passwords, tokens, `Authorization` headers, entered e-mail addresses and board text | Automated log scan | TC-104 |

Additional checks during security validation:

- **Dependency audit:** `npm audit` on client and server before release; no known Critical vulnerabilities may remain unresolved without a documented reason.
- **Secrets check:** the repository is searched for credentials, tokens and connection strings before every release; test accounts use generated passwords that are never committed.
- **Local exemption:** the local test environment uses plain HTTP and WS; SEC-REQ-007 can be verified only on a deployed instance (TC-109). **No deployment exists at present**, so TC-109 is "Blocked" (reason: no deployment, §13) and SEC-REQ-007 stays at RTM status N; it is never reported as passed without a deployed test.
- **Status honesty:** a security requirement is verified only when all its linked tests have status Pass (§13). Documented but unexecuted tests verify nothing.
