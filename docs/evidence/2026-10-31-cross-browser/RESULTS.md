# Cross-browser compatibility test record — issue #25 (31-10-2026)

**Overall result: Pass with limitations.** The full E2E suite passes in Chrome, Edge, Firefox (Playwright
build) and WebKit (Playwright build, the Safari engine): **39 passed, 1 skipped, 0 failed**. The skip is the
known Firefox offline-emulation limitation (§4.3). Three browser-specific issues were found; two were
fixed, one is recommended to its file owner (§4). Real Apple Safari was **not** tested (§5).

Everything below was run on 31-10-2026 by the automated suite; nothing in this record is a manual or
reported result. Raw logs were kept outside the repository (see §6).

## 1. Run details

| Field | Value |
|---|---|
| Date | 31-10-2026 |
| Branch / base | `feat/pw-issues-9-12-15-20-25`, base commit `1c72bee` plus the uncommitted changes for issues #9, #20, #12, #15, #25 |
| OS | Windows 11 Home 10.0.26200 |
| Node.js / MongoDB | v24.11.1 / mongod 9.0.4 |
| Playwright | 1.50.1 |
| Viewport | 1280 × 720 (NFR-006 minimum), DPR 1 |
| Client build | test build (`npm run build:test`), served by the E2E global setup |

| Project | Browser (version reported by Playwright) | What it represents |
|---|---|---|
| `chromium` | Playwright Chromium 133.0.6943.16 | default CI browser |
| `chrome` | Google Chrome 156.0.8078.49 (installed, stable) | Chrome |
| `msedge` | Microsoft Edge 156.0.4314.50 (installed, stable) | Edge |
| `firefox` | Playwright Firefox 134.0 | Firefox engine (patched build, not stable Mozilla Firefox) |
| `webkit` | Playwright WebKit 18.2 | Safari engine (not Apple Safari) — **new in issue #25** |

## 2. Commands

```sh
npx playwright install chromium firefox webkit
npm run test:e2e            # Chromium
npm run test:e2e:browsers   # chrome, msedge, firefox, webkit (E2E_BROWSERS to choose)
```

## 3. Results

Final runs (after the fixes in §4):

| Command | Exit | Result | Time |
|---|---|---|---|
| `npm run lint` | 0 | no problems | — |
| `npm test` (unit + integration) | 0 | 119 / 119 passed, 16 suites | ≈ 4 min |
| `npm run test:e2e` (Chromium) | 0 | 10 / 10 passed | 38.4 s |
| `npm run test:e2e:browsers` | 0 | 39 passed, 1 skipped, 0 failed | 6.6 min |

Per test and browser (✓ passed, – skipped):

| E2E test (`e2e/…`) | Chrome | Edge | Firefox | WebKit |
|---|---|---|---|---|
| TC-021 checklist: Owner, Editor, Viewer at 1280 × 720 (`usability.spec.cjs`) | ✓ | ✓ | ✓ | ✓ |
| TC-015/TC-016: register, create and open a board, log out | ✓ | ✓ | ✓ | ✓ |
| TC-001 to TC-004: pen, shapes, text, select/move/restyle/delete, eraser synchronise | ✓ | ✓ | ✓ | ✓ (2.1 min, see §4.1) |
| TC-017/TC-103: share link, guest join, presence, Viewer UI, revocation | ✓ | ✓ | ✓ | ✓ |
| TC-107/TC-010: markup drawn as plain text; rejected change rolled back with a message | ✓ | ✓ | ✓ | ✓ |
| TC-005/TC-013/TC-023/TC-018: clear, restore, role change, ownership transfer | ✓ | ✓ | ✓ | ✓ |
| TC-009: offline indicator, disabled tools, resynchronisation | ✓ | ✓ | – (§4.3) | ✓ |
| TC-017 step 3 / TC-016 step 3: member joins through a link; dashboard delete | ✓ | ✓ | ✓ | ✓ |
| SAD §3.9.2: expired guest token returns to the entry page; link renews access | ✓ | ✓ | ✓ | ✓ |
| TC-009 repetition: lost acknowledgement resolved by resync with notice | ✓ | ✓ | ✓ | ✓ |

