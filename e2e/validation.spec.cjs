// Issue #21: frontend validation and user feedback, checked in the browser against the real server.
// Invalid input is caught before a request is sent where the form can tell (blank names and titles,
// e-mail format, password length, stroke width); server rejections are shown as readable messages;
// buttons show a busy state and cannot submit twice; and an unreachable or failing server produces
// a clear message instead of a silent failure or a raw status code.
const { expect, test } = require('@playwright/test');
const { apiCall, base, createBoard, openAs, registerUser, waitReady } = require('./helpers.cjs');

/** Counts the API requests a page sends to `path` (method + exact API path). */
function countRequests(page, method, path) {
  const seen = { n: 0 };
  page.on('request', (r) => {
    if (r.method() === method && new URL(r.url()).pathname === `/api/v1${path}`) seen.n += 1;
  });
  return seen;
}

const alert = (page) => page.getByRole('alert');

test('issue #21: registration rejects invalid input with clear messages and a duplicate e-mail', async ({ browser }) => {
  const page = await openAs(browser, null, '/register');
  const posts = countRequests(page, 'POST', '/auth/register');
  const name = page.getByLabel(/Display name/);
  const email = page.getByLabel('E-mail address');
  const password = page.getByLabel(/Password/);
  const submit = page.getByRole('button', { name: 'Register' });

  // Blank (spaces only) display name: our own message, nothing sent.
  await name.fill('   ');
  await email.fill('blank.name@example.test');
  await password.fill('long-enough-1');
  await submit.click();
  await expect(alert(page)).toHaveText('Enter a display name of 1–30 characters.');

  // Invalid e-mail and a 7-character password: the browser's constraint validation blocks the submit.
  await name.fill('Valid Name');
  await email.fill('not-an-email');
  await submit.click();
  expect(await email.evaluate((el) => el.validity.valid)).toBe(false);
  await email.fill('short.pw@example.test');
  await password.fill('1234567');
  await submit.click();
  expect(await password.evaluate((el) => el.validity.tooShort || el.validity.valid === false)).toBe(true);
  // The display name cannot exceed 30 characters.
  await name.fill('x'.repeat(31));
  expect((await name.inputValue()).length).toBe(30);
  expect(posts.n, 'no registration request for invalid input').toBe(0);

  // E-mail already in use: the server's EMAIL_TAKEN is shown as a readable message.
  const existing = await registerUser('Taken');
  await name.fill('Someone Else');
  await email.fill(existing.email);
  await password.fill('long-enough-1');
  await submit.click();
  await expect(alert(page)).toHaveText('An account with this e-mail address already exists.');
  expect(posts.n).toBe(1);
  await page.context().close();
});

test('issue #21: a wrong password shows the generic login failure; the button is busy and submits once', async ({ browser }) => {
  const user = await registerUser('Login');
  const page = await openAs(browser, null, '/login');
  const posts = countRequests(page, 'POST', '/auth/login');
  // Hold the login response so the busy state can be observed.
  let release;
  const held = new Promise((r) => (release = r));
  await page.route('**/api/v1/auth/login', async (route) => {
    await held;
    await route.continue();
  });
  await page.getByLabel('E-mail address').fill(user.email);
  await page.getByLabel('Password').fill('wrong-password-1');
  const submit = page.getByRole('button', { name: /Log in|Logging in/ });
  await submit.click();
  await expect(submit).toHaveText('Logging in…');
  await expect(submit).toBeDisabled();
  // A second attempt while busy (Enter in the field) does not send another request.
  await page.getByLabel('Password').press('Enter');
  release();
  await expect(alert(page)).toHaveText('Invalid e-mail or password.');
  await expect(submit).toHaveText('Log in');
  await expect(submit).toBeEnabled();
  expect(posts.n).toBe(1);
  await page.context().close();
});

