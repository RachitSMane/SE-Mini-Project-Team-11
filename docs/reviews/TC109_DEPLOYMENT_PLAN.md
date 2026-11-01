# TC-109 deployment and verification plan (SEC-REQ-007)

Prepared 14-10-2026. **Plan only.** Nothing was deployed, configured or exposed. TC-109 stays
**Blocked** (no deployed instance; DECISIONS.md E3 "Pending").

## 1. What has to be shown

- **SEC-REQ-007** (SRS 5.1.2): "In any deployed (non-local) environment, all client–server
  communication shall use HTTPS and secure WebSockets with TLS 1.2 or later; plain HTTP requests shall
  be redirected to HTTPS." The local test environment is exempt.
- **STP TC-109** steps (`docs/working/stp/tc-security.md`):
  1. HTTP redirects to HTTPS.
  2. TLS 1.2 or 1.3.
  3. Socket.IO uses `wss://`.
  4. A TLS 1.1 connection is refused.
  Pass only if all four checks succeed on the deployed instance.

## 2. What the code does (inspected)

| Item | Where | Behaviour |
|---|---|---|
| Plain HTTP server only | `server/src/server.js` (`http.createServer`) | The app never terminates TLS. TLS versions and certificates are entirely the **proxy's** job. |
| `TRUST_PROXY=true` | `server/src/config.js:37`, `server/src/rest/app.js:50` | `app.set('trust proxy', 1)`: trusts exactly **one** proxy hop for `X-Forwarded-Proto`/`-For`. |
| `FORCE_HTTPS=true` | `config.js:38`, `app.js:60–64` | On every Express request: sets `Strict-Transport-Security: max-age=31536000`; if `req.protocol !== 'https'`, it answers **308** to `https://<Host header><original URL>`. |
| Socket.IO | `server.js:37–46` | Attached to the HTTP server, so its requests are handled **before** Express. The redirect and HSTS do not apply to `/socket.io/`. Heartbeat 10 s + 10 s; `cors` only if `CLIENT_ORIGIN` is set. |
| Client socket | `client/src/board/BoardPage.jsx:100` | `io('/board', { transports: ['websocket'] })`: same origin, **WebSocket only** (no long-polling fallback). On an `https://` page it connects with `wss://`. |
| CSP (built client) | `app.js:215` | `connect-src 'self' ws: wss:`. `ws:` is still allowed; browsers block insecure `ws:` from an HTTPS page anyway (mixed content). |
| Production mode | `config.js:50`, `app.js:203` | `NODE_ENV=production` requires `BCRYPT_COST ≥ 12` and hides `/api/v1/metrics`. |
| Documentation | `README.md` "Run as a single server" | "run the server behind a TLS-terminating proxy and set `TRUST_PROXY=true` and `FORCE_HTTPS=true`". |

No automated test covers `FORCE_HTTPS` or `TRUST_PROXY` (searched `server/tests`, `e2e`).

**Update 14-10-2026 (session 4).** The rows above describe the code before session 4. Local tests (`server/tests/integration/transport.test.js`, `server/tests/unit/config.test.js`) found three defects, which are now fixed: the redirect target came from the client's `Host` header (now `PUBLIC_URL`); Socket.IO accepted plain connections under `FORCE_HTTPS` (now refused unless `X-Forwarded-Proto` is `https`); the CSP allowed `ws:` (now only `wss:` with `FORCE_HTTPS`). `FORCE_HTTPS=true` without `TRUST_PROXY=true`, or with a non-`https://` `PUBLIC_URL`, now stops the server at start-up instead of looping. Logs: `docs/evidence/2026-10-14-full-verification/03-…` (before) and `04-…` (after). These are local checks with a simulated proxy; TC-109 itself still needs the deployment below.

