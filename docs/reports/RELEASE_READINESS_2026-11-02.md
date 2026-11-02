# Release readiness report — 02-11-2026 (issue #26)

Final validation for issues #21, #23, #25 and #26 on branch `feature/issues-21-23-25-26` (PR #33), based on
`main` at `7f3126d`. Every result below comes from a command whose exit code and output were checked; the
logs are in `docs/evidence/2026-11-02-final-validation/`. This report supersedes
`RELEASE_READINESS_2026-10-31.md`, which validated commit `50243ef` before PRs #29–#32 were merged.

## 1. Environment

| Item | Value |
|---|---|
| OS / hardware | Windows 10 Pro 10.0.19045 (the machine of `IMPLEMENTATION_STATUS.md` §1) |
| Node.js / npm workspaces | v26.7.0 |
| MongoDB | 8.2.1 (throw-away `mongod` per test run, `MONGOD_BIN`) |
| Playwright | 1.50.1 — Chromium 133, Firefox 134 (Playwright build), WebKit 18.2 (Playwright build) |
| Installed browsers | Google Chrome (stable) and Microsoft Edge (stable), driven through Playwright channels |
| CI | GitHub Actions `app-ci` (Ubuntu, Node.js 22, MongoDB 8.0, Chromium) and `docs-check` |

## 2. Changes in this release candidate

| Issue | Commit | Change |
|---|---|---|
| #23 | `c08e63b` | Below 1024 px the labelled top-bar buttons become icon buttons (label kept for screen readers and as tooltip). Between ~760 and 1000 px the board title collapsed to 4 px and the role badge overlapped the connection status. New `e2e/responsive.spec.cjs`. |
| #21 | `cc3e33c` | Login, register and guest-join errors use the shared `describeError()`: a server down behind a proxy showed "Request failed (502).". New `e2e/validation.spec.cjs`. |
| #25 | `d0b4937` | Restore uses `newObjectId()` (works without `crypto.randomUUID()`, i.e. over plain HTTP); colour swatches keep their colour in forced-colours mode (G8); `lostpointercapture` ends a gesture. New `e2e/compat.spec.cjs`. |
| #26, #25 | `12d7e34` | New `e2e/smoke.spec.cjs` (full workflow, fails on any console error or failed request); the #16 export test no longer attempts an outage in Playwright Firefox, whose offline emulation leaves WebSockets open. |

