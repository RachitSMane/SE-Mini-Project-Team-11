// Issue #23: responsive whiteboard layout. The SRS supports desktop viewports at least 1280 px wide
// (NFR-006); the stylesheet also has breakpoints down to 480 px, which are checked as well.
// At every size: no horizontal page scroll, no control cut off at the window edge, no overlapping
// top-bar items, a readable board title, every drawing tool reachable, and drawing still lands where
// the pointer is. Resizing an open board keeps the canvas matched to its container (device-pixel
// sharp) and usable, and the Share and Members dialogs fit the window.
const { expect, test } = require('@playwright/test');
const { createBoard, drag, exportState, openAs, registerUser, waitReady } = require('./helpers.cjs');

const REQUIRED = [
  [1280, 720],
  [1366, 768],
  [1920, 1080],
];
const NARROWER = [
  [1024, 768],
  [800, 600],
  [480, 800],
];
const TOOLS = ['select', 'pen', 'eraser', 'rect', 'ellipse', 'line', 'text'];

/** Layout facts of the board view in the current viewport. */
function layout(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const shown = (el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0;
    const inScroller = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) return true;
      }
      return false;
    };
    const name = (el) => el.dataset.testid || el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30) || el.tagName;
    const cutOff = [];
    for (const el of document.querySelectorAll('.board button, .board input, .board a, .board h1, .board [data-testid]')) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.left < -0.5 || r.right > vw + 0.5) cutOff.push(`${name(el)} (x ${Math.round(r.left)}–${Math.round(r.right)})`);
      else if (!inScroller(el) && (r.top < -0.5 || r.bottom > vh + 0.5)) cutOff.push(`${name(el)} (y ${Math.round(r.top)}–${Math.round(r.bottom)})`);
    }
    const items = [...document.querySelectorAll('.topbar .crumbs > *, .topbar > .status, .topbar > .presence, .topbar-actions > *, .topbar > .me')]
      .filter(shown)
      .map((el) => ({ n: el.className || el.tagName, r: el.getBoundingClientRect() }));
    const overlaps = [];
    for (let i = 0; i < items.length; i += 1)
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i].r;
        const b = items[j].r;
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push(`${items[i].n} / ${items[j].n}`);
      }
    const canvas = document.querySelector('[data-testid=board-canvas]');
    const wrap = canvas.parentElement.getBoundingClientRect();
    return {
      horizontalScroll: document.documentElement.scrollWidth > vw,
      cutOff,
      overlaps,
      titleWidth: document.querySelector('.topbar h1').getBoundingClientRect().width,
      titleNatural: document.querySelector('.topbar h1').scrollWidth,
      canvas: { cssW: canvas.clientWidth, cssH: canvas.clientHeight, wrapW: wrap.width, wrapH: wrap.height, backingW: canvas.width, backingH: canvas.height, dpr: window.devicePixelRatio },
    };
  });
}

/** The ResizeObserver resizes the canvas asynchronously: wait until it follows its container. */
async function canvasSettled(page) {
  // The overlay side panel slides in (CSS animation); measure the final layout, not a frame of it.
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  await expect
    .poll(async () => {
      const c = (await layout(page)).canvas;
      return Math.abs(c.cssW - c.wrapW) <= 1 && Math.abs(c.cssH - c.wrapH) <= 1 && c.backingW === Math.round(c.cssW * c.dpr);
    })
    .toBe(true);
}

function expectGoodLayout(l, size) {
  expect({ size, horizontalScroll: l.horizontalScroll }).toEqual({ size, horizontalScroll: false });
  expect({ size, cutOff: l.cutOff }).toEqual({ size, cutOff: [] });
  expect({ size, overlaps: l.overlaps }).toEqual({ size, overlaps: [] });
  // A long title may be shortened with an ellipsis, but never squeezed below 80 px (it used to collapse to 4 px).
  expect(l.titleWidth, `${size}: board title readable`).toBeGreaterThanOrEqual(Math.min(80, l.titleNatural) - 0.5);
  // The canvas fills its container and its backing store matches it in device pixels.
  expect(Math.abs(l.canvas.cssW - l.canvas.wrapW), `${size}: canvas width = container`).toBeLessThanOrEqual(1);
  expect(Math.abs(l.canvas.cssH - l.canvas.wrapH), `${size}: canvas height = container`).toBeLessThanOrEqual(1);
  expect(l.canvas.backingW, `${size}: backing store width`).toBe(Math.round(l.canvas.cssW * l.canvas.dpr));
  expect(l.canvas.backingH, `${size}: backing store height`).toBe(Math.round(l.canvas.cssH * l.canvas.dpr));
}

