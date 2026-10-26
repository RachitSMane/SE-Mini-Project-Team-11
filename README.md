# SE Mini Project — Team 11

Real-Time Collaborative Virtual Whiteboard

Several people draw on one board at the same time and see each other's changes live. Boards keep
an automatic version history that the Owner can restore, and are shared through expiring
Viewer/Editor links. Stack: MongoDB, Express, React, Node.js and Socket.IO (MERN, DECISIONS.md D10).

The requirements, design and test plan are in [`docs/`](docs/README.md) (SRS, SAD, STP). The
verified state of the implementation, test by test, is in
[`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).

## Repository layout

```
server/    COMP-03..09: Express REST API (API-02, API-03), Socket.IO server (API-01),
           auth, board & access service, version history, persistence, logging
shared/    COMP-02 sync module and the board object model, used by the browser and the tests
client/    COMP-01: React single-page application (Vite)
e2e/       Playwright browser tests
scripts/   local MongoDB helper and the development launcher
docs/      SRS, SAD, STP sources, decision log, traceability
```

## Prerequisites

- Node.js 22.12 or later is required (`package.json` engines; the E2E set-up loads an ES module with
  `require()`, which older versions do not support). Verified locally with Node.js 26.7 and npm 11.19 on
  Windows 10; the CI workflow uses Node.js 22 but has not run on GitHub yet.
- MongoDB (verified with 8.2): `mongod` on the `PATH`, or `MONGOD_BIN` set to its full path. A MongoDB
  service already running on port 27017 also works for development.

## Setup

```sh
npm install
cp server/.env.example server/.env
```

Edit `server/.env` and replace the two secrets with random values of at least 32 characters:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`server/.env` is ignored by Git; never commit it.

## Run in development

Two terminals:

```sh
npm run db:start   # local mongod on port 27017 (MONGO_PORT to change), data in ./.data/db;
                   # skip it if a MongoDB service already listens on 27017
npm run dev        # API on http://127.0.0.1:4000 and the client on http://localhost:5173
```

Open http://localhost:5173, register, create a board, and use **Share** to invite others (open the
link in another browser or a private window to join as a guest).

## Run as a single server

```sh
npm run build
# in server/.env: CLIENT_DIST=../client/dist  (path relative to the server folder or absolute)
npm start          # serves the API, Socket.IO and the built client on PORT (default 4000)
```

### Deployment behind HTTPS (SEC-REQ-007)

In a deployed (non-local) environment run the server behind **one** TLS-terminating reverse proxy
(TLS 1.2 or later, public certificate) and set, in `server/.env`:

```sh
NODE_ENV=production
TRUST_PROXY=true                      # trust X-Forwarded-For/-Proto from exactly one proxy hop
FORCE_HTTPS=true                      # 308 redirect to HTTPS, HSTS, wss:// only
PUBLIC_URL=https://<your-host>        # used for the redirect target and share links
CLIENT_DIST=../client/dist            # after `npm run build`
```

The server refuses to start if `FORCE_HTTPS=true` is set without `TRUST_PROXY=true` (every request
would otherwise look like plain HTTP and be redirected in a loop) or without an `https://`
`PUBLIC_URL`. The proxy must set `X-Forwarded-Proto` and forward WebSocket upgrades for
`/socket.io/`; with `FORCE_HTTPS` the server rejects real-time connections that did not arrive over
HTTPS, and the client CSP allows only `wss:`. These application-side controls are tested locally with
a simulated proxy (`server/tests/integration/transport.test.js`) and through a real local TLS hop
(`server/tests/integration/tls.test.js`, needs `openssl`); the TLS endpoint itself (TC-109) can only be
verified on a real deployment, see `docs/reviews/TC109_DEPLOYMENT_PLAN.md`. On the deployed host, run:

```sh
node scripts/verify-tls.js https://<your-host>    # TC-109 steps 1-4; JSON report, exit 0 only if all pass
```

## Tests

| Command | What it runs |
|---|---|
| `npm run test:unit` | permission matrix, sync module rules, canvas geometry |
| `npm run test:integration` | REST + Socket.IO tests against a throw-away `mongod`, including crash/restart tests with fault injection (`FAULT_INJECT`) |
| `npm test` | unit and integration together |
| `npm run test:e2e` | builds the client test build, then Playwright (Chromium) against the real server |
| `npm run test:e2e:browsers` | the same suite in the installed Google Chrome and Microsoft Edge and in Playwright's Firefox build (TC-021); choose with `E2E_BROWSERS=chrome,msedge,firefox`. Playwright's Firefox is a patched build, not the stable Mozilla Firefox that TC-021 requires; test stable Firefox by hand |
| `npm run lint` | ESLint |
| `npm run perf` | performance harness: TC-019 latency (10 clients, 60 s), TC-013 restore, TC-020 load, TC-009 reconnection; results appended to `perf-results/*.csv` (about 10 minutes; `PERF_QUICK=1` for a short smoke run that does not count as verification). `PERF_CHANNEL=chrome node scripts/perf/browser.js` repeats the browser timings in the installed Chrome |

`npm run test:e2e` and `npm run perf` leave the **test build** in `client/dist`; run
`npm run build` again before serving the client in production.

The integration and E2E set-ups start their own `mongod` on a free port; set `TEST_MONGO_URL`
(e.g. `mongodb://127.0.0.1:27017`) to use an existing MongoDB instead. Playwright needs its
Chromium once: `npx playwright install chromium`.

Test-only hooks (`window.__wbTest`, `FAULT_INJECT`, `LINK_EXPIRY_OVERRIDE_SEC`, short
`VERSION_INTERVAL_MS`) are active only with `NODE_ENV=test` or in the client test build
(`npm run build:test`); the normal build does not contain them.

## Configuration (`server/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT`, `HOST` | `4000`, `127.0.0.1` | listen address |
| `MONGO_URL` | `mongodb://127.0.0.1:27017/whiteboard` | database |
| `JWT_SECRET`, `LOGIN_HMAC_KEY` | — (required, ≥ 32 chars) | token signing and login-limiter keys |
| `PUBLIC_URL` | `http://localhost:5173` | base of share-link URLs |
| `CLIENT_DIST` | empty | serve the built client from this folder |
| `VERSION_INTERVAL_MS` | `300000` | periodic version interval (D11a) |
| `BCRYPT_COST` | `12` | password hashing cost (minimum 12 in production) |
| `LOG_LEVEL`, `LOG_FILE` | `debug`, `logs/server.log` | JSON log output |
| `TRUST_PROXY`, `FORCE_HTTPS` | `false`, `false` | deployment behind a TLS-terminating proxy (see above); `FORCE_HTTPS` requires `TRUST_PROXY` and an `https://` `PUBLIC_URL` |
