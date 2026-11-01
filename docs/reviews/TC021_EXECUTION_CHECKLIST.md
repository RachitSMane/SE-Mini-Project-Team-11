# TC-021 manual execution checklist (stable Firefox)

Prepared 14-10-2026. **Not executed.** TC-021 stays **Blocked** until a team member runs it and records
the results. Nothing below is a result.

> **Execution note (added 17-10-2026):**
> - This checklist was executed on 17-10-2026: manual in installed Firefox 158 and Chrome, automated in
>   Chrome and Edge.
> - Result: **Pass with limitations**, confirmed by the team after a two-member review.
> - Results, evidence, deviations and the accepted limitations are in
>   `docs/evidence/2026-10-17-tc021-firefox/RESULTS.md`.
> - The text below is the original pre-execution checklist, unchanged.

Definition: STP Appendix A.1, "TC-021 — Browser compatibility, viewport and usability checklist"
(`docs/working/stp/tc-functional-nfr.md`); requirements NFR-006, NFR-007; type "Compatibility +
usability, **manual**".

## 0. What already exists (not repeated here)
- Session 1 (12-10-2026): automated E2E suite and the automated checklist `e2e/usability.spec.cjs` in
  Chrome 154, Edge 155 and Playwright's Firefox 134 build: 29 passed, 1 skipped.
  - The skipped test is TC-009 in Playwright Firefox, because offline emulation does not cut open
    WebSockets there.
  - Evidence: screenshots in `test-results/usability-TC-021-…-{chrome,msedge,firefox}/` (Owner and
    Editor only; the test takes no Viewer screenshot), and `test-results/.last-run.json` = `passed`.
    Console logs were not retained.
- **Stable Mozilla Firefox was not installed** on the test machine (re-checked 14-10-2026: no
  `firefox.exe` in Program Files, no `HKLM\SOFTWARE\Mozilla\Mozilla Firefox` registry key).

