// Issue #26: release smoke test. One complete workflow through the UI — register, create a board,
// draw, share, guest join, live sync, export, clear, restore — while recording every console error,
// uncaught page error, failed request and HTTP error response in both browsers. The workflow must
// finish with none of them.
const { expect, test } = require('@playwright/test');
const { apiCall, base, drag, expectSameState, exportState, waitReady } = require('./helpers.cjs');

function watch(page, label, problems) {
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`${label} console error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`${label} page error: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`${label} request failed: ${r.method()} ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`${label} HTTP ${r.status()}: ${r.request().method()} ${r.url()}`);
  });
}

test('issue #26: release smoke — full workflow without console errors or failed requests', async ({ browser }) => {
  test.setTimeout(120_000);
  const problems = [];
  const ownerCtx = await browser.newContext({ baseURL: base(), viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const owner = await ownerCtx.newPage();
  watch(owner, 'owner', problems);

  // Register through the UI and create a board from the dashboard.
  const email = `smoke_${Date.now()}@example.test`;
  await owner.goto('/register');
  await owner.getByLabel(/Display name/).fill('Smoke Owner');
  await owner.getByLabel('E-mail address').fill(email);
  await owner.getByLabel(/Password/).fill('smoke-password-1');
  await owner.getByRole('button', { name: 'Register' }).click();
  await expect(owner.getByRole('heading', { name: 'My boards' })).toBeVisible();
  await owner.getByLabel('New board title').fill('Release smoke');
  await owner.getByRole('button', { name: 'Create board' }).click();
  await expect(owner).toHaveURL(/\/boards\/[A-Za-z0-9]+$/);
  await waitReady(owner);
  const boardId = owner.url().split('/').pop();

  // Draw a rectangle and a pen stroke.
  await owner.getByTestId('tool-rect').click();
  await drag(owner, { x: 120, y: 120 }, { x: 260, y: 220 });
  await owner.getByTestId('tool-pen').click();
  await drag(owner, { x: 320, y: 140 }, { x: 460, y: 260 });
  await expect.poll(async () => (await exportState(owner)).objects.length).toBe(2);

  // Share an Editor link (UI dialog) and join as a guest in a second browser context.
  await owner.getByRole('button', { name: 'Share' }).click();
  await owner.locator('.modal select').first().selectOption('editor');
  await owner.locator('.modal').getByRole('button', { name: /Create link/ }).click();
  const url = await owner.getByTestId('share-url').inputValue();
  expect(url).toContain('/join#');
  await owner.keyboard.press('Escape');

  const guestCtx = await browser.newContext({ baseURL: base(), viewport: { width: 1280, height: 720 } });
  const guest = await guestCtx.newPage();
  watch(guest, 'guest', problems);
  await guest.goto(url.replace(/^https?:\/\/[^/]+/, ''));
  await guest.getByLabel(/Your display name/).fill('Smoke Guest');
  await guest.getByRole('button', { name: 'Join as guest' }).click();
  await waitReady(guest);
  await expectSameState(owner, guest, 2);

  // The guest Editor draws; the Owner sees it live.
  await guest.getByTestId('tool-ellipse').click();
  await drag(guest, { x: 500, y: 300 }, { x: 600, y: 380 });
  const three = await expectSameState(guest, owner, 3);

  // Export a PNG.
  const [download] = await Promise.all([owner.waitForEvent('download'), owner.getByTestId('export-board').click()]);
  expect(download.suggestedFilename()).toMatch(/^release-smoke-\d{4}-\d{2}-\d{2}\.png$/);

  // Clear, then restore the before-clear version; both clients follow.
  await owner.getByTestId('clear-board').click();
  await owner.getByTestId('confirm').click();
  await expectSameState(owner, guest, 0);
  await owner.getByRole('tab', { name: 'History' }).click();
  await owner.getByTestId('versions').getByRole('button', { name: /Before clear/ }).click();
  await owner.getByRole('button', { name: 'Restore this version…' }).click();
  await owner.getByTestId('confirm').click();
  const restored = await expectSameState(owner, guest, 3);
  expect(restored.objects).toEqual(three.objects);

  // The data is on the server too.
  const board = await apiCall('GET', `/boards/${boardId}`, (await owner.evaluate(() => JSON.parse(localStorage.getItem('wb.session')))).token);
  expect(board.status).toBe(200);

  expect(problems, problems.join('\n')).toEqual([]);
  await guestCtx.close();
  await ownerCtx.close();
});