Issue #25 acceptance criteria:
- *Core whiteboard functionality works across supported browsers* — the 10 tests above cover drawing,
  sharing, roles, history, clear and reconnection; all pass in every browser except the documented skip.
- *Canvas interactions behave consistently* — TC-001 to TC-004 compares the exported state of two clients
  after every pen, shape, text, move, restyle, delete and eraser gesture; identical in all browsers.
- *No critical browser-specific issues remain* — see §4: none open is critical; one accessibility issue
  is recommended to its file owner.

## 4. Browser-specific findings

### 4.1 WebKit: slow input made TC-001 time out — test timeout adjusted; one redraw removed
- **First run:** TC-001 to TC-004 failed in WebKit only: "Test timeout of 60000ms exceeded" while typing
  the 501 characters of the FR-004 check one key at a time (`e2e/whiteboard.spec.cjs`).
- **Measured** with a temporary diagnostic spec (deleted afterwards):

  | | Chromium | WebKit |
  |---|---|---|
  | 501 keys into a plain `<textarea>` (no app) | 781 ms | 1,774 ms |
  | 100 keys into the board's text editor | 254 ms | 2,955 ms |
  | one toolbar click | 98 ms | 449 ms |
  | `setTimeout(0)` callbacks in 2 s on an idle board | 427 | 130 |
  | idle redraws / `ResizeObserver` callbacks | 0 / 0 | 0 / 0 |

  There is no render loop; every action is uniformly 3–10× slower in Playwright's WebKit build for
  Windows, which renders in software. In the real test two pages are open, so typing took over 70 ms
  per key. 30 ms per key is still far faster than a person types, so this is not a user-facing defect.
- **Also found:** the canvas repainted the whole board on every key typed into the text editor (the draw
  effect had no dependency list). Fixed in `client/src/board/Canvas.jsx` (redraw only when objects, size,
  selection, tool, the edited object or a gesture step change): 107 → 7 repaints for 100 keys. This alone
  did **not** fix the timeout (2,955 vs 3,187 ms per 100 keys in WebKit), so it is reported as an
  efficiency improvement only.
- **Resolution:** `test.slow(browserName === 'webkit', …)` in that one test triples its timeout in WebKit
  only. Every assertion is unchanged. Result: passes in 1.9–2.1 min of its 3 min limit.

### 4.2 Plain-HTTP access from another device: drawing threw in every browser — fixed (issue #15)
`crypto.randomUUID()` exists only in secure contexts (HTTPS or `localhost`). Measured on a plain-HTTP page
served on this machine's LAN address (`http://<LAN-IP>:<port>/`), as when testing on a phone or a Mac:

| Engine | `isSecureContext` | `crypto.randomUUID` | old Canvas id code | `newObjectId()` |
|---|---|---|---|---|
| Chromium | false | undefined | `TypeError: crypto.randomUUID is not a function` | valid v4 UUID |
| Firefox | false | undefined | `TypeError: crypto.randomUUID is not a function` | valid v4 UUID |
| WebKit | false | undefined | `TypeError: … 'crypto.randomUUID' is undefined` | valid v4 UUID |