/** Draws a rectangle near the canvas centre and checks that it lands exactly under the pointer. */
async function drawAndCheck(page, size) {
  const beforeIds = new Set((await exportState(page)).objects.map((o) => o.id));
  const before = beforeIds.size;
  const box = await page.getByTestId('board-canvas').boundingBox();
  const from = { x: Math.round(box.width / 2 - 40), y: Math.round(box.height / 2 - 30) };
  const to = { x: from.x + 80, y: from.y + 60 };
  await page.getByTestId('tool-rect').scrollIntoViewIfNeeded();
  await page.getByTestId('tool-rect').click();
  await drag(page, from, to);
  await expect.poll(async () => (await exportState(page)).objects.length, { message: `${size}: rectangle drawn` }).toBe(before + 1);
  // The exported state is sorted by id, so find the new object rather than taking the last one.
  const rect = (await exportState(page)).objects.find((o) => !beforeIds.has(o.id));
  expect({ size, x: rect.x, y: rect.y, w: rect.w, h: rect.h }).toEqual({ size, x: from.x, y: from.y, w: 80, h: 60 });
}

test('issue #23: layout, tools and drawing at the supported sizes (≥ 1280 px) and the narrower breakpoints', async ({ browser }) => {
  test.setTimeout(120_000);
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Responsive layout check with a deliberately long board title');
  const page = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(page);

  for (const [w, h] of [...REQUIRED, ...NARROWER]) {
    const size = `${w}x${h}`;
    await page.setViewportSize({ width: w, height: h });
    // Open the side panel if this width starts without it, so both states are covered.
    const toggle = page.getByRole('button', { name: /participants and history panel/ });
    for (const panel of ['open', 'closed']) {
      const isOpen = (await toggle.getAttribute('aria-expanded')) === 'true';
      if ((panel === 'open') !== isOpen) await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', panel === 'open' ? 'true' : 'false');
      await canvasSettled(page);
      expectGoodLayout(await layout(page), `${size} panel ${panel}`);
    }
    // Every drawing tool can be reached (the toolbar scrolls on short windows) and drawing works.
    for (const t of TOOLS) {
      await page.getByTestId(`tool-${t}`).scrollIntoViewIfNeeded();
      await expect(page.getByTestId(`tool-${t}`), `${size}: tool ${t}`).toBeInViewport();
    }
    await drawAndCheck(page, size);
  }
  await page.context().close();
});

test('issue #23: resizing an open board keeps the canvas matched to the window and drawing accurate', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Resize');
  const page = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(page);
  await drawAndCheck(page, 'start 1280x720');
  for (const [w, h] of [[1920, 1080], [1366, 768], [1280, 720], [1600, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    await canvasSettled(page);
    expectGoodLayout(await layout(page), `resized to ${w}x${h}`);
    await drawAndCheck(page, `after resize to ${w}x${h}`);
  }
  // Content drawn before the resizes is still there: one rectangle per step.
  expect((await exportState(page)).objects).toHaveLength(5);
  await page.context().close();
});

test('issue #23: Share and Members dialogs fit the window at 1280 × 720 and at 800 × 600', async ({ browser }) => {
  const O = await registerUser('Owner');
  const boardId = await createBoard(O, 'Dialogs');
  const page = await openAs(browser, O, `/boards/${boardId}`);
  await waitReady(page);
  for (const [w, h] of [[1280, 720], [800, 600]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const open of [() => page.getByRole('button', { name: 'Share' }).click(), () => page.getByRole('button', { name: 'Members' }).click()]) {
      await open();
      const modal = page.locator('.modal');
      await expect(modal).toBeVisible();
      const r = await modal.boundingBox();
      expect({ size: `${w}x${h}`, inside: r.x >= 0 && r.y >= 0 && r.x + r.width <= w + 0.5 && r.y + r.height <= h + 0.5 }).toEqual({ size: `${w}x${h}`, inside: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    }
  }
  await page.context().close();
});
