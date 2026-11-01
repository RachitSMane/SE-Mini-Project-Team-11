// COMP-04 Auth Service (SAD §3.9.2): registration, bcrypt hashing, JWT session and guest tokens,
// logout revocation, failed-login limiter (SEC-REQ-001, -002, -006).
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, RevokedToken, DURABLE } from '../db/models.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';

const SESSION_TTL_SEC = 24 * 60 * 60; // D8c
const GUEST_MAX_TTL_SEC = 24 * 60 * 60;
const LOGIN_FAILURE_MESSAGE = 'Invalid e-mail or password.';

export class LoginLimiter {
  /** 5 failed logins per entered e-mail (lower-cased) per 15 minutes, keyed by an HMAC (D8b). */
  constructor(hmacKey, { max = 5, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
    this.hmacKey = hmacKey;
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.failures = new Map(); // hmac -> timestamps
  }

  key(email) {
    return crypto.createHmac('sha256', this.hmacKey).update(String(email).trim().toLowerCase()).digest('hex');
  }

  recent(key) {
    const cutoff = this.now() - this.windowMs;
    const list = (this.failures.get(key) || []).filter((t) => t > cutoff);
    if (list.length) this.failures.set(key, list);
    else this.failures.delete(key);
    return list;
  }

  isLimited(email) {
    return this.recent(this.key(email)).length >= this.max;
  }

  recordFailure(email) {
    const key = this.key(email);
    const list = this.recent(key);
    list.push(this.now());
    this.failures.set(key, list);
  }
}

export class AuthService {
  constructor(config) {
    this.config = config;
    this.limiter = new LoginLimiter(config.loginHmacKey);
    // Fixed dummy hash: unknown e-mail addresses still cost one bcrypt comparison (D8b).
    this.dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), config.bcryptCost);
  }

  async register({ email, password, displayName }) {
    const normalized = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, this.config.bcryptCost);
    try {
      const user = await User.create([{ email: normalized, passwordHash, displayName: displayName.trim() }], DURABLE);
      return user[0];
    } catch (err) {
      if (err?.code === 11000) throw new AppError('EMAIL_TAKEN');
      throw err;
    }
  }

  /** Returns {token, expiresAt, user}. Failures: identical 401 for wrong password or unknown e-mail. */
  async login({ email, password }, ctx) {
    const normalized = String(email).trim().toLowerCase();
    if (this.limiter.isLimited(normalized)) {
      logger.security({ event: 'auth.rate_limited', requestId: ctx.requestId, outcome: 'rejected', reason: 'RATE_LIMITED' });
      throw new AppError('RATE_LIMITED');
    }
    const user = await User.findOne({ email: normalized }).lean();
    const ok = await bcrypt.compare(String(password), user ? user.passwordHash : this.dummyHash);
    if (!user || !ok) {
      this.limiter.recordFailure(normalized);
      logger.security({
        event: 'auth.login_failed',
        requestId: ctx.requestId,
        subjectId: user ? user._id : null,
        outcome: 'rejected',
        reason: 'UNAUTHENTICATED',
      });
      throw new AppError('UNAUTHENTICATED', LOGIN_FAILURE_MESSAGE);
    }
    return this.issueSession(user);
  }

  issueSession(user) {
    const jti = crypto.randomUUID();
    const token = jwt.sign({ typ: 'session', jti }, this.config.jwtSecret, {
      algorithm: 'HS256',
      subject: String(user._id),
      expiresIn: SESSION_TTL_SEC,
    });
    const { exp } = jwt.decode(token);
    return {
      token,
      expiresAt: new Date(exp * 1000).toISOString(),
      user: { id: String(user._id), displayName: user.displayName },
    };
  }

  /** Guest token bound to one board; expires at min(link expiry, issue + 24 h) (SEC-REQ-002). */
  issueGuestToken(link, displayName) {
    const guestId = `g_${crypto.randomUUID().replace(/-/g, '')}`;
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = Math.min(Math.floor(link.expiresAt.getTime() / 1000), nowSec + GUEST_MAX_TTL_SEC);
    const token = jwt.sign(
      { typ: 'guest', guestId, boardId: String(link.boardId), linkId: String(link._id), name: displayName.trim(), exp },
      this.config.jwtSecret,
      { algorithm: 'HS256' },
    );
    return { guestToken: token, guestId, expiresAt: new Date(exp * 1000).toISOString() };
  }

  /**
   * Verifies signature, expiry, type and revocation. Returns the actor:
   * {type:'user', id, displayName, jti, exp} or {type:'guest', id, displayName, boardId, linkId, exp}.
   */
  async verifyToken(token) {
    if (!token || typeof token !== 'string') throw new AppError('UNAUTHENTICATED');
    let claims;
    try {
      claims = jwt.verify(token, this.config.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw new AppError('UNAUTHENTICATED');
    }
    if (claims.typ === 'session') {
      if (!claims.sub || !claims.jti) throw new AppError('UNAUTHENTICATED');
      const [revoked, user] = await Promise.all([
        RevokedToken.exists({ jti: claims.jti }),
        User.findById(claims.sub, { displayName: 1 }).lean().catch(() => null),
      ]);
      if (revoked || !user) throw new AppError('UNAUTHENTICATED');
      return { type: 'user', id: String(user._id), displayName: user.displayName, jti: claims.jti, exp: claims.exp };
    }
    if (claims.typ === 'guest') {
      if (!claims.guestId || !claims.boardId || !claims.linkId) throw new AppError('UNAUTHENTICATED');
      return {
        type: 'guest',
        id: claims.guestId,
        displayName: claims.name,
        boardId: claims.boardId,
        linkId: claims.linkId,
        exp: claims.exp,
      };
    }
    throw new AppError('UNAUTHENTICATED');
  }

  /** True while the token behind an already verified actor is unexpired and not revoked. */
  async stillValid(actor) {
    if (actor.exp * 1000 <= Date.now()) return false;
    if (actor.type === 'user') return !(await RevokedToken.exists({ jti: actor.jti }));
    return true;
  }

  async logout(actor) {
    await RevokedToken.updateOne(
      { jti: actor.jti },
      { $setOnInsert: { jti: actor.jti, expiresAt: new Date(actor.exp * 1000) } },
      { upsert: true, ...DURABLE },
    );
  }
}
