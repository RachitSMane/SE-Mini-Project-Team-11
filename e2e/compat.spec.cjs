// Issues #25/#26: browser-compatibility edge cases found in the cross-browser review.
// - Restoring a version where crypto.randomUUID() does not exist (plain HTTP from another device).
// - Windows high-contrast (forced colours): colour swatches keep their colours (finding G8).
// - Fractional device pixel ratio (125 % display scaling): sharp backing store, accurate drawing.
// - Pointer capture lost without an up event: the gesture ends instead of following the hover.
// - Multi-touch: a second finger neither replaces nor feeds the stroke in progress.
const { expect, test } = require('@playwright/test');
const { base, createBoard, drag, exportState, openAs, registerUser, waitReady } = require('./helpers.cjs');

async function openWith(browser, user, path, options) {
  const context = await browser.newContext({ baseURL: base(), viewport: { width: 1280, height: 720 }, ...options });
  await context.addInitScript((s) => window.localStorage.setItem('wb.session', JSON.stringify(s)), user.session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test('restore works where crypto.randomUUID() is unavailable (plain HTTP from another device)', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'No randomUUID');
  const context = await browser.newContext({ baseURL: base(), viewport: { width: 1280, height: 720 } });
  await context.addInitScript((s) => {
    window.localStorage.setItem('wb.session', JSON.stringify(s));
    // What a non-secure context (http://<LAN address>) looks like: no crypto.randomUUID.
    Object.defineProperty(Crypto.prototype, 'randomUUID', { value: undefined, configurable: true });
  }, O.session);
  const page = await context.newPage();
  await page.goto(`/boards/${boardId}`);
  await waitReady(page);
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe('undefined');

  await page.getByTestId('tool-rect').click();
  await drag(page, { x: 100, y: 100 }, { x: 200, y: 180 });
  await drag(page, { x: 300, y: 100 }, { x: 400, y: 180 });
  await expect.poll(async () => (await exportState(page)).objects.length).toBe(2);
  const before = await exportState(page);
  await page.getByTestId('clear-board').click();
  await page.getByTestId('confirm').click();
  await expect.poll(async () => (await exportState(page)).objects.length).toBe(0);

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByTestId('versions').getByRole('button', { name: /Before clear/ }).click();
  await page.getByRole('button', { name: 'Restore this version…' }).click();
  await page.getByTestId('confirm').click();
  await expect.poll(async () => (await exportState(page)).objects.length).toBe(2);
  expect((await exportState(page)).objects).toEqual(before.objects);
  await expect(page.getByTestId('toast-error')).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});

test('forced colours (Windows high contrast): colour swatches keep their own colours', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'forced-colours emulation is available in Chromium-based browsers only');
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'High contrast');
  const page = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(page);
  const swatchColours = () => page.evaluate(() => [...document.querySelectorAll('.toolbar button.swatch')].map((b) => getComputedStyle(b).backgroundColor));
  const normal = await swatchColours();
  expect(normal.length).toBeGreaterThanOrEqual(8);
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
  const forced = await swatchColours();
  // Every preset swatch keeps exactly the colour it shows normally, so they stay distinguishable.
  expect(forced).toEqual(normal);
  expect(new Set(forced).size).toBe(forced.length);
  await page.context().close();
});

test('fractional device pixel ratio (125 %): sharp backing store and drawing under the pointer', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'DPR 1.25');
  const page = await openWith(browser, O, `/boards/${boardId}`, { deviceScaleFactor: 1.25 });
  await waitReady(page);
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1.25);
  const c = await page.getByTestId('board-canvas').evaluate((el) => ({ w: el.width, h: el.height, cw: el.clientWidth, ch: el.clientHeight }));
  expect(c.w).toBe(Math.round(c.cw * 1.25));
  expect(c.h).toBe(Math.round(c.ch * 1.25));
  // The backing store is not reallocated on every redraw any more: drawing keeps the same element size.
  await page.getByTestId('tool-rect').click();
  await drag(page, { x: 101, y: 103 }, { x: 241, y: 187 });
  await expect.poll(async () => (await exportState(page)).objects.length).toBe(1);
  const [r] = (await exportState(page)).objects;
  expect({ x: r.x, y: r.y, w: r.w, h: r.h }).toEqual({ x: 101, y: 103, w: 140, h: 84 });
  expect(await page.getByTestId('board-canvas').evaluate((el) => el.width)).toBe(c.w);
  await page.context().close();
});

test('a stroke ends when pointer capture is lost without an up event; hovering does not extend it', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Lost capture');
  const page = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(page);
  await page.getByTestId('tool-pen').click();
  const canvas = page.getByTestId('board-canvas');
  await canvas.evaluate((el) => el.addEventListener('pointerdown', (e) => (window.__pid = e.pointerId)));
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 130, { steps: 6 });
  // The browser drops the capture (as when another element or the system takes the pointer).
  await canvas.evaluate((el) => el.releasePointerCapture(window.__pid));
  // The button is released outside the canvas, so the canvas never sees the up event.
  const outside = await page.getByTestId('role-badge').boundingBox();
  await page.mouse.move(outside.x + 5, outside.y + 5, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await exportState(page)).objects.length).toBe(1);
  const points = (await exportState(page)).objects[0].points.length;
  // Hovering over the canvas afterwards with no button pressed must not add points or new objects.
  await page.mouse.move(box.x + 400, box.y + 300, { steps: 8 });
  await page.mouse.move(box.x + 500, box.y + 200, { steps: 8 });
  await page.waitForTimeout(300);
  const after = await exportState(page);
  expect(after.objects).toHaveLength(1);
  expect(after.objects[0].points).toHaveLength(points);
  await page.context().close();
});

test('multi-touch: a second finger neither replaces nor feeds the stroke in progress', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'multi-point touch input is injected through the Chrome DevTools Protocol');
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Two fingers');
  const page = await openWith(browser, O, `/boards/${boardId}`, { hasTouch: true });
  await waitReady(page);
  await page.getByTestId('tool-pen').click();
  const box = await page.getByTestId('board-canvas').boundingBox();
  const at = (x, y, id) => ({ x: box.x + x, y: box.y + y, id, radiusX: 2, radiusY: 2, force: 1 });
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });

  await touch('touchStart', [at(100, 100, 1)]);
  for (let i = 1; i <= 5; i += 1) await touch('touchMove', [at(100 + i * 10, 100 + i * 4, 1)]);
  // A second finger (a palm, a pinch) lands far away and moves while the first keeps drawing.
  await touch('touchStart', [at(150, 120, 1), at(600, 400, 2)]);
  for (let i = 1; i <= 5; i += 1) await touch('touchMove', [at(150 + i * 10, 120 + i * 4, 1), at(600 + i * 20, 400 - i * 20, 2)]);
  // The second finger lifts first; the first one continues, then lifts.
  await touch('touchMove', [at(210, 145, 1)]);
  await touch('touchMove', [at(230, 150, 1)]);
  await touch('touchEnd', []);

  await expect.poll(async () => (await exportState(page)).objects.length).toBe(1);
  const [stroke] = (await exportState(page)).objects;
  expect(stroke.kind).toBe('stroke');
  // Every point belongs to the first finger's path (x 100–230, y 100–150), none to the second's.
  for (const [x, y] of stroke.points) expect({ x, y, onFirstFingerPath: x >= 99 && x <= 231 && y >= 99 && y <= 151 }).toEqual({ x, y, onFirstFingerPath: true });
  expect(stroke.points.at(-1)).toEqual([230, 150]);
  await page.context().close();
});
