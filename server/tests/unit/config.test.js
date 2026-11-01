// Configuration checks (server/src/config.js).
import path from 'node:path';
import { loadConfig } from '../../src/config.js';

const secrets = { JWT_SECRET: 'x'.repeat(40), LOGIN_HMAC_KEY: 'y'.repeat(40), NODE_ENV: 'development' };

test('CLIENT_DIST is resolved to an absolute path (res.sendFile rejects relative paths)', () => {
  const c = loadConfig({ ...secrets, CLIENT_DIST: '../client/dist' });
  expect(path.isAbsolute(c.clientDist)).toBe(true);
  expect(c.clientDist).toBe(path.resolve('../client/dist'));
  expect(loadConfig({ ...secrets, CLIENT_DIST: '' }).clientDist).toBe('');
});

test('secrets shorter than 32 characters and a production bcrypt cost below 12 are refused', () => {
  expect(() => loadConfig({ ...secrets, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  expect(() => loadConfig({ ...secrets, LOGIN_HMAC_KEY: '' })).toThrow(/LOGIN_HMAC_KEY/);
  expect(() => loadConfig({ ...secrets, NODE_ENV: 'production', BCRYPT_COST: '10' })).toThrow(/BCRYPT_COST/);
});

test('test hooks are ignored outside NODE_ENV=test', () => {
  const c = loadConfig({ ...secrets, FAULT_INJECT: 'after_complete', LINK_EXPIRY_OVERRIDE_SEC: '5' });
  expect(c.faultInject).toBe('');
  expect(c.linkExpiryOverrideSec).toBe(0);
});

test('FORCE_HTTPS requires TRUST_PROXY and an https PUBLIC_URL (SEC-REQ-007; otherwise a redirect loop or http share links)', () => {
  const https = { ...secrets, FORCE_HTTPS: 'true', TRUST_PROXY: 'true', PUBLIC_URL: 'https://wb.example.test' };
  expect(loadConfig(https).forceHttps).toBe(true);
  expect(() => loadConfig({ ...https, TRUST_PROXY: 'false' })).toThrow(/TRUST_PROXY/);
  expect(() => loadConfig({ ...https, PUBLIC_URL: 'http://wb.example.test' })).toThrow(/PUBLIC_URL/);
  expect(loadConfig({ ...secrets, TRUST_PROXY: 'true' }).forceHttps).toBe(false);
});
