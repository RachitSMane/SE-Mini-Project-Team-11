// Browser end-to-end tests of COMP-01 with COMP-02..09 (STP E2E level).
// Covers the UI parts of TC-001..TC-005, TC-009, TC-010, TC-013, TC-015..TC-018, TC-023, TC-103, TC-107.
const { expect, test } = require('@playwright/test');
const { addMember, apiCall, base, clickCanvas, createBoard, drag, expectSameState, exportState, openAs, registerUser, waitReady } = require('./helpers.cjs');

test('TC-015/TC-016: register, create and open a board, log out', async ({ page }) => {
  const email = `ui_${Date.now()}@example.test`;
  await page.goto(`${base()}/register`);
  await page.getByLabel('Display name (1–30 characters)').fill('Rachit');
  await page.getByLabel('E-mail address').fill(email);
  await page.getByLabel('Password (8–72 characters)').fill('correct-horse-1');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: 'My boards' })).toBeVisible();

  await page.getByLabel('New board title').fill('Sprint planning');
  await page.getByRole('button', { name: 'Create board' }).click();
  await waitReady(page);
  await expect(page.getByTestId('role-badge')).toHaveText('Owner');
  await page.getByRole('link', { name: '← Boards' }).click();
  await expect(page.getByTestId('board-row')).toHaveCount(1);
  await expect(page.getByTestId('board-row')).toContainText('Owner');

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(`${base()}/`);
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-mail address').fill(email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid e-mail or password.');
  await page.getByLabel('Password').fill('correct-horse-1');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'My boards' })).toBeVisible();
});

