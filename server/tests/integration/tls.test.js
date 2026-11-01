// SEC-REQ-007 end to end through a real TLS hop, locally: the server (FORCE_HTTPS, TRUST_PROXY) runs
// behind a minimal TLS-terminating reverse proxy (TLS 1.2+, throw-away self-signed certificate made
// with OpenSSL at test time) and `scripts/verify-tls.js` — the TC-109 helper — checks it.
// This verifies the helper and the application's behaviour behind a TLS proxy. It is NOT TC-109:
// the TLS settings checked here are the test proxy's, not those of a deployment.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startTestServer } from '../helpers/harness.js';
import { verifyDeployment } from '../../../scripts/verify-tls.js';

const hasOpenssl = spawnSync('openssl', ['version'], { encoding: 'utf8' }).status === 0;
const maybe = hasOpenssl ? test : test.skip;

let dir;
let srv;
const servers = [];
afterAll(async () => {
  for (const s of servers) await new Promise((r) => s.close(() => r()));
  await srv?.stop();
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

/** Reverse proxy to 127.0.0.1:target() that sets X-Forwarded-Proto and forwards WebSocket upgrades. */
function proxy(server, proto, target) {
  const headers = (req) => ({ ...req.headers, 'x-forwarded-proto': proto, 'x-forwarded-for': req.socket.remoteAddress });
  server.on('request', (req, res) => {
    const up = http.request({ host: '127.0.0.1', port: target(), method: req.method, path: req.url, headers: headers(req) }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on('error', () => res.destroy());
    req.pipe(up);
  });
  server.on('upgrade', (req, socket, head) => {
    const up = net.connect(target(), '127.0.0.1', () => {
      const lines = Object.entries(headers(req)).map(([k, v]) => `${k}: ${v}`);
      up.write(`${req.method} ${req.url} HTTP/1.1\r\n${lines.join('\r\n')}\r\n\r\n`);
      up.write(head);
      up.pipe(socket);
      socket.pipe(up);
    });
    up.on('error', () => socket.destroy());
    socket.on('error', () => up.destroy());
  });
  return server;
}

const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));

maybe('behind a TLS 1.2+ proxy: redirect, HSTS, TLS 1.1 refused, wss:// reaches the app, ws:// does not', async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-tls-'));
  const key = path.join(dir, 'key.pem');
  const cert = path.join(dir, 'cert.pem');
  const gen = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { encoding: 'utf8' });
  expect(gen.status).toBe(0);
  const ca = fs.readFileSync(cert);

  let appPort = 0;
  const tlsProxy = proxy(https.createServer({ key: fs.readFileSync(key), cert: ca, minVersion: 'TLSv1.2' }), 'https', () => appPort);
  const plainProxy = proxy(http.createServer(), 'http', () => appPort);
  servers.push(tlsProxy, plainProxy);
  const httpsPort = await listen(tlsProxy);
  const httpPort = await listen(plainProxy);
  srv = await startTestServer({ FORCE_HTTPS: 'true', TRUST_PROXY: 'true', PUBLIC_URL: `https://127.0.0.1:${httpsPort}` });
  appPort = srv.port;

  const report = await verifyDeployment({ httpsUrl: `https://127.0.0.1:${httpsPort}`, httpUrl: `http://127.0.0.1:${httpPort}`, ca });
  const byId = Object.fromEntries(report.checks.map((c) => [c.id, c]));
  expect(byId['redirect /']).toMatchObject({ result: 'PASS', detail: { status: 308, location: `https://127.0.0.1:${httpsPort}/` } });
  expect(byId['redirect /api/v1/health'].result).toBe('PASS');
  expect(byId['https health and HSTS']).toMatchObject({ result: 'PASS', detail: { status: 200, hsts: 'max-age=31536000' } });
  expect(byId['TLS 1.2 or 1.3 with a trusted certificate'].result).toBe('PASS');
  expect(byId['TLS 1.1 refused'].result).not.toBe('FAIL'); // PASS, or INCONCLUSIVE if this client cannot offer TLS 1.1
  expect(byId['Socket.IO over wss:// reaches the application']).toMatchObject({ result: 'PASS', detail: { error: 'UNAUTHENTICATED' } });
  expect(byId['Socket.IO over plain ws:// does not reach the application'].result).toBe('PASS');
  expect(report.validAsTc109Evidence).toBe(false); // an extra CA was trusted
  console.log(JSON.stringify({ tlsSelfTest: report.checks.map((c) => ({ id: c.id, result: c.result, detail: c.detail })) }));
});
