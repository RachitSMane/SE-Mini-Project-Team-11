// TC-109 verification helper (SEC-REQ-007): automates the checks of TC-109 steps 1–4 against a
// deployed instance. Needs no account: the secure-WebSocket check only has to reach the application
// (an "unauthenticated" refusal proves the wss:// connection was established).
//
//   node scripts/verify-tls.js https://<host>            (HTTP URL derived: http://<host>)
//   node scripts/verify-tls.js https://<host> --http http://<host>:8080
//
// Exit code 0 only if every check passes. `--insecure-ca <file>` trusts an extra CA certificate; it
// exists for the local self-test with a throw-away certificate and makes the result invalid as TC-109
// evidence (the report says so). Record the JSON output with the date, host and Git commit.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { pathToFileURL } from 'node:url';
import { io } from 'socket.io-client';

function request(url, { ca } = {}) {
  const mod = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.get(url, { ca, timeout: 10000 }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

/** Handshake with exactly one TLS version; resolves {ok, protocol, cert} or {ok: false, code}. */
function handshake(host, port, version, { ca } = {}) {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: /^[\d.]+$|:/.test(host) ? undefined : host,
      ca,
      minVersion: version,
      maxVersion: version,
      // Lets this client offer TLS 1.0/1.1 at all, so that a refusal is the server's decision.
      ciphers: version === 'TLSv1.1' ? 'DEFAULT:@SECLEVEL=0' : undefined,
      timeout: 10000,
    });
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      resolve({ ok: true, protocol: socket.getProtocol(), authorized: socket.authorized, cert: { subject: cert.subject?.CN, issuer: cert.issuer?.CN, validTo: cert.valid_to } });
      socket.end();
    });
    socket.once('timeout', () => socket.destroy(new Error('timeout')));
    socket.once('error', (err) => resolve({ ok: false, code: err.code || err.message }));
  });
}

function realtime(url, { ca } = {}) {
  return new Promise((resolve) => {
    const s = io(`${url}/board`, { transports: ['websocket'], reconnection: false, timeout: 10000, auth: { token: 'invalid' }, ca, forceNew: true });
    const done = (r) => {
      s.removeAllListeners();
      s.disconnect();
      resolve(r);
    };
    s.once('connect', () => done({ reachedApp: true, error: null }));
    // UNAUTHENTICATED comes from the application's connection middleware, i.e. the WebSocket was open.
    s.once('connect_error', (e) => done({ reachedApp: e.message === 'UNAUTHENTICATED', error: e.message }));
  });
}

export async function verifyDeployment({ httpsUrl, httpUrl, ca } = {}) {
  const u = new URL(httpsUrl);
  if (u.protocol !== 'https:') throw new Error('the first argument must be an https:// URL');
  const plain = httpUrl || `http://${u.hostname}`;
  const port = Number(u.port || 443);
  const checks = [];
  const add = (id, step, ok, detail) => checks.push({ id, step, result: ok ? 'PASS' : 'FAIL', detail });

  for (const path of ['/', '/api/v1/health']) {
    try {
      const r = await request(`${plain}${path}`);
      const loc = r.headers.location || '';
      add(`redirect ${path}`, 1, [301, 302, 307, 308].includes(r.status) && loc.startsWith(`https://${u.host}`), { status: r.status, location: loc });
    } catch (err) {
      add(`redirect ${path}`, 1, false, { error: err.message });
    }
  }
  try {
    const r = await request(`${u.origin}/api/v1/health`, { ca });
    add('https health and HSTS', 1, r.status === 200 && /max-age=\d+/.test(r.headers['strict-transport-security'] || ''), { status: r.status, hsts: r.headers['strict-transport-security'] || null });
  } catch (err) {
    add('https health and HSTS', 1, false, { error: err.code || err.message });
  }
  const v12 = await handshake(u.hostname, port, 'TLSv1.2', { ca });
  const v13 = await handshake(u.hostname, port, 'TLSv1.3', { ca });
  add('TLS 1.2 or 1.3 with a trusted certificate', 2, (v12.ok && v12.authorized) || (v13.ok && v13.authorized), { tls12: v12, tls13: v13 });
  const v11 = await handshake(u.hostname, port, 'TLSv1.1', { ca });
  const clientCannotOffer = !v11.ok && /NO_PROTOCOLS_AVAILABLE|NO_SUITABLE/.test(String(v11.code));
  checks.push({ id: 'TLS 1.1 refused', step: 4, result: v11.ok ? 'FAIL' : clientCannotOffer ? 'INCONCLUSIVE' : 'PASS', detail: v11.ok ? { negotiated: v11.protocol } : { error: v11.code } });
  const wss = await realtime(u.origin, { ca });
  add('Socket.IO over wss:// reaches the application', 3, wss.reachedApp, wss);
  const ws = await realtime(plain);
  add('Socket.IO over plain ws:// does not reach the application', 3, !ws.reachedApp, ws);

  return {
    target: { https: u.origin, http: plain },
    checkedAt: new Date().toISOString(),
    validAsTc109Evidence: !ca,
    note: ca ? 'An extra CA was trusted (--insecure-ca): local self-test only, NOT TC-109 evidence.' : 'Record with the date, host, proxy and Git commit (STP §13).',
    passed: checks.every((c) => c.result === 'PASS'),
    checks,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const httpUrl = opt('--http');
  const caFile = opt('--insecure-ca');
  if (!args[0]) {
    console.error('usage: node scripts/verify-tls.js https://<host> [--http http://<host>] [--insecure-ca <file>]');
    process.exit(2);
  }
  const report = await verifyDeployment({ httpsUrl: args[0], httpUrl, ca: caFile ? fs.readFileSync(caFile) : undefined });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
}
