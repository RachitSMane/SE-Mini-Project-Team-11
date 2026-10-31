// COMP-03 REST API Layer (API-02, API-03): request IDs, token verification, schema validation,
// rate limiting and central error formatting.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import mongoose from 'mongoose';
import { AppError, errorBody } from '../errors.js';
import { logger, metrics } from '../logger.js';
import { validateBody, validateIdempotencyKey } from '../validation.js';

/** Fixed-window limiter per client IP for link resolution (API-02 lists 429). */
class IpLimiter {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.windows = new Map();
  }

  allow(ip) {
    const now = Date.now();
    const w = this.windows.get(ip);
    if (!w || w.start <= now - this.windowMs) {
      this.windows.set(ip, { start: now, count: 1 });
      if (this.windows.size > 10_000) this.windows.clear();
      return true;
    }
    w.count += 1;
    return w.count <= this.max;
  }
}

function bearer(req) {
  const h = req.get('authorization');
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

function intParam(value, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined) return undefined;
  if (!/^\d{1,9}$/.test(String(value))) throw new AppError('VALIDATION_FAILED', `Invalid ${name}`);
  const n = Number(value);
  if (n < min || n > max) throw new AppError('VALIDATION_FAILED', `Invalid ${name}`);
  return n;
}

export function createApp({ config, auth, access, versions }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  const resolveLimiter = new IpLimiter(30, 60_000);
  // Redirect target from configuration, never from the client-supplied Host header.
  const httpsOrigin = config.forceHttps ? new URL(config.publicUrl).origin : '';
  const connectSrc = config.forceHttps ? "'self' wss:" : "'self' ws: wss:";

  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    req.ctx = { requestId: req.requestId };
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // SEC-REQ-007: in a deployment behind a TLS proxy, redirect plain HTTP to HTTPS.
    if (config.forceHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
      if (req.protocol !== 'https') return res.redirect(308, `${httpsOrigin}${req.originalUrl}`);
    }
    const start = performance.now();
    res.on('finish', () => {
      metrics.inc('http_requests_total', `status=${res.statusCode}`);
      logger.debug('http.request', {
        requestId: req.requestId,
        method: req.method,
        route: req.route?.path || req.path.replace(/[A-Za-z0-9_-]{20,}/g, ':id'),
        status: res.statusCode,
        durationMs: Math.round(performance.now() - start),
      });
    });
    return next();
  });
  app.use('/api', express.json({ limit: '64kb', strict: true }));

  const authenticate =
    ({ sessionOnly = false, optional = false } = {}) =>
    async (req, res, next) => {
      const token = bearer(req);
      if (!token && optional) return next();
      try {
        req.actor = await auth.verifyToken(token);
      } catch (err) {
        logger.security({ event: 'auth.token_rejected', requestId: req.requestId, outcome: 'rejected', reason: 'UNAUTHENTICATED' });
        return next(err);
      }
      if (sessionOnly && req.actor.type !== 'user') return next(new AppError('FORBIDDEN', 'This action requires a registered account.'));
      return next();
    };

  const api = express.Router();

  api.get('/health', async (req, res) => {
    try {
      await mongoose.connection.db.admin().ping();
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'error', db: 'down' });
    }
  });

  // ---- Accounts (FR-040, FR-041) ----
  api.post('/auth/register', async (req, res) => {
    const body = validateBody('register', req.body);
    const user = await auth.register(body);
    res.status(201).json({ userId: String(user._id) });
  });

  api.post('/auth/login', async (req, res) => {
    const body = validateBody('login', req.body);
    res.json(await auth.login(body, req.ctx));
  });

  api.post('/auth/logout', authenticate({ sessionOnly: true }), async (req, res) => {
    await auth.logout(req.actor);
    res.status(204).end();
  });

  // ---- Boards (FR-042 to FR-044) ----
  api.get('/boards', authenticate({ sessionOnly: true }), async (req, res) => {
    res.json(await access.listBoards(req.actor));
  });

  api.post('/boards', authenticate({ sessionOnly: true }), async (req, res) => {
    const { title } = validateBody('createBoard', req.body);
    res.status(201).json(await access.createBoard(req.actor, title));
  });

  api.get('/boards/:boardId', authenticate(), async (req, res) => {
    res.json(await access.getBoard(req.actor, req.params.boardId, req.ctx));
  });

  // Rename (issue #13): Owner only; same title rule as creation.
  api.patch('/boards/:boardId', authenticate(), async (req, res) => {
    const { title } = validateBody('renameBoard', req.body);
    res.json(await access.renameBoard(req.actor, req.params.boardId, title, req.ctx));
  });

  api.delete('/boards/:boardId', authenticate(), async (req, res) => {
    await access.deleteBoard(req.actor, req.params.boardId, req.ctx);
    res.status(204).end();
  });

  // ---- Share links (FR-045 to FR-048) ----
  api.post('/boards/:boardId/links', authenticate(), async (req, res) => {
    const body = validateBody('createLink', req.body);
    res.status(201).json(await access.createLink(req.actor, req.params.boardId, body, req.ctx));
  });

  api.get('/boards/:boardId/links', authenticate(), async (req, res) => {
    res.json(await access.listLinks(req.actor, req.params.boardId, req.ctx));
  });

  api.delete('/boards/:boardId/links/:linkId', authenticate(), async (req, res) => {
    await access.revokeLink(req.actor, req.params.boardId, req.params.linkId, req.ctx);
    res.status(204).end();
  });

  api.post('/links/resolve', authenticate({ optional: true }), async (req, res) => {
    if (!resolveLimiter.allow(req.ip)) throw new AppError('RATE_LIMITED');
    const body = validateBody('resolveLink', req.body);
    const sessionActor = req.actor?.type === 'user' ? req.actor : null;
    res.json(await access.resolveLink(body, sessionActor));
  });

  // ---- Members and ownership (FR-049, FR-050) ----
  api.get('/boards/:boardId/members', authenticate(), async (req, res) => {
    res.json(await access.listMembers(req.actor, req.params.boardId, req.ctx));
  });

  api.patch('/boards/:boardId/members/:userId', authenticate(), async (req, res) => {
    const { role } = validateBody('patchMember', req.body);
    res.json(await access.changeMemberRole(req.actor, req.params.boardId, req.params.userId, role, req.ctx));
  });

  api.delete('/boards/:boardId/members/:userId', authenticate(), async (req, res) => {
    await access.removeMember(req.actor, req.params.boardId, req.params.userId, req.ctx);
    res.status(204).end();
  });

  api.post('/boards/:boardId/transfer-ownership', authenticate(), async (req, res) => {
    res.json(await access.transferOwnership(req.actor, req.params.boardId, req.body, req.ctx));
  });

  // ---- Version history (API-03) ----
  api.get('/boards/:boardId/versions', authenticate(), async (req, res) => {
    const limit = intParam(req.query.limit, 'limit', { min: 1, max: 50 }) ?? 20;
    const before = intParam(req.query.before, 'before');
    res.json(await versions.list(req.actor, req.params.boardId, { limit, before }, req.ctx));
  });

  api.get('/boards/:boardId/versions/:number', authenticate(), async (req, res) => {
    const number = intParam(req.params.number, 'version number');
    res.json(await versions.preview(req.actor, req.params.boardId, number, req.ctx));
  });

  api.post('/boards/:boardId/versions/:number/restore', authenticate(), async (req, res) => {
    const number = intParam(req.params.number, 'version number');
    const key = validateIdempotencyKey(req.get('idempotency-key'));
    const { replay, ...result } = await versions.restore(req.actor, req.params.boardId, number, key, req.ctx);
    res.status(201).json(result);
    if (replay) logger.info('version.restore_replayed', { requestId: req.requestId, boardId: req.params.boardId });
  });

  if (!config.isProduction) {
    api.get('/metrics', (req, res) => res.json(metrics.snapshot()));
  }

  api.use((req, res, next) => next(new AppError('NOT_FOUND')));
  app.use('/api/v1', api);

  // Built client (single-page application) when CLIENT_DIST is configured.
  if (config.clientDist && fs.existsSync(path.join(config.clientDist, 'index.html'))) {
    app.use((req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        `default-src 'self'; connect-src ${connectSrc}; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'`,
      );
      next();
    });
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let error = err;
    if (err?.type === 'entity.too.large') error = new AppError('VALIDATION_FAILED', 'The request body exceeds 64 KiB.');
    else if (err?.type === 'entity.parse.failed') error = new AppError('VALIDATION_FAILED', 'The request body is not valid JSON.');
    else if (!(err instanceof AppError)) logger.error('http.internal_error', { requestId: req.requestId, error: err?.message, stack: err?.stack });
    res.status(error instanceof AppError ? error.status : 500).json({ error: errorBody(error, req.requestId) });
  });

  return app;
}