test('TC-001 to TC-004: pen, shapes, text, select/move/restyle/delete and eraser synchronise', async ({ browser }) => {
  const O = await registerUser('Owner');
  const E = await registerUser('Editor');
  const boardId = await createBoard(O);
  await addMember(O, boardId, E, 'editor');
  const pO = await openAs(browser, O, `/boards/${boardId}`);
  const pE = await openAs(browser, E, `/boards/${boardId}`);
  await waitReady(pO);
  await waitReady(pE);

  // TC-001: colour #D32F2F, width 8, freehand stroke.
  await pE.getByRole('button', { name: 'Colour #D32F2F' }).click();
  await pE.getByTestId('stroke-width').fill('8');
  await drag(pE, { x: 100, y: 100 }, { x: 300, y: 180 });
  let state = await expectSameState(pE, pO, 1);
  const s = state.objects[0];
  expect(s).toMatchObject({ kind: 'stroke', color: '#D32F2F', strokeWidth: 8 });
  expect(s.points.length).toBeGreaterThan(5);
  expect(Math.abs(s.points[0][0] - 100)).toBeLessThan(2);
  // Widths 0 and 21 are not accepted by the control.
  for (const bad of ['0', '21']) {
    await pE.getByTestId('stroke-width').fill(bad);
    await expect(pE.getByTestId('stroke-width')).toHaveAttribute('aria-invalid', 'true');
  }
  await pE.getByTestId('stroke-width').fill('20');
  await drag(pE, { x: 100, y: 400 }, { x: 160, y: 420 });
  state = await expectSameState(pE, pO, 2);
  expect(state.objects.map((o) => o.strokeWidth).sort()).toEqual([20, 8]);
  await pE.getByTestId('stroke-width').fill('3');

  // TC-002: rectangle, ellipse, line from drags; text.
  await pE.getByTestId('tool-rect').click();
  await drag(pE, { x: 400, y: 100 }, { x: 500, y: 180 });
  await pE.getByTestId('tool-ellipse').click();
  await drag(pE, { x: 520, y: 100 }, { x: 600, y: 160 });
  await pE.getByTestId('tool-line').click();
  await drag(pE, { x: 400, y: 250 }, { x: 600, y: 300 });
  await pE.getByTestId('tool-text').click();
  await clickCanvas(pE, { x: 100, y: 250 });
  await pE.getByTestId('text-input').fill('Sprint plan');
  await pE.getByTestId('text-input').press('Enter');
  state = await expectSameState(pE, pO, 6);
  const byKind = (k) => state.objects.find((o) => o.kind === k);
  const near = (a, b) => Math.abs(a - b) <= 1;
  const r = byKind('rect');
  expect(near(r.x, 400) && near(r.y, 100) && near(r.w, 100) && near(r.h, 80)).toBe(true);
  expect(near(byKind('ellipse').w, 80)).toBe(true);
  const l = byKind('line');
  expect(near(l.x1, 400) && near(l.y2, 300)).toBe(true);
  expect(byKind('text').text).toBe('Sprint plan');
  const t = byKind('text');

  // TC-002 step 2: edit the text (double-click with Select) to "Sprint plan v2".
  await pE.getByTestId('tool-select').click();
  await pE.getByTestId('board-canvas').dblclick({ position: { x: 110, y: 258 } });
  await pE.getByTestId('text-input').fill('Sprint plan v2');
  await pE.getByTestId('text-input').press('Enter');
  await expect.poll(async () => (await exportState(pO)).objects.find((o) => o.id === t.id)?.text).toBe('Sprint plan v2');
  // TC-002 step 3: 500 characters are accepted, the 501st is not (typed as real key presses).
  await pE.getByTestId('tool-text').click();
  await clickCanvas(pE, { x: 100, y: 520 });
  await pE.getByTestId('text-input').pressSequentially('x'.repeat(501));
  await expect(pE.getByTestId('text-input')).toHaveValue('x'.repeat(500));
  await pE.getByTestId('text-input').press('Enter');
  state = await expectSameState(pE, pO, 7);
  expect(state.objects.find((o) => o.kind === 'text' && o.text.length === 500)).toBeTruthy();

  // TC-003: select, move 100 px right, restyle, delete.
  await pE.getByTestId('tool-select').click();
  await drag(pE, { x: 450, y: 140 }, { x: 550, y: 140 });
  await expect.poll(async () => (await exportState(pO)).objects.find((o) => o.id === r.id)?.x).toBeCloseTo(r.x + 100, 0);
  await pE.getByRole('button', { name: 'Colour #43A047' }).click();
  await pE.getByTestId('stroke-width').fill('4');
  await expect.poll(async () => (await exportState(pO)).objects.find((o) => o.id === r.id)).toMatchObject({ color: '#43A047', strokeWidth: 4 });
  await clickCanvas(pE, { x: 550, y: 175 }); // select the moved rectangle below the ellipse (focus leaves the width field)
  await pE.keyboard.press('Delete');
  state = await expectSameState(pE, pO, 6);
  expect(state.objects.some((o) => o.id === r.id)).toBe(false);

  // TC-004: the eraser path crosses stroke S1 and text T; stroke S2 (width 20) is not on the path.
  const s2 = state.objects.find((o) => o.kind === 'stroke' && o.strokeWidth === 20);
  await pE.getByTestId('tool-eraser').click();
  await drag(pE, { x: 150, y: 60 }, { x: 150, y: 268 });
  state = await expectSameState(pE, pO, 4);
  expect(state.objects.some((o) => o.id === s.id)).toBe(false);
  expect(state.objects.some((o) => o.id === t.id)).toBe(false);
  expect(state.objects.find((o) => o.id === s2.id)).toEqual(s2);
  expect(pE.dialogs.concat(pO.dialogs)).toEqual([]);
});

test('TC-017/TC-103: share link, guest join with presence, Viewer UI, revocation', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O);
  const pO = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(pO);
  await pO.getByRole('button', { name: 'Share' }).click();
  await pO.getByLabel('Role').selectOption('viewer');
  await pO.getByRole('button', { name: 'Create link' }).click();
  const url = await pO.getByTestId('share-url').inputValue();
  expect(url).toMatch(/\/join#[A-Za-z0-9_-]{43}$/);
  await expect(pO.getByTestId('links').locator('tbody tr')).toHaveCount(1);
  await pO.getByRole('button', { name: 'Close' }).last().click();

  const pG = await openAs(browser, null, url.replace(base(), ''));
  await expect(pG).toHaveURL(/\/join$/); // token removed from the address bar
  await pG.getByRole('button', { name: 'Join as guest' }).click();
  await expect(pG.getByRole('alert')).toContainText('display name');
  await pG.getByLabel('Your display name (1–30 characters)').fill('Asha');
  await pG.getByRole('button', { name: 'Join as guest' }).click();
  await waitReady(pG);
  await expect(pG.getByTestId('role-badge')).toHaveText('View only');
  await expect(pG.getByTestId('tool-pen')).toHaveCount(0); // no drawing tools for Viewers
  await expect(pO.getByTestId('participants')).toContainText('Asha (guest)');

  // Revocation ends the guest's access with a notice (FR-047).
  await pO.getByRole('button', { name: 'Share' }).click();
  await pO.getByTestId('links').getByRole('button', { name: 'Revoke' }).click();
  await pO.getByTestId('confirm').click();
  await expect(pG.getByTestId('ended')).toHaveText('The share link you joined with was revoked.', { timeout: 5000 });
  await expect(pO.getByTestId('participants')).not.toContainText('Asha');
});