Each fix has a test that fails on the previous code (checked by running it against `main`'s files).

## 3. Results

| Check | Command | Exit | Result | Log |
|---|---|---|---|---|
| Lint | `npm run lint` | 0 | no findings | `01-lint.txt` |
| Unit + integration | `npm test` | 0 | 22 suites, **210 passed** | `02-npm-test.txt` |
| Production build | `npm run build` | 0 | built; `__wbTest` in 0 files of `client/dist` | `03-build-prod.txt` |
| E2E, Chromium | `npm run test:e2e` | 0 | **30 passed** (16 existing + 14 new) | `04-e2e-chromium.txt` |
| E2E, four browsers (first run) | `npm run test:e2e:browsers` | 1 | 110 passed, 5 failed, 5 skipped — see §4 | `05-e2e-browsers.txt` |
| Traceability | `python tools/check_trace.py` | 0 | 1,483 checks passed, 0 failed | `06-check-trace.txt` |
| Doc tool tests | `python -m unittest discover -s tools/tests` | 0 | 14 run, OK (5 skipped: DOCX templates are local-only) | `07-doc-tools-unittest.txt` |
| Size model | `python tools/size_model.py` | 0 | `bound_holds True` | `08-size-model.txt` |
| E2E, four browsers (re-run) | `npm run test:e2e:browsers` | 0 | **119 passed**, 0 failed, 5 skipped (§4) | `09-e2e-browsers-rerun.txt` |
| WebKit TC-001–004, longer timeout | `--timeout=120000` (→ 6 min with `test.slow`) | 0 | 1 passed (1.7 min) | `10-webkit-tc001-extended-timeout.txt` |
| E2E, Chromium (final) | `npx playwright test` | 0 | **31 passed** (with the new smoke test) | `11-e2e-chromium-final.txt` |

**After the dependency update** (`body-parser` 2.4.0, `fast-uri` 3.1.9, `qs` 6.17.1; §6.6):

| Check | Command | Exit | Result | Log |
|---|---|---|---|---|
| Audit, production dependencies | `npm audit --omit=dev` | 0 | **0 vulnerabilities** (before: 1 high, 2 moderate) | `14-npm-audit-production.txt` |
| Audit, all dependencies | `npm audit` | 1 | 27 (3 low, 22 moderate, 2 high), all in development tools; before: 30 (3 high) | `12-…-before.txt`, `13-…-after.txt` |
| Lint | `npm run lint` | 0 | no findings | `15-after-deps-lint.txt` |
| Unit + integration | `npm test` | 0 | 22 suites, **210 passed** | `16-after-deps-npm-test.txt` |
| Production build | `npm run build` | 0 | built; `__wbTest` in 0 files | `17-after-deps-build-prod.txt` |
| E2E, Chromium | `npm run test:e2e` | 0 | **31 passed** | `18-after-deps-e2e-chromium.txt` |
| E2E, four browsers | `npm run test:e2e:browsers` | 0 | **119 passed**, 0 failed, 5 skipped | `19-after-deps-e2e-browsers.txt` |
| Traceability | `python tools/check_trace.py` | 0 | 1,483 checks passed | `20-after-deps-check-trace.txt` |
| E2E, stable Firefox 159.0 (BiDi, experimental) | temporary config, `_bidiFirefox` | 1 | 22 passed, 7 failed (driver limitations), 2 skipped — §4 | `21-…`, `22-stable-firefox-diagnosis.txt` |

## 4. Browser coverage

| Browser (version) | First run (before fixes to the tests) | Re-run (before dependency update) | After dependency update |
|---|---|---|---|
| Chromium 133 (Playwright, used by CI) | 30/30 | 31/31 | 31/31 |
| Google Chrome (installed, stable) | 30/30 | 31/31 | 31/31 |
| Microsoft Edge (installed, stable) | 30/30 | 31/31 | 31/31 |
| Firefox 134 (Playwright build) | 26 passed, **1 failed**, 3 skipped | 28 passed, 3 skipped | 28 passed, 3 skipped |
| WebKit 18.2 (Playwright build, Safari engine) | 24 passed, **4 failed**, 2 skipped | 29 passed, 2 skipped | 29 passed, 2 skipped |

Skips (by design, each stated in the test): Firefox — TC-009 outage (offline emulation does not cut WebSockets),
forced colours and multi-touch (Chromium-only emulation); WebKit — forced colours and multi-touch. In Firefox
the #16 test runs its export part but not its outage step (same reason as TC-009).

**First-run failures and what they were.**

- *Firefox, #16 "Viewer guest can export; button disabled while disconnected":* not an application defect.
  Measured with a diagnostic test: after `setOffline(true)` Playwright's Firefox rejects `fetch` but the open
  Socket.IO WebSocket stays connected ("Connected" 31 s later, past the 20 s heartbeat), so no outage can be
  produced; Chrome showed the banner and disabled tools within 5 s. The same limitation is why TC-009 already
  skips Firefox. The export part of the test still runs in Firefox; the outage step runs in the other browsers.
- *WebKit, four tests:* TC-005/013/023/018, TC-009 and the #23 layout test failed in the long run and passed
  when re-run individually. TC-001–004 exceeded its 3-minute budget (`test.slow` in WebKit) both on this branch
  and, in a baseline run, came within a second of it on `main`. Typing speed in the text editor was measured
  identical on both builds (8.0–9.5 s per 200 keys on the branch, 8.7–9.0 s on `main`): Playwright's WebKit on
  Windows renders in software and is slower on this machine than on the 31-10 machine, so this is a test-time
  budget issue, not a regression. Its assertions were checked with a longer timeout (row above).

**Not covered.**

- **Apple Safari was not tested.** Playwright's WebKit build is the Safari engine but not Safari (no macOS
  integration, different network stack). WebKit results are engine evidence only.
