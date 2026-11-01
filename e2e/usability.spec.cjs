// TC-021 automated checklist (NFR-006, NFR-007) at a 1280 × 720 viewport, for Owner, Editor and
// Viewer: role and connection status visible, every drawing tool directly on the toolbar, every
// toolbar control labelled (visible text, label or tooltip), toolbar reachable with Tab and
// activated with Enter/Space, and no horizontally cut-off control.
const { expect, test } = require('@playwright/test');
const { addMember, createBoard, openAs, registerUser, waitReady } = require('./helpers.cjs');

const TOOLS = ['select', 'pen', 'eraser', 'rect', 'ellipse', 'line', 'text'];

/** Every visible interactive control in the board view, with its label sources and right edge. */
function controls(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.board button, .board input, .board select, .board a')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const labelled = el.labels && el.labels.length ? el.labels[0].textContent.trim() : '';
        const legend = el.closest('fieldset')?.querySelector('legend')?.textContent.trim() || '';
        return {
          tag: el.tagName,
          testid: el.dataset.testid || '',
          inToolbar: Boolean(el.closest('.toolbar')),
          label: (el.textContent.trim() || el.getAttribute('aria-label') || el.title || labelled || legend).slice(0, 40),
          right: r.right,
          left: r.left,
        };
      }),
  );
}

test('TC-021 checklist: Owner, Editor and Viewer views at 1280 × 720', async ({ browser }, info) => {
  const O = await registerUser('Owner');
  const E = await registerUser('Editor');
  const V = await registerUser('Viewer');
  const boardId = await createBoard(O, 'Usability');
  await addMember(O, boardId, E, 'editor');
  await addMember(O, boardId, V, 'viewer');

  for (const [who, expectedBadge] of [[O, 'Owner'], [E, 'Editor'], [V, 'View only']]) {
    const page = await openAs(browser, who, `/boards/${boardId}`);
    await waitReady(page);
    // Role and connection status always visible (text, not colour only).
    await expect(page.getByTestId('role-badge')).toHaveText(expectedBadge);
    await expect(page.getByTestId('connection-status')).toContainText('Connected');

    // No horizontal page scroll and no control beyond the viewport edge.
    const scroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(scroll.sw, `${who.displayName}: page wider than the viewport`).toBeLessThanOrEqual(scroll.cw);
    const all = await controls(page);
    expect(all.length, `${who.displayName}: controls found`).toBeGreaterThanOrEqual(who === V ? 4 : 20);
    for (const c of all) {
      expect({ who: who.displayName, c: c.label || c.tag, cutOff: c.right > 1280 + 0.5 || c.left < -0.5 }).toEqual({ who: who.displayName, c: c.label || c.tag, cutOff: false });
      expect({ who: who.displayName, c: c.testid || c.tag, labelled: c.label.length > 0 }).toEqual({ who: who.displayName, c: c.testid || c.tag, labelled: true });
    }

    if (who === V) {
      // Viewers have no drawing tools (SAD §4.5); nothing else to reach.
      expect(all.filter((c) => c.inToolbar)).toHaveLength(0);
      await page.context().close();
      continue;
    }
    // Every drawing tool is a direct toolbar button (no nested menus).
    for (const t of TOOLS) await expect(page.getByTestId(`tool-${t}`)).toBeVisible();

    // Keyboard: Tab reaches every tool button; Enter and Space activate them.
    // Start from the first control of the board view (browsers differ in where focus starts after a click).
    await page.locator('.topbar a, .topbar button').first().focus();
    const reached = new Set();
    const sequence = [];
    for (let i = 0; i < 60 && reached.size < TOOLS.length; i += 1) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.dataset?.testid || `${el?.tagName}.${el?.className || ''}`;
      });
      sequence.push(id);
      if (id.startsWith('tool-')) reached.add(id);
    }
    expect([...reached].sort(), `${who.displayName}: tools reached with Tab; sequence: ${sequence.join(' > ')}`).toEqual(TOOLS.map((t) => `tool-${t}`).sort());
    await page.getByTestId('tool-rect').focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('tool-rect')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tool-ellipse').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('tool-ellipse')).toHaveAttribute('aria-pressed', 'true');
    // Colour swatch and width field are keyboard-operable too.
    await page.getByRole('button', { name: 'Colour #43A047' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Colour #43A047' })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: info.outputPath(`board-${expectedBadge.replace(' ', '-').toLowerCase()}.png`) });
    await page.context().close();
  }
  info.annotations.push({ type: 'browser', description: `${info.project.name} ${browser.version()}` });
});
