// Composition root: wires COMP-03 to COMP-09 together and runs start-up recovery before the
// server accepts any connection or request (SAD §3.6).
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { LIMITS } from '@wb/shared/objects';
import { loadConfig } from './config.js';
import { connectDb, disconnectDb } from './db/models.js';
import { logger, metrics } from './logger.js';
import { Faults } from './faults.js';
import { AuthService } from './auth/authService.js';
import { AccessService } from './access/accessService.js';
import { BoardQueues } from './realtime/boardQueue.js';
import { BoardStore } from './realtime/boardStore.js';
import { BoardEngine } from './realtime/boardEngine.js';
import { RealtimeServer } from './realtime/realtimeServer.js';
import { VersionService } from './versions/versionService.js';
import { runStartupRecovery } from './recovery.js';
import { createApp } from './rest/app.js';

/**
 * Protocol of a raw HTTP request as seen by the client, matching Express's req.protocol with
 * 'trust proxy' (first X-Forwarded-Proto value). Only used with FORCE_HTTPS, which requires TRUST_PROXY.
 */
export function forwardedProto(req) {
  if (req.socket?.encrypted) return 'https';
  const header = req.headers['x-forwarded-proto'];
  return typeof header === 'string' && header ? header.split(',')[0].trim() : 'http';
}

export async function startServer(overrides = {}, { logStdout = true } = {}) {
  const config = loadConfig(overrides);
  logger.configure({ level: config.logLevel, file: config.logFile, stdout: logStdout });
  const faults = new Faults(config.faultInject);
  await connectDb(config.mongoUrl);

  const queues = new BoardQueues();
  const store = new BoardStore();
  const auth = new AuthService(config);
  const access = new AccessService({ config, queues, auth });
  const versions = new VersionService({ config, queues, store, access, faults });
  const engine = new BoardEngine({ store, access, auth, versions, faults });

  await runStartupRecovery({ engine, versions, faults });

  const app = createApp({ config, auth, access, versions });
  const httpServer = http.createServer(app);
  const io = new SocketServer(httpServer, {
    maxHttpBufferSize: LIMITS.MAX_MESSAGE_BYTES, // M1, SEC-REQ-005
    // Heartbeat: a silently lost connection is detected within 10 s + 10 s (library default 25 s + 20 s),
    // so the disconnected indicator of FR-025 appears during a 30 s outage (TC-009) in every browser,
    // while a client whose main thread is briefly busy (large render) still has 10 s to answer a ping.
    pingInterval: 10_000,
    pingTimeout: 10_000,
    cors: config.clientOrigin ? { origin: config.clientOrigin } : undefined,
    serveClient: false,
    // SEC-REQ-007: Socket.IO bypasses the Express redirect, so with FORCE_HTTPS a real-time connection
    // is refused unless it reached the TLS-terminating proxy over HTTPS (wss://).
    allowRequest: config.forceHttps ? (req, callback) => callback(null, forwardedProto(req) === 'https') : undefined,
  });
  const realtime = new RealtimeServer({ io, config, auth, access, engine, versions, store, queues });

  await new Promise((resolve) => httpServer.listen(config.port, config.host, resolve));
  const { port } = httpServer.address();
  logger.info('server.started', { port, nodeEnv: config.nodeEnv, versionIntervalMs: config.versionIntervalMs, fault: faults.name || null });

  let metricsTimer = null;
  if (config.metricsIntervalMs > 0) {
    metricsTimer = setInterval(() => logger.info('metrics', { ...metrics.snapshot(), connected_sockets: io.of('/board').sockets.size }), config.metricsIntervalMs);
    metricsTimer.unref();
  }

  async function close() {
    clearInterval(metricsTimer);
    realtime.close();
    io.close();
    await new Promise((resolve) => httpServer.close(() => resolve()));
    await queues.idle();
    await disconnectDb();
  }

  return { config, app, httpServer, io, port, url: `http://${config.host}:${port}`, close, services: { auth, access, versions, engine, store, queues, realtime, faults } };
}