- **Update 15-10-2026 (sessions 7–8, automated only, not the manual check):** the automated suite and
  `e2e/usability.spec.cjs` passed again in installed Chrome 155.0.8059.41 and Edge 155.0.4283.45 and in
  Playwright's Firefox build (29 passed, 1 skipped — the same TC-009 skip). Reference screenshots of the
  Owner, Editor **and Viewer** board views at 1280 × 720 in all three browsers were captured with a
  scratch script outside the repository (`C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\screenshots\tc021\`;
  Viewer: "View only" badge, "Connected", no drawing tools). Stable Mozilla Firefox is still not
  installed (re-checked 15-10-2026). No human usability judgement has been made.

- **Update 16-10-2026 (session 10, automated only, not the manual check):** stable Mozilla Firefox
  157.0.1 (release channel, Mozilla signature valid) was **extracted, not installed** (official installer,
  `/ExtractDir`; installing needs administrator approval) and driven by Playwright's experimental WebDriver
  BiDi driver. E2E: 8 passed, 2 failed — both driver limitations confirmed by a probe without application
  code (no `dblclick` synthesised; `setOffline()` has no effect). TC-001 to TC-004 passed in full with the
  double-click dispatched as a DOM event; `e2e/usability.spec.cjs` passed; Owner, Editor and Viewer
  screenshots `stable-firefox-*-1280x720.png` in the same screenshots folder. TC-009 not verified in stable
  Firefox. Logs: `C:\Users\Lenovo\Downloads\SE_MINI_PROJECT_OUTPUT\logs\2026-10-16-session10\`. The
  manual checklist below still has to be run by a team member, preferably in an installed Firefox.

### Known limitations of Playwright's Firefox
- It is a patched build shipped with Playwright, not the stable Mozilla release that NFR-006 requires
  (`playwright.config.cjs`: "supplementary evidence only").
- The project's Playwright setup runs only that build (project `firefox` uses
  `devices['Desktop Firefox']` with no stable-Firefox channel), so stable Firefox is checked by hand.
- `setOffline()` does not cut open WebSockets there, so TC-009 was skipped in that browser.

## 1. Prerequisites (team action, report before installing)
- [ ] A team member installs the **current stable** Mozilla Firefox from mozilla.org on the test
      machine. Do not use beta, Nightly or ESR unless the team decides otherwise. This is a software
      installation: agree it first.
- [ ] Record the exact version (Menu → Help → About Firefox): `Firefox ____ (64-bit)`.
- [ ] Record the build under test: Git commit hash if committed, otherwise "uncommitted working tree on
      base 82af885" plus the date. (STP §13 requires a commit; prefer running after the commit.)
- [ ] **Decision needed before starting:** does the session-1 automated Chrome/Edge evidence satisfy
      this *manual* test, or must Chrome and Edge also be checked by hand with this sheet? (The
      recording table in §5 has columns for all three.)

## 2. Environment
- Local application, as in `README.md` → "Run locally":
  1. `npm install` (already done on the test machine);
  2. `server/.env` from `server/.env.example` with real random secrets of ≥ 32 characters;
  3. `npm run db:start` (skip if a MongoDB service already listens on 27017);
  4. `npm run dev` → `http://localhost:5173`.
- Test accounts only (no real personal data): Owner **O**, Editor **E**, Viewer **V**, a registered
  non-member **R**, and one not-logged-in browser for the guest.
- Several users at once: use separate Firefox profiles or private windows (`about:profiles`), so each
  has its own session. Chrome/Edge windows may serve as the *other* participants. The role being
  checked must be in stable Firefox.
- Optional, for an exact comparison in TC-001 step 3: `window.__wbTest.exportState()` exists only in
  the **test build** (`npm run build:test`, served by the server with `CLIENT_DIST`). It does not exist
  under `npm run dev`. Otherwise compare the boards visually and say so in the record.

## 3. Viewport
- 1280 × 720 CSS pixels (NFR-006 minimum). Set it with Responsive Design Mode (Ctrl+Shift+M → 1280 ×
  720, DPR 1) **or** by sizing the window so the page area is 1280 × 720.
- Record the method used. Browser zoom must stay at 100 %.

## 4. Steps

### 4.1 Core flows (STP TC-021 step 1), each in stable Firefox at 1280 × 720
| Flow | What to do (from the STP records) | Expected |
|---|---|---|
| TC-001 | E selects colour `#D32F2F`, width 8, draws a stroke; compare with O's board; E draws with widths 1 and 20; E tries widths 0 and 21 | identical stroke on both boards; widths 1 and 20 accepted; 0 and 21 not accepted by the control |
| TC-002 | E drags rectangle, ellipse, line; adds text "Sprint plan", edits it to "Sprint plan v2"; enters 500 characters, then tries 501 | shapes match the drags; text appears and updates on both boards; 500 accepted, the 501st not |
| TC-013 step 1 | O selects an earlier version n, confirms Restore; check the board and the version list | everyone sees version n's content without reload; the list keeps all previous versions plus a new "restore of n" |
| TC-017 | O creates an Editor link (24 h) and a Viewer link (default); R opens the Editor link; the not-logged-in browser opens the Viewer link, tries names of 0 and 31 characters, joins as "Asha"; Asha leaves | links listed with role and expiry (default 7 days), full URL only at creation; R can draw; invalid names rejected; "Asha (guest)" in every participant list, Viewer rights, no tools; lists update when Asha leaves |

TC-013 step 1 needs a board with at least two versions. Draw, wait for or trigger versions, change the
content. Steps 2–5 of TC-013 (timing) are not part of TC-021.

### 4.2 Layout (STP step 2), for each role
- [ ] No control is cut off at the right or left edge.
- [ ] No horizontal scroll bar (page width ≤ 1280).

### 4.3 Checklist (STP step 3), for each role O, E, V
- [ ] Role badge visible as text: "Owner" / "Editor" / "View only".
- [ ] Connection status visible as text (e.g. "Connected"), not by colour alone.
- [ ] O and E: all drawing tools are directly on the toolbar (select, pen, eraser, rect, ellipse,
      line, text), with no nested menus. V: no drawing tools.
- [ ] Every toolbar control has visible text or a tooltip (hover each one).
- [ ] Keyboard: from the first control of the top bar, **Tab** reaches every toolbar control in order.
      **Enter** and **Space** each activate a tool button (the pressed state changes). A colour swatch
      can be selected with Enter. *(Extra observation, not an STP criterion: note whether the focus
      outline is visible.)*
- [ ] Not a formal accessibility audit (STP limitation).

## 5. Evidence and recording

Folder: `docs/evidence/<YYYY-MM-DD>-tc021-firefox/` (new folder; never overwrite `test-results/`).

| File | Content |
|---|---|
| `00-about-firefox.png` | About dialog with the exact version |
| `01-viewport-1280x720.png` | Responsive Design Mode / window showing 1280 × 720 |
| `TC021-FF-owner-board.png`, `TC021-FF-editor-board.png`, `TC021-FF-viewer-board.png` | full board view per role |
| `TC021-FF-<role>-tooltip-<control>.png` | one example tooltip per role (O, E) |
| `TC021-FF-tc001.png`, `-tc002.png`, `-tc013.png`, `-tc017.png` | end state of each core flow |
| `RESULTS.md` | the table below, filled in, with tester name, date, Firefox version, build, environment |

| Item | Firefox (stable) | Chrome (if required) | Edge (if required) | Notes |
|---|---|---|---|---|
| TC-001 flow | Pass / Fail | | | |
| TC-002 flow | Pass / Fail | | | |
| TC-013 step 1 | Pass / Fail | | | |
| TC-017 flow | Pass / Fail | | | |
| No cut-off / no horizontal scroll — O / E / V | | | | |
| Role badge — O / E / V | | | | |
| Connection status — O / E / V | | | | |
| Tools on toolbar — O / E (V: none) | | | | |
| Labels/tooltips — O / E / V | | | | |
| Tab reach — O / E | | | | |
| Enter / Space activation — O / E | | | | |

**Pass** only if every flow and every item passes (STP pass/fail criteria). Any failure: record it with
a screenshot and open a defect. Do not change the status.

## 6. After execution (team)
- [ ] Two members check `RESULTS.md` and the screenshots.
- [ ] The team decides the TC-021 status; only then are the STP record, the RTM (NFR-006, NFR-007) and
      IMPLEMENTATION_STATUS updated, followed by document regeneration.
