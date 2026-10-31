// CommonJS because Playwright 1.50 hangs loading ES-module test files on Node 26.
// E2E tests (STP §6) against the real server, which serves the client test build
// (`npm run build:test`). `npm run test:e2e` builds first. Global setup starts mongod and the server.
//
// Browsers: E2E_BROWSERS selects projects (default: Playwright's Chromium, used by CI).
//   chrome  — installed Google Chrome (stable channel)
//   msedge  — installed Microsoft Edge (stable channel)
//   firefox — Playwright's bundled Firefox build. NOTE: this is a patched build, not the stable
//             Mozilla Firefox release that NFR-006 / TC-021 require; it is supplementary evidence only.
// `npm run test:e2e:browsers` runs chrome, msedge and firefox (TC-021).
const { defineConfig, devices } = require('@playwright/test');

const VIEWPORT = { width: 1280, height: 720 }; // NFR-006 minimum viewport
const PROJECTS = {
  chromium: { ...devices['Desktop Chrome'] },
  chrome: { ...devices['Desktop Chrome'], channel: 'chrome' },
  msedge: { ...devices['Desktop Edge'], channel: 'msedge' },
  firefox: { ...devices['Desktop Firefox'] },
};
const wanted = (process.env.E2E_BROWSERS || 'chromium').split(',').map((s) => s.trim()).filter(Boolean);
for (const name of wanted) if (!PROJECTS[name]) throw new Error(`Unknown E2E browser "${name}" (use ${Object.keys(PROJECTS).join(', ')})`);

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/globalSetup.cjs',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: wanted.map((name) => ({ name, use: { ...PROJECTS[name], viewport: VIEWPORT } })),
});
