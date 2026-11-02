// Issue #10 E2E workflows for board management (issue #13) and board export (issue #16), against
// the real server and database: create and rename from the dashboard, live title update, content
// persisting across a page reload, invalid board addresses, PNG export (file, size and pixels
// checked), empty-board export and export by a Viewer guest.
const fs = require('node:fs');
const { expect, test } = require('@playwright/test');
const { apiCall, base, clickCanvas, createBoard, drag, exportState, openAs, registerUser, waitReady } = require('./helpers.cjs');

/** Width and height from the IHDR chunk of a PNG file; throws if the file is not a PNG. */
function pngSize(buf) {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** RGB of image pixels, decoded by the browser from the downloaded file. */
function pixelsOf(page, buf, points) {
  return page.evaluate(
    async ({ src, pts }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return pts.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3)));
    },
    { src: `data:image/png;base64,${buf.toString('base64')}`, pts: points },
  );
}

const RED = [211, 47, 47]; // #D32F2F
const WHITE = [255, 255, 255];
const near = (a, b, tol = 40) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

test('issue #13: create, rename (with validation) and reopen a board from the dashboard; open views follow the rename', async ({ browser }) => {
  const O = await registerUser('Owner');
  const E = await registerUser('Editor');
  const pO = await openAs(browser, O, '/');
  await expect(pO.getByRole('heading', { name: 'My boards' })).toBeVisible();

  // Create with an empty title is refused in the UI; a valid title creates and opens the board.
  await pO.getByRole('button', { name: 'Create board' }).click();
  await expect(pO.getByRole('alert')).toContainText('1–100 characters');
  await pO.getByLabel('New board title').fill('Retro draft');
  await pO.getByRole('button', { name: 'Create board' }).click();
  await waitReady(pO);
  const boardId = pO.url().split('/boards/')[1];
  await expect(pO.getByRole('heading', { name: 'Retro draft' })).toBeVisible();

  // An Editor has the board open while the Owner renames it.
  const link = await apiCall('POST', `/boards/${boardId}/links`, O.token, { role: 'editor' });
  expect((await apiCall('POST', '/links/resolve', E.token, { token: link.body.url.split('#')[1] })).status).toBe(200);
  const pE = await openAs(browser, E, `/boards/${boardId}`);
  await waitReady(pE);
  await expect(pE.getByRole('heading', { name: 'Retro draft' })).toBeVisible();

  await pO.getByRole('link', { name: '← Boards' }).click();
  const row = pO.getByTestId('board-row').filter({ hasText: 'Retro draft' });
  await row.getByRole('button', { name: 'Rename' }).click();
  const dialog = pO.getByRole('dialog', { name: 'Rename board' });
  await dialog.getByLabel('Board title').fill('   ');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByRole('alert')).toContainText('1–100 characters');
  await dialog.getByLabel('Board title').fill('Sprint 4 retrospective');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(pO.getByTestId('board-row')).toHaveCount(1);
  await expect(pO.getByTestId('board-row')).toContainText('Sprint 4 retrospective');

  await expect(pE.getByRole('heading', { name: 'Sprint 4 retrospective' })).toBeVisible(); // no reload
  // The Editor has no rename or delete controls on the dashboard.
  await pE.getByRole('link', { name: '← Boards' }).click();
  await expect(pE.getByTestId('board-row')).toContainText('Editor');
  await expect(pE.getByRole('button', { name: 'Rename' })).toHaveCount(0);
  await expect(pE.getByRole('button', { name: 'Delete' })).toHaveCount(0);

  // The rename persists: a reload of the dashboard and the board page show the new title.
  await pO.reload();
  await expect(pO.getByTestId('board-row')).toContainText('Sprint 4 retrospective');
  await pO.getByRole('link', { name: 'Sprint 4 retrospective' }).click();
  await waitReady(pO);
  await expect(pO.getByRole('heading', { name: 'Sprint 4 retrospective' })).toBeVisible();
});

test('issue #13: board content is saved and comes back after reloading the page', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Persistence');
  const page = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(page);
  await page.getByTestId('tool-rect').click();
  await drag(page, { x: 120, y: 120 }, { x: 260, y: 200 });
  await page.getByTestId('tool-text').click();
  await clickCanvas(page, { x: 120, y: 260 });
  await page.getByTestId('text-input').fill('Saved note');
  await page.getByTestId('text-input').press('Enter');
  await expect.poll(async () => (await exportState(page)).objects.length).toBe(2);
  const before = await exportState(page);

  await page.reload();
  await waitReady(page);
  expect(await exportState(page)).toEqual(before);
  // And in a completely new browser session.
  const fresh = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(fresh);
  expect(await exportState(fresh)).toEqual(before);
  expect(before.objects.map((o) => o.kind).sort()).toEqual(['rect', 'text']);
});