**Update 14-10-2026 (session 5).** Steps 1–4 of §5 are automated by `scripts/verify-tls.js` (`node scripts/verify-tls.js https://<host>`; add `--http http://<host>` if HTTP is not on port 80). It needs no account (the `wss://` check passes when the application answers `UNAUTHENTICATED`), prints a JSON report and exits 0 only if every check passes; save that report with the date, host, proxy version and Git commit as TC-109 evidence, and still do step 2 in a browser (padlock / DevTools Security tab). A TLS 1.1 result of `INCONCLUSIVE` means the client could not offer TLS 1.1; repeat that check with `openssl s_client -connect <host>:443 -tls1_1`. Local self-test of the helper through a real TLS 1.2+ proxy: all seven checks passed (`docs/evidence/2026-10-14-tls-local/`) — not TC-109 evidence.

## 3. Deployment prerequisites (team decision: who provides them — E3)

1. **Host and DNS.** A non-local machine or VM reachable at a DNS name (`<host>`) with ports 80 and
   443 open. `localhost`, an IP-only address or a tunnel to a laptop is not a "deployed environment"
   in the STP's sense unless the team decides otherwise.
2. **Certificate.** Valid for `<host>` from a public CA (e.g. Let's Encrypt), with the full chain. No
   self-signed certificate: step 2 would show a certificate warning instead of clean connection details.
3. **Reverse proxy** (e.g. nginx or Caddy), exactly **one** hop in front of Node:
   - TLS 1.2 and 1.3 only (nginx: `ssl_protocols TLSv1.2 TLSv1.3;`);
   - sets `X-Forwarded-Proto $scheme` and `X-Forwarded-For`, and passes `Host`. The proxy must
     **replace** any `X-Forwarded-Proto` sent by the client (nginx `proxy_set_header X-Forwarded-Proto
     $scheme;` does; never forward `$http_x_forwarded_proto`), because the server trusts the first
     value from exactly one hop (`server/src/rest/app.js:50`, `forwardedProto()` in `server/src/server.js`).
     Check during §5: `curl -sI -H "X-Forwarded-Proto: https" http://<host>/` must still return the
     redirect, not 200;
   - **WebSocket upgrade** for `/socket.io/`: `proxy_http_version 1.1`, `Upgrade` and
     `Connection: upgrade` headers. Required, because the client uses WebSocket only;
   - read/idle timeout well above 20 s (heartbeat 10 s + 10 s); the nginx default of 60 s is enough;
   - port 80 either forwarded to Node (then `FORCE_HTTPS` produces the 308) or redirected by the proxy
     itself (301/308). Record which one, because step 1's expected status code depends on it.
4. **Node bound to `127.0.0.1`** (`HOST=127.0.0.1`, the default), so that neither plain HTTP nor `ws://`
   can bypass the proxy.
5. **Configuration** (`server/.env`, never committed):
   - `NODE_ENV=production`;
   - `TRUST_PROXY=true` **and** `FORCE_HTTPS=true`, always together;
   - `PUBLIC_URL=https://<host>`, the base of share links;
   - `CLIENT_DIST` = the built client (`npm run build`), absolute or relative path;
   - `MONGO_URL` pointing to a MongoDB that is not exposed publicly;
   - `JWT_SECRET` and `LOGIN_HMAC_KEY`: fresh random values of ≥ 32 characters, never the test or
     example values;
   - `BCRYPT_COST=12` (or higher);
   - `CLIENT_ORIGIN` empty (same origin).
6. **Data.** Test accounts and test boards only. Tear the instance down, or restrict it, after the
   test. No secrets, certificates or keys in the repository or in the evidence.

## 4. Risks and misconfigurations

| Risk | Effect | Mitigation |
|---|---|---|
| `FORCE_HTTPS=true` without `TRUST_PROXY=true` | Behind the proxy `req.protocol` is always `http`, so every HTTPS request is redirected to itself (**redirect loop**). Since 14-10-2026 `config.js` refuses to start with this combination. | Set both; check step 1 and a normal page load. |
| More than one proxy hop (CDN + load balancer) | `trust proxy 1` reads the wrong hop; `req.protocol`/IP may be wrong (loop or wrong rate-limit IP). | One proxy only, or change the trust setting (a code/config decision). |
| Proxy lacks the WebSocket upgrade | Board never connects ("Disconnected — reconnecting…"); no fallback transport. | Upgrade headers for `/socket.io/`. |
| Node's port (`PORT`, default 4000) reachable directly | Plain HTTP/`ws://` bypasses TLS; Socket.IO is not redirected. | `HOST=127.0.0.1`, firewall. |
| Health checks over plain HTTP | They get 308 when `FORCE_HTTPS` is on. | Check over HTTPS. |
| `PUBLIC_URL` left as `http://…` | Share links start on HTTP and depend on the redirect. | `PUBLIC_URL=https://<host>`. |
| HSTS `max-age=31536000` on a shared/real domain | Browsers then insist on HTTPS for that host for a year. | Use a dedicated test hostname. |
| Weak client TLS defaults hide a server misconfiguration | A TLS 1.1 refusal may come from the local OpenSSL, not the server. | Use `-cipher 'DEFAULT@SECLEVEL=0'` (step 4). |

## 5. Verification procedure (save every output; mask nothing but secrets)

Record: date and time, `<host>`, proxy name and version, Node.js version, build (Git commit),
`NODE_ENV`, and the `TRUST_PROXY`/`FORCE_HTTPS` values (not the secrets).

| # | STP step | Command / action | Expected |
|---|---|---|---|
| 1a | 1 | `curl -sSI http://<host>/` | `308` (from the app) or the proxy's `301/308`; `Location: https://<host>/` |
| 1b | 1 | `curl -sSI http://<host>/api/v1/health` | redirect to `https://<host>/api/v1/health` |
| 1c | (HSTS) | `curl -sSI https://<host>/` | `200`; `Strict-Transport-Security: max-age=31536000` |
| 1d | (no loop) | `curl -sSIL https://<host>/` | ends with `200` and no repeated redirects |
| 2 | 2 | Firefox or Chrome on `https://<host>/`, padlock → connection details (or DevTools → Security) | TLS 1.2 or TLS 1.3; valid certificate |
| 2b | 2 | `openssl s_client -connect <host>:443 -servername <host> -tls1_2 </dev/null` and `-tls1_3` | handshake succeeds; `Protocol : TLSv1.2` / `TLSv1.3` |
| 3 | 3 | Log in, open a board; DevTools → Network → filter **WS** | request URL `wss://<host>/socket.io/?EIO=4&transport=websocket`, status 101; connection indicator "Connected" |
| 4 | 4 | `openssl s_client -connect <host>:443 -servername <host> -tls1_1 -cipher 'DEFAULT@SECLEVEL=0' </dev/null` | handshake **fails** (e.g. "no protocols available" / alert "protocol version") |
| 4b | 4 | Optional: `nmap --script ssl-enum-ciphers -p 443 <host>` | only TLSv1.2 / TLSv1.3 listed |

If the local OpenSSL build cannot offer TLS 1.1 at all, step 4 is inconclusive. Record that and use
another client (e.g. nmap above, or an online TLS scanner) rather than reporting a refusal.

Evidence folder: `docs/evidence/<YYYY-MM-DD>-tc109-https/`:
- the text outputs of 1a–1d, 2b, 4 (and 4b);
- screenshots of step 2 (connection details) and step 3 (WS request with `wss://` and status 101);
- `RESULTS.md` with tester, date, environment, each step Pass/Fail.

## 6. Local code checks vs. deployed validation

| | Local code check (possible now, not done) | Deployed validation (TC-109) |
|---|---|---|
| What | e.g. a supertest test: with `FORCE_HTTPS=true, TRUST_PROXY=true`, `X-Forwarded-Proto: http` gives 308 + `Location`; `https` gives 200 + HSTS | real TLS endpoint, certificate, protocol versions, `wss://`, redirect through the proxy |
| Shows | the redirect/HSTS code works as written | SEC-REQ-007 holds in a deployment |
| Counts for TC-109 | **No** | **Yes** |
| Needs | a team decision to add a test (no infrastructure) | host, DNS, certificate, proxy (E3) |

TC-109's status and the RTM entry for SEC-REQ-007 (and SEC-OBJ-001) change only after a team member
runs §5 on a real deployment and the team reviews the evidence.