test('issue #21: an unreachable or failing server gives a readable message, not a raw status', async ({ browser }) => {
  const user = await registerUser('Offline');
  // Login while the network request fails.
  const page = await openAs(browser, null, '/login');
  await page.route('**/api/v1/auth/login', (route) => route.abort('connectionrefused'));
  await page.getByLabel('E-mail address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(alert(page)).toHaveText('The server cannot be reached. Check your connection and try again.');
  // A proxy error page (502, no JSON) while the server is down.
  await page.unroute('**/api/v1/auth/login');
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Bad Gateway</h1>' }));
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(alert(page)).toHaveText(/^The service is temporarily unavailable\. Please try again shortly\./);
  await expect(alert(page)).not.toContainText('Request failed');
  await page.context().close();

  // Creating a board while the server fails: message shown, button usable again, no navigation.
  const dash = await openAs(browser, user, '/');
  await expect(dash.getByRole('heading', { name: 'My boards' })).toBeVisible();
  await dash.route('**/api/v1/boards', (route) => (route.request().method() === 'POST' ? route.abort('connectionrefused') : route.continue()));
  await dash.getByLabel('New board title').fill('Will fail');
  await dash.getByRole('button', { name: 'Create board' }).click();
  await expect(alert(dash)).toHaveText('The server cannot be reached. Check your connection and try again.');
  await expect(dash.getByRole('button', { name: 'Create board' })).toBeEnabled();
  await expect(dash).toHaveURL(`${base()}/`);
  await dash.context().close();
});

test('issue #21: blank board title is refused on the dashboard; success opens the board', async ({ browser }) => {
  const user = await registerUser('Creator');
  const page = await openAs(browser, user, '/');
  const posts = countRequests(page, 'POST', '/boards');
  await page.getByLabel('New board title').fill('    ');
  await page.getByRole('button', { name: 'Create board' }).click();
  await expect(alert(page)).toHaveText('Enter a title of 1–100 characters.');
  await expect(page.getByLabel('New board title')).toHaveAttribute('aria-invalid', 'true');
  expect(posts.n).toBe(0);
  await page.getByLabel('New board title').fill('  Planning  ');
  await page.getByRole('button', { name: 'Create board' }).click();
  await expect(page).toHaveURL(/\/boards\/[A-Za-z0-9]+$/);
  await expect(page.locator('.topbar h1')).toHaveText('Planning');
  expect(posts.n).toBe(1);
  await page.context().close();
});

test('issue #21: guest join validates the name and explains invalid and revoked links', async ({ browser }) => {
  const owner = await registerUser('LinkOwner');
  const boardId = await createBoard(owner, 'Guest checks');
  const link = await apiCall('POST', `/boards/${boardId}/links`, owner.token, { role: 'viewer' });
  expect(link.status).toBe(201);
  const token = link.body.url.split('#')[1];

  const page = await openAs(browser, null, `/join#${token}`);
  const resolves = countRequests(page, 'POST', '/links/resolve');
  const name = page.getByLabel(/Your display name/);
  const join = page.getByRole('button', { name: 'Join as guest' });
  await join.click();
  await expect(alert(page)).toHaveText('Enter a display name of 1–30 characters.');
  await name.fill('   ');
  await join.click();
  await expect(alert(page)).toHaveText('Enter a display name of 1–30 characters.');
  await name.fill('g'.repeat(31));
  expect((await name.inputValue()).length).toBe(30);
  expect(resolves.n).toBe(0);

  // The Owner revokes the link before the guest joins.
  expect((await apiCall('DELETE', `/boards/${boardId}/links/${link.body.linkId}`, owner.token)).status).toBe(204);
  await name.fill('Late Guest');
  await join.click();
  await expect(alert(page)).toHaveText('This share link has been revoked. Ask the board Owner for a new link.');
  await page.context().close();

  // A link token that does not exist, and a join page without any link.
  const bad = await openAs(browser, null, `/join#${'A'.repeat(43)}`);
  await bad.getByLabel(/Your display name/).fill('Guest');
  await bad.getByRole('button', { name: 'Join as guest' }).click();
  await expect(alert(bad)).toHaveText('This share link is not valid.');
  await bad.goto('/join');
  await expect(alert(bad)).toHaveText('This page needs a share link.');
  await bad.context().close();
});

test('issue #21: an invalid stroke width is flagged and never applied', async ({ browser }) => {
  const user = await registerUser('Widths');
  const boardId = await createBoard(user, 'Widths');
  const page = await openAs(browser, user, `/boards/${boardId}`);
  await waitReady(page);
  const width = page.getByTestId('stroke-width');
  await width.fill('7');
  await expect(width).toHaveAttribute('aria-invalid', 'false');
  for (const bad of ['0', '21', '2.5', '']) {
    await width.fill(bad);
    await expect(width, `width "${bad}"`).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.width .field-error')).toHaveText('1–20');
  }
  // Leaving the field restores the last valid value, which is the one new objects use.
  await width.blur();
  await expect(width).toHaveValue('7');
  await expect(page.locator('.width .field-error')).toHaveCount(0);
  await page.context().close();
});