test('issue #13: invalid or inaccessible board addresses show a clear message instead of a broken page', async ({ browser }) => {
  const O = await registerUser('Owner');
  const X = await registerUser('Stranger');
  const boardId = await createBoard(O, 'Private');
  for (const path of ['/boards/0123456789abcdef01234567', '/boards/notAnId']) {
    const page = await openAs(browser, O, path);
    await expect(page.getByTestId('ended')).toHaveText('Board not found, or you do not have access to it.');
    await page.getByRole('link', { name: 'Back to my boards' }).click();
    await expect(page.getByRole('heading', { name: 'My boards' })).toBeVisible();
    await page.context().close();
  }
  // Someone without a role cannot tell the board exists.
  const pX = await openAs(browser, X, `/boards/${boardId}`);
  await expect(pX.getByTestId('ended')).toHaveText('Board not found, or you do not have access to it.');
  // A deleted board.
  expect((await apiCall('DELETE', `/boards/${boardId}`, O.token)).status).toBe(204);
  const pO = await openAs(browser, O, `/boards/${boardId}`);
  await expect(pO.getByTestId('ended')).toHaveText('Board not found, or you do not have access to it.');
});

test('issue #16: export downloads a PNG that shows the board content at its on-screen position', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Export: Q4 plan');
  const page = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(page);
  await page.getByRole('button', { name: 'Colour #D32F2F' }).click();
  await page.getByTestId('stroke-width').fill('6');
  await page.getByTestId('tool-rect').click();
  await drag(page, { x: 100, y: 100 }, { x: 300, y: 220 });
  await page.getByTestId('tool-text').click();
  await clickCanvas(page, { x: 400, y: 300 });
  await page.getByTestId('text-input').fill('Exported text');
  await page.getByTestId('text-input').press('Enter');
  await expect.poll(async () => (await exportState(page)).objects.length).toBe(2);
  const rect = (await exportState(page)).objects.find((o) => o.kind === 'rect');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-board').click()]);
  expect(download.suggestedFilename()).toMatch(/^export-q4-plan-\d{4}-\d{2}-\d{2}\.png$/);
  await expect(page.getByTestId('toast-info')).toContainText(`Board exported as ${download.suggestedFilename()}`);
  const buf = fs.readFileSync(await download.path());
  const size = pngSize(buf);
  // Starts at the board origin and contains everything (text at y = 300 plus its height, padding).
  expect(size.width).toBeGreaterThanOrEqual(400 + 50);
  expect(size.height).toBeGreaterThanOrEqual(300 + 20);
  const midY = Math.round(rect.y + rect.h / 2);
  const [leftEdge, inside, corner, rightEdge] = await pixelsOf(page, buf, [
    [Math.round(rect.x), midY],
    [Math.round(rect.x + rect.w / 2), midY],
    [5, 5],
    [Math.round(rect.x + rect.w), midY],
  ]);
  expect(near(leftEdge, RED)).toBe(true);
  expect(near(rightEdge, RED)).toBe(true);
  expect(inside).toEqual(WHITE); // outline only; white background, not transparent
  expect(corner).toEqual(WHITE);
  // Exporting changes nothing on the board.
  expect((await exportState(page)).objects).toHaveLength(2);
});

test('issue #16: an empty board is not exported; the user is told why', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Empty');
  const page = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(page);
  let downloads = 0;
  page.on('download', () => {
    downloads += 1;
  });
  await page.getByTestId('export-board').click();
  await expect(page.getByTestId('toast-warning')).toHaveText('This board is empty: there is nothing to export.');
  await page.waitForTimeout(500);
  expect(downloads).toBe(0);
});

test('issue #16: a Viewer guest can export; the button is disabled while disconnected', async ({ browser }, testInfo) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Shared view');
  const pO = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(pO);
  await pO.getByTestId('tool-rect').click();
  await drag(pO, { x: 50, y: 50 }, { x: 150, y: 150 });
  await expect.poll(async () => (await exportState(pO)).objects.length).toBe(1);

  const link = await apiCall('POST', `/boards/${boardId}/links`, O.token, { role: 'viewer' });
  const pG = await openAs(browser, null, link.body.url.replace(base(), ''));
  await pG.getByLabel('Your display name (1–30 characters)').fill('Visitor');
  await pG.getByRole('button', { name: 'Join as guest' }).click();
  await waitReady(pG);
  await expect(pG.getByTestId('role-badge')).toHaveText('View only');
  const [download] = await Promise.all([pG.waitForEvent('download'), pG.getByTestId('export-board').click()]);
  expect(pngSize(fs.readFileSync(await download.path())).width).toBeGreaterThanOrEqual(150);

  // Playwright's Firefox setOffline() rejects fetch but leaves the open WebSocket connected (measured
  // 02-11-2026: still "Connected" 31 s after going offline), so no outage can be produced there; the same
  // limitation as TC-009 in whiteboard.spec.cjs. The disconnected part runs in every other browser.
  if (testInfo.project.name === 'firefox') {
    testInfo.annotations.push({ type: 'limitation', description: 'offline emulation does not cut WebSockets in Playwright Firefox' });
    return;
  }
  await pG.context().setOffline(true);
  await expect(pG.getByTestId('disconnected-banner')).toBeVisible({ timeout: 25000 });
  await expect(pG.getByTestId('export-board')).toBeDisabled();
  await pG.context().setOffline(false);
  await waitReady(pG);
  await expect(pG.getByTestId('export-board')).toBeEnabled();
});