- **Stable Mozilla Firefox 159.0: automated, supplementary, partly limited by the driver.** Playwright's
  Firefox above is a patched build. Stable Firefox 159.0 (extracted from the official installer, not installed)
  was driven through Playwright 1.50.1's experimental WebDriver BiDi driver: **22 passed, 7 failed, 2 skipped**
  (`21-stable-firefox-159-bidi.txt`). Each failure was traced to the driver (`22-stable-firefox-diagnosis.txt`):
  it does not deliver download events (3 tests; the app reported a successful export), does not track
  `history.pushState` in `page.url()` (1), types `fill()` one character at a time (1; the app behaves correctly),
  does not deliver `dblclick` (1) and `setOffline()` leaves the WebSocket open (1). No application defect was
  found. Not verified automatically in stable Firefox: double-click text editing, the offline banner and the
  actual PNG download — they are manual checks (§8).
- Forced-colours and multi-touch tests run in Chromium-based browsers only (emulation and CDP touch input are
  not available in the Firefox and WebKit drivers).

## 5. Functional areas checked

| Area | Evidence |
|---|---|
| Authentication and authorisation | `auth.test.js` (TC-015, 105, 106, 108), `access.test.js` TC-102 matrix, `validation.spec.cjs` |
| Sharing and access control | `access.test.js` (TC-016–018, 023, 101–104), E2E TC-017/103, smoke test (Editor link, guest join) |
| Real-time sync, multiple clients | `sync.test.js`, `multiClient.test.js` (5 clients), E2E TC-001–004, smoke test |
| Reconnection and recovery | `syncLifecycle.test.js`, `recovery.test.js` (TC-011, 024, 025), E2E TC-009 |
| Database validation and integrity | `dbIntegrity.test.js`, `persistence.test.js`, `boardLimit.test.js` (TC-022) |
| Export and restore | `exportImage.test.js`, E2E #16 tests, TC-013, `compat.spec.cjs` (restore without `randomUUID`), smoke test |
| Console errors, failed requests | `smoke.spec.cjs`: none in a complete workflow (register → create → draw → share → guest join → sync → export → clear → restore) |
| Responsive layout | `responsive.spec.cjs`: 1280×720, 1366×768, 1920×1080 and 1024×768, 800×600, 480×800; resize; dialogs |
| Frontend validation and feedback | `validation.spec.cjs` (6 tests) |

## 6. Known limitations

1. **TC-109 / SEC-REQ-007 (HTTPS deployment): still Blocked.** There is no deployed HTTPS host. The application
   side (`FORCE_HTTPS`, `TRUST_PROXY`, HSTS, `wss:` only) is tested locally (`transport.test.js`, `tls.test.js`);
   the endpoint itself needs `node scripts/verify-tls.js https://<host>` on a real deployment
   (`docs/reviews/TC109_DEPLOYMENT_PLAN.md`).
2. **Restore over plain HTTP:** fixed and tested with `crypto.randomUUID` removed (`compat.spec.cjs`). Not tested
   from a second physical device on a LAN.
3. **High-contrast swatches (G8):** fixed; verified with Chromium's forced-colours emulation. Not checked with the
   real Windows high-contrast theme.
4. **Fractional DPR and multi-pointer:** DPR 1.25 tested (backing store and pointer accuracy) in every browser,
   including stable Firefox 159;
   two-finger touch tested in Chromium-based browsers through CDP touch input; lost pointer capture fixed and
   tested. Not checked at real 125 % Windows scaling or on a physical touch screen.
