// E2E helpers: API set-up calls, logged-in browser contexts and canvas gestures.
const crypto = require('node:crypto');
const { expect } = require('@playwright/test');

const base = () => process.env.E2E_BASE_URL;

async function apiCall(method, path, token, body, headers = {}) {
  const res = await fetch(`${base()}/api/v1${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

async function registerUser(displayName) {
  const email = `${displayName.toLowerCase()}_${crypto.randomBytes(4).toString('hex')}@example.test`;
  const password = `Pw-${crypto.randomBytes(8).toString('hex')}`;
  const reg = await apiCall('POST', '/auth/register', null, { email, password, displayName });
  expect(reg.status).toBe(201);
  const login = await apiCall('POST', '/auth/login', null, { email, password });
  expect(login.status).toBe(200);
  return { id: reg.body.userId, email, password, displayName, session: login.body, token: login.body.token };
}

async function createBoard(owner, title = 'E2E board') {
  const r = await apiCall('POST', '/boards', owner.token, { title });
  expect(r.status).toBe(201);
  return r.body.id;
}

async function addMember(owner, boardId, user, role) {
  const link = await apiCall('POST', `/boards/${boardId}/links`, owner.token, { role });
  const token = link.body.url.split('#')[1];
  expect((await apiCall('POST', '/links/resolve', user.token, { token })).status).toBe(200);
}

/** New browser context, logged in as `user` (or anonymous), opened at `path`. */
async function openAs(browser, user, path) {
  const context = await browser.newContext({ baseURL: base(), viewport: { width: 1280, height: 720 } });
  if (user) await context.addInitScript((s) => window.localStorage.setItem('wb.session', JSON.stringify(s)), user.session);
  const page = await context.newPage();
  page.dialogs = [];
  page.on('dialog', (d) => {
    page.dialogs.push(d.message());
    d.dismiss();
  });
  await page.goto(path);
  return page;
}

async function waitReady(page) {
  await expect(page.getByTestId('connection-status')).toHaveText(/Connected/);
}

const exportState = (page) => page.evaluate(() => window.__wbTest.exportState());

/** Waits until both pages show the same confirmed state with `count` objects; returns it. */
async function expectSameState(a, b, count) {
  await expect.poll(async () => (await exportState(a)).objects.length).toBe(count);
  await expect.poll(async () => JSON.stringify(await exportState(b))).toBe(JSON.stringify(await exportState(a)));
  return exportState(a);
}

/** Pointer drag on the board canvas, in canvas coordinates. */
async function drag(page, from, to, steps = 12) {
  const box = await page.getByTestId('board-canvas').boundingBox();
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps });
  await page.mouse.up();
}

async function clickCanvas(page, at) {
  const box = await page.getByTestId('board-canvas').boundingBox();
  await page.mouse.click(box.x + at.x, box.y + at.y);
}

module.exports = { base, apiCall, registerUser, createBoard, addMember, openAs, waitReady, exportState, expectSameState, drag, clickCanvas };