This affects **all** browsers, not only Safari. `newObjectId()` (`client/src/board/geometry.js`) falls back to
`crypto.getRandomValues()`, which is available in every context. Remaining: the version-restore
`Idempotency-Key` in `BoardPage.jsx` still uses `crypto.randomUUID()` (out of scope for #15/#25), so
**restoring a version over plain HTTP from another device still fails**; drawing works. Deployments use
HTTPS (SEC-REQ-007), where both work.

### 4.3 Firefox: TC-009 offline test skipped (known, unchanged)
Playwright's offline emulation (`setOffline`) does not close open WebSockets in Firefox, so the outage
cannot be produced and the test is skipped there (`test.skip` for project `firefox`). Disconnection
detection itself is covered by the heartbeat test in `server/tests/integration/sync.test.js` and passes
in WebKit, Chrome and Edge. A relay-based approach is planned as P2 (Pranav, `TEAM_CONTRIBUTION_PLAN.md`).

### 4.4 Colour swatches with a dark or high-contrast Windows theme (TC-021 D5 / G8) — recommended fix
- **Dark colour scheme** (`prefers-color-scheme: dark`, emulated): swatches render correctly in Chromium,
  Firefox and WebKit (computed colours unchanged; screenshots checked). **Not reproduced.**
- **Forced colours** (Windows contrast themes, emulated with `forcedColors: 'active'`): the browser
  replaces author background colours of buttons, so all 8 swatches get the **same** colour —
  Chromium: all `rgb(0, 0, 0)`; Firefox: all `rgb(233, 233, 237)`; WebKit keeps the real colours. The
  colours can then only be told apart by their tooltip / accessible name ("Colour #D32F2F").
  This is a likely cause of the 17-10 Firefox observation (dark-themed window, swatches not visible).
- **Recommended fix** (not applied: `client/src/styles.css` belongs to Rachit, task R2):
  `.toolbar .swatch { forced-color-adjust: none; }` — keeps the swatch colours, which are content, not
  decoration. Recheck afterwards with the same emulation in all engines.

### 4.5 Features with minimum browser versions (from the code; not separately tested)
| Feature | Where | Needs |
|---|---|---|
| `crypto.randomUUID` | restore `Idempotency-Key` (`BoardPage.jsx`) | secure context; Safari 15.4+ |
| `Object.hasOwn` | `shared/src/errorCodes.js` | Chrome 93, Firefox 92, Safari 15.4 |
| `:focus-visible` | toolbar tooltips (`Toolbar.jsx`), CSS | Safari 15.4+ |
| `:has()` | custom-colour focus ring (`styles.css`) | Firefox 121+, Safari 15.4+ (without it only the focus ring is missing) |
| Pointer Events + `setPointerCapture`, `touch-action: none` | canvas drawing | all current browsers; required for touch/pen on Safari iOS |
| `ResizeObserver` | canvas sizing | all current browsers |

## 5. Limitations
- **Apple Safari was not tested.** Playwright's WebKit shares the engine but not Safari's macOS/iOS
  integration, graphics or network stack. A manual check on a Mac (Safari 17+) remains open.
- **Firefox** is Playwright's patched 134.0 build, not stable Mozilla Firefox (the stable-Firefox manual
  record is `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md`).
- The manual TC-021 items (tooltips visible on hover, keyboard reach of every control, human judgement of
  layout) were **not** repeated; this record covers the automated suite only.
- Dark-scheme and forced-colours results come from Playwright emulation, not a real Windows theme.
- TC-001 in WebKit runs with a tripled timeout (§4.1).

## 6. Evidence
Raw output of every run was written to the session scratchpad (not committed): baseline and final
`npm test`, `npm run test:e2e`, both `npm run test:e2e:browsers` runs (before: 38 passed, 1 failed,
1 skipped; after: 39 passed, 1 skipped), the WebKit trace of the failure, and the diagnostic probes
(typing timing, plain-HTTP origin, dark-scheme and forced-colours swatches). The temporary diagnostic
specs in `e2e/` were deleted after use.

## 7. Files changed for issue #25
| File | Change |
|---|---|
| `playwright.config.cjs` | `webkit` project (Desktop Safari device) and its note |
| `scripts/e2e-browsers.js` | `webkit` in the default browser list |
| `e2e/whiteboard.spec.cjs` | `test.slow()` for WebKit in TC-001 to TC-004 only (§4.1) |
| `client/src/board/Canvas.jsx` | redraw only when the canvas content changes (§4.1) |
| `docs/evidence/2026-10-31-cross-browser/RESULTS.md` | this record |