5. **Firefox offline emulation:** outage tests (TC-009, #16 disconnected step) cannot run in Playwright's Firefox.
6. **Dependencies: runtime advisories fixed.** `body-parser` 2.3.0 (high, GHSA-27r3-jxmh-p828: denial of service
   through trailing bytes after a compressed request body; reachable because `express.json()` inflates compressed
   bodies), `qs` 6.16.0 (moderate, GHSA-6pq8-jhm2-2vcw) and `fast-uri` 3.1.8 (moderate, four advisories) came in
   through `express` 5.3.0 and `ajv` 8.20.0. They were updated inside the existing ranges (`npm update`, lockfile
   only) to 2.4.0, 6.17.1 and 3.1.9; production dependencies now have no known vulnerabilities. Remaining: 27
   advisories in development tools only — `playwright`/`@playwright/test` < 1.55.1 (high: browser downloads not
   verified; mitigation: install browsers only from the official CDN in CI and on developer machines, upgrade in
   a separate PR with a full browser re-run), `vite` 6.4.4 dev server (moderate, `server.fs.deny` bypass; the dev
   server listens on localhost only), and Jest/ESLint transitive advisories whose suggested fixes are breaking
   downgrades. None of these is part of the deployed application.
7. **Documents:** STP §4 and SRS §2.2 still list export as outside version 1.0 although #16 implemented it; the
   API-02 table does not list `PATCH /boards/{boardId}`. Left to the document owners (scope documents).

## 7. Deployment requirements

As in README "Run as a single server" and "Deployment behind HTTPS": `npm run build`, `server/.env` with
32-character secrets, `CLIENT_DIST`, and behind one TLS-terminating proxy `NODE_ENV=production`,
`TRUST_PROXY=true`, `FORCE_HTTPS=true`, `PUBLIC_URL=https://<host>`; the proxy must forward WebSocket upgrades
for `/socket.io/`. Note: `npm run test:e2e` leaves the *test* build in `client/dist`; run `npm run build` again
before deploying.

## 8. Manual checks before the demonstration

- [ ] Stable Mozilla Firefox (installed): double-click a text object to edit it; export and open the PNG; go
      offline and check the banner and disabled tools (the parts the BiDi driver cannot automate).
- [ ] Apple Safari on a Mac, if one is available; otherwise state "Safari not tested" in the demo notes.
- [ ] Windows display scaling 125 % and, if available, a touch screen: draw with pen and two fingers.
- [ ] Windows high-contrast theme: colour swatches distinguishable.
- [ ] A second device on the LAN over plain HTTP: draw and restore a version.
- [ ] TC-109 on the deployed host, if the project is deployed.

## 9. Conclusion

**Ready for demonstration, with the limitations in §6 and the manual checks in §8.** On this release candidate
every automated check passes: lint; 210 unit and integration tests; the production build; 31 E2E tests in
Chromium, Chrome and Edge, and in Playwright's Firefox and WebKit builds with 5 documented skips; traceability
(1,483 checks); doc tools; the size model; and GitHub CI on the PR. The complete workflow produces no console
errors or failed requests. Stable Mozilla Firefox 159 passed every automated test its experimental driver can
run (22), with no application defect found in the 7 driver-limited ones. Not verified: Apple Safari (not
tested at all), the three driver-limited stable-Firefox behaviours, real 125 % scaling, touch screens and
high-contrast themes on physical setups, and TC-109 (no HTTPS deployment).

## 10. Post-merge status (added 02-11-2026, 16:00 UTC)

- PR #33 was merged into `main` as `2b68907`; its tree is identical to the validated commit `48051d8`.
- GitHub CI on `main` at `2b68907`: `app-ci` run 41476112779 passed (lint, 110 unit, 100 integration,
  production build, 31 Chromium E2E tests); `docs-check` passed.
- Issues #21 and #23 were closed by PR #33. Issues #25 and #26 were closed as completed by the repository
  owner at 15:54 UTC; **no results of the manual checks in §8 were recorded** in the issues or in the
  repository, so §8 is unchanged. All four sprint milestones are closed.
- Known limitations (§6) are unchanged.