test('TC-107/TC-010: markup is drawn as plain text; a rejected change is rolled back with a message', async ({ browser }) => {
  const O = await registerUser('Owner');
  const E = await registerUser('Editor');
  const boardId = await createBoard(O);
  await addMember(O, boardId, E, 'editor');
  const pO = await openAs(browser, O, `/boards/${boardId}`);
  const pE = await openAs(browser, E, `/boards/${boardId}`);
  await waitReady(pO);
  await waitReady(pE);
  const markup = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  await pE.getByTestId('tool-text').click();
  await clickCanvas(pE, { x: 120, y: 120 });
  await pE.getByTestId('text-input').fill(markup);
  await pE.getByTestId('text-input').press('Enter');
  const state = await expectSameState(pE, pO, 1);
  expect(state.objects[0].text).toBe(markup);
  await pO.waitForTimeout(300);
  expect(pO.dialogs.concat(pE.dialogs)).toEqual([]);
  expect(await pO.locator('img').count()).toBe(0);

  const bad = { id: 'bad-rect', kind: 'rect', x: 10, y: 10, w: 50, h: 50, color: '#000000', strokeWidth: 50 };
  await pE.evaluate((op) => window.__wbTest.submitRaw(op), { type: 'object:add', payload: bad });
  await expect(pE.getByTestId('toast-error')).toBeVisible();
  await expect.poll(async () => (await exportState(pE)).objects.length).toBe(1);
  expect((await exportState(pO)).objects.some((o) => o.id === 'bad-rect')).toBe(false);
});

test('TC-005/TC-013/TC-023/TC-018: clear, restore, role change and ownership transfer without reload', async ({ browser }) => {
  const O = await registerUser('Owner');
  const E = await registerUser('Editor');
  const boardId = await createBoard(O);
  await addMember(O, boardId, E, 'editor');
  const pO = await openAs(browser, O, `/boards/${boardId}`);
  const pE = await openAs(browser, E, `/boards/${boardId}`);
  await waitReady(pO);
  await waitReady(pE);
  await expect(pE.getByTestId('clear-board')).toHaveCount(0); // Editors have no Clear, Share
  await expect(pE.getByRole('button', { name: 'Share' })).toHaveCount(0);
  await pE.getByTestId('tool-rect').click();
  await drag(pE, { x: 100, y: 100 }, { x: 200, y: 200 });
  await drag(pE, { x: 300, y: 100 }, { x: 400, y: 200 });
  const before = await expectSameState(pE, pO, 2);

  // Clear with confirmation; cancelling changes nothing.
  await pO.getByTestId('clear-board').click();
  await pO.getByRole('button', { name: 'Cancel' }).click();
  expect((await exportState(pO)).objects).toHaveLength(2);
  await pO.getByTestId('clear-board').click();
  await pO.getByTestId('confirm').click();
  await expectSameState(pO, pE, 0);

  // History: the before-clear version, preview, restore.
  await pO.getByRole('tab', { name: 'History' }).click();
  await pO.getByTestId('versions').getByRole('button', { name: /Before clear/ }).click();
  await expect(pO.getByTestId('preview-canvas')).toBeVisible();
  await pO.getByRole('button', { name: 'Restore this version…' }).click();
  await pO.getByTestId('confirm').click();
  const restored = await expectSameState(pO, pE, 2);
  expect(restored.objects).toEqual(before.objects);
  await expect(pE.getByTestId('toast-info').filter({ hasText: 'restored version 1' })).toBeVisible();
  await expect(pO.getByTestId('versions')).toContainText('Restore of version 1');

  // TC-023: Editor -> Viewer -> Editor without reload.
  await pO.getByRole('button', { name: 'Members' }).click();
  await pO.getByLabel(`Role of ${E.displayName}`).selectOption('viewer');
  await expect(pE.getByTestId('role-badge')).toHaveText('View only');
  await expect(pE.getByTestId('tool-pen')).toHaveCount(0);
  await pO.getByLabel(`Role of ${E.displayName}`).selectOption('editor');
  await expect(pE.getByTestId('role-badge')).toHaveText('Editor');

  // TC-018: transfer ownership to E after confirmation.
  await pO.getByRole('button', { name: 'Make Owner' }).click();
  await expect(pO.getByRole('dialog', { name: 'Transfer ownership?' })).toContainText('You become an Editor');
  await pO.getByTestId('confirm').click();
  await expect(pE.getByTestId('role-badge')).toHaveText('Owner');
  await expect(pO.getByTestId('role-badge')).toHaveText('Editor');
  await expect(pE.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect(pO.getByTestId('clear-board')).toHaveCount(0);
  const list = await apiCall('GET', '/boards', O.token);
  expect(list.body.find((b) => b.id === boardId).role).toBe('editor');
});

test('TC-009: offline indicator, disabled tools and resynchronisation after reconnect', async ({ browser }, testInfo) => {
  // Verified 12-10-2026: Playwright's Firefox setOffline() blocks fetch but not an open WebSocket, so
  // no outage can be simulated there. Heartbeat detection itself is tested in sync.test.js.
  test.skip(testInfo.project.name === 'firefox', 'Playwright Firefox offline emulation does not cut open WebSockets');
  const O = await registerUser('Owner');
  const E = await registerUser('Editor');
  const boardId = await createBoard(O);
  await addMember(O, boardId, E, 'editor');
  const pO = await openAs(browser, O, `/boards/${boardId}`);
  const pE = await openAs(browser, E, `/boards/${boardId}`);
  await waitReady(pO);
  await waitReady(pE);

  await pE.context().setOffline(true);
  // Detection: immediate where the browser closes sockets when offline (Chromium); otherwise the
  // Socket.IO heartbeat (10 s + 10 s) detects the outage, inside the 30 s outage of TC-009.
  await expect(pE.getByTestId('disconnected-banner')).toBeVisible({ timeout: 25000 });
  await expect(pE.getByTestId('tool-pen')).toBeDisabled();
  await pO.getByTestId('tool-rect').click();
  for (let i = 0; i < 5; i += 1) await drag(pO, { x: 50 + i * 60, y: 50 }, { x: 90 + i * 60, y: 90 });
  await expect.poll(async () => (await exportState(pO)).objects.length).toBe(5);

  const t0 = Date.now();
  await pE.context().setOffline(false);
  await waitReady(pE);
  const recoveryMs = Date.now() - t0;
  await expectSameState(pO, pE, 5);
  expect(recoveryMs).toBeLessThan(5000); // NFR-004 target (single run here; TC-009 repeats 10 times)
});

test('TC-017 step 3 / TC-016 step 3: member joins through a link after logging in; dashboard delete notifies them', async ({ browser }) => {
  const O = await registerUser('Owner');
  const R = await registerUser('Member');
  const boardId = await createBoard(O, 'Shared board');
  const link = await apiCall('POST', `/boards/${boardId}/links`, O.token, { role: 'editor', expiresIn: '24h' });

  // R is not logged in in this browser: link -> "log in to join" -> login -> member of the board.
  const pR = await openAs(browser, null, link.body.url.replace(base(), ''));
  await pR.getByRole('button', { name: 'Log in to join as a member' }).click();
  await pR.getByLabel('E-mail address').fill(R.email);
  await pR.getByLabel('Password').fill(R.password);
  await pR.getByRole('button', { name: 'Log in' }).click();
  await expect(pR).toHaveURL(new RegExp(`/boards/${boardId}$`));
  await waitReady(pR);
  await expect(pR.getByTestId('role-badge')).toHaveText('Editor');
  const members = await apiCall('GET', `/boards/${boardId}/members`, O.token);
  expect(members.body.map((m) => [m.userId, m.role])).toContainEqual([R.id, 'editor']);

  // The Owner deletes the board from the dashboard after confirming.
  const pO = await openAs(browser, O, '/');
  await pO.getByTestId('board-row').filter({ hasText: 'Shared board' }).getByRole('button', { name: 'Delete' }).click();
  await expect(pO.getByRole('dialog', { name: 'Delete board?' })).toContainText('cannot be undone');
  await pO.getByTestId('confirm').click();
  await expect(pO.getByTestId('board-row')).toHaveCount(0);
  await expect(pR.getByTestId('ended')).toHaveText('This board was deleted by its Owner.', { timeout: 5000 });
  await pR.getByRole('link', { name: 'Back to my boards' }).click();
  await expect(pR.getByText('You have no boards yet')).toBeVisible();
});

test('SAD §3.9.2 regression: an expired guest token returns the guest to the entry page; the link renews access', async ({ browser }) => {
  const jwt = require('jsonwebtoken');
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Guest renewal');
  const link = await apiCall('POST', `/boards/${boardId}/links`, O.token, { role: 'viewer', expiresIn: '24h' });
  const linkToken = link.body.url.split('#')[1];
  const resolved = await apiCall('POST', '/links/resolve', null, { token: linkToken, displayName: 'Gita' });
  // Same claims, but the guest token ends in 4 s while the link stays valid for 24 h.
  const { exp: _exp, ...claims } = jwt.decode(resolved.body.guestToken);
  const exp = Math.floor(Date.now() / 1000) + 4;
  const shortToken = jwt.sign({ ...claims, exp }, process.env.E2E_JWT_SECRET, { algorithm: 'HS256' });

  const context = await browser.newContext({ baseURL: base(), viewport: { width: 1280, height: 720 } });
  await context.addInitScript(
    ([key, value]) => {
      if (!window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, value);
    },
    [`wb.guest.${boardId}`, JSON.stringify({ token: shortToken, expiresAt: new Date(exp * 1000).toISOString(), role: 'viewer', displayName: 'Gita', linkToken })],
  );
  const page = await context.newPage();
  await page.goto(`/boards/${boardId}`);
  await waitReady(page);
  await expect(page.getByTestId('role-badge')).toHaveText('View only');

  // After expiry: guest entry page with an explanation (not a dead "reconnecting" board).
  await expect(page.getByTestId('guest-expired')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/join$/);
  await page.getByLabel('Your display name (1–30 characters)').fill('Gita');
  await page.getByRole('button', { name: 'Join as guest' }).click();
  await waitReady(page);
  const renewed = await page.evaluate((k) => JSON.parse(window.sessionStorage.getItem(k)), `wb.guest.${boardId}`);
  expect(Date.parse(renewed.expiresAt)).toBeGreaterThan(Date.now() + 3600_000);
  // The pending join was cleared: nothing would redirect a later login to /join.
  expect(await page.evaluate(() => window.sessionStorage.getItem('wb.pendingJoin'))).toBeNull();

  // Control: a revoked link still ends access with its notice instead of the entry page.
  const linkId = link.body.linkId;
  expect((await apiCall('DELETE', `/boards/${boardId}/links/${linkId}`, O.token)).status).toBe(204);
  await expect(page.getByTestId('ended')).toHaveText('The share link you joined with was revoked.', { timeout: 5000 });
});

test('TC-009 repetition: a change whose acknowledgement is lost is resolved by resync with the notice', async ({ browser }) => {
  const O = await registerUser('Owner');
  const E = await registerUser('Editor');
  const boardId = await createBoard(O);
  await addMember(O, boardId, E, 'editor');
  const pO = await openAs(browser, O, `/boards/${boardId}`);

  // E's WebSocket runs through a route that can drop Socket.IO acknowledgements ("43/board,…").
  const context = await browser.newContext({ baseURL: base(), viewport: { width: 1280, height: 720 } });
  await context.addInitScript((s) => window.localStorage.setItem('wb.session', JSON.stringify(s)), E.session);
  const pE = await context.newPage();
  let dropAcks = false;
  let route = null;
  await pE.routeWebSocket(/\/socket\.io\//, (ws) => {
    route = ws;
    const server = ws.connectToServer();
    ws.onMessage((m) => server.send(m));
    server.onMessage((m) => {
      if (dropAcks && typeof m === 'string' && m.startsWith('43/board,')) return;
      ws.send(m);
    });
  });
  await pE.goto(`/boards/${boardId}`);
  await waitReady(pO);
  await waitReady(pE);

  dropAcks = true;
  await pE.getByTestId('tool-rect').click();
  await drag(pE, { x: 100, y: 100 }, { x: 200, y: 160 });
  await expect.poll(async () => (await exportState(pO)).objects.length).toBe(1); // the server stored it
  const pending = await pE.evaluate(() => window.__wbTest.exportState().objects.length);
  expect(pending).toBe(0); // not confirmed at E: the acknowledgement never arrived

  // Connection lost before the acknowledgement: reconnect, resync, pending discarded with a notice.
  dropAcks = false;
  await route.close();
  await expect(pE.getByTestId('toast-warning')).toContainText('unconfirmed changes', { timeout: 15000 });
  await waitReady(pE);
  await expectSameState(pO, pE, 1); // the stroke stays because the server had stored it
});
