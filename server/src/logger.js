// COMP-09 Logging & Monitoring (SAD §4.4): one JSON object per line, security events with a
// field allow-list, redaction of secrets and board content from every other entry.
import fs from 'node:fs';
import path from 'node:path';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

export const SECURITY_EVENTS = new Set([
  'auth.login_failed',
  'auth.token_rejected',
  'auth.rate_limited',
  'authz.denied',
  'link.created',
  'link.revoked',
  'link.expired_disconnect',
  'member.role_changed',
  'member.removed',
  'board.ownership_transferred',
  'version.restored',
  'board.deleted',
]);

const SECURITY_DETAIL_FIELDS = ['role', 'fromRole', 'toRole', 'linkId', 'restoredFrom', 'newVersion'];

// Keys never written to any log entry (passwords, tokens, headers, e-mail, board content).
const REDACT_KEY = /pass(word)?|token|secret|authorization|cookie|email|^text$|points|objects|payload|^state$/i;

export function redact(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (REDACT_KEY.test(k)) continue;
    out[k] = redact(v, depth + 1);
  }
  return out;
}

class Logger {
  constructor() {
    this.level = 'info';
    this.sinks = [(line) => process.stdout.write(`${line}\n`)];
    this.fileStream = null;
  }

  configure({ level, file, stdout = true } = {}) {
    if (level) this.level = level;
    this.sinks = stdout ? [(line) => process.stdout.write(`${line}\n`)] : [];
    if (file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // Synchronous appends: entries survive an abrupt process exit (fault-injection tests).
      this.sinks.push((line) => fs.appendFileSync(file, `${line}\n`));
    }
  }

  /** Additional sink (tests capture log lines in memory). Returns a remover. */
  addSink(fn) {
    this.sinks.push(fn);
    return () => {
      this.sinks = this.sinks.filter((s) => s !== fn);
    };
  }

  write(entry) {
    const line = JSON.stringify(entry);
    for (const sink of this.sinks) sink(line);
  }

  log(level, event, fields = {}) {
    if (LEVELS[level] > LEVELS[this.level]) return;
    const safe = redact(fields);
    this.write({ timestamp: new Date().toISOString(), level, event, ...safe });
  }

  error(event, fields) {
    this.log('error', event, fields);
  }
  warn(event, fields) {
    this.log('warn', event, fields);
  }
  info(event, fields) {
    this.log('info', event, fields);
  }
  debug(event, fields) {
    this.log('debug', event, fields);
  }

  /**
   * Security event record (SEC-REQ-008, D13b). Only allow-listed fields are written.
   * @param {object} r event, requestId, socketId?, actor?, boardId?, subjectId?, outcome, reason?, details?
   */
  security(r) {
    if (!SECURITY_EVENTS.has(r.event)) throw new Error(`Unknown security event ${r.event}`);
    const actor = r.actor || null;
    const entry = {
      timestamp: new Date().toISOString(),
      level: r.outcome === 'success' ? 'info' : 'warn',
      event: r.event,
      security: true,
      requestId: r.requestId || null,
      actorType: actor ? actor.type : 'anonymous',
      actorId: actor ? String(actor.id) : null,
      boardId: r.boardId ? String(r.boardId) : null,
      subjectId: r.subjectId ? String(r.subjectId) : null,
      outcome: r.outcome,
      reason: r.outcome === 'success' ? null : r.reason || null,
    };
    if (r.socketId) entry.socketId = r.socketId;
    if (r.details) {
      const details = {};
      for (const k of SECURITY_DETAIL_FIELDS) if (r.details[k] !== undefined) details[k] = r.details[k];
      if (Object.keys(details).length) entry.details = details;
    }
    this.write(entry);
  }
}

export const logger = new Logger();

/** Minimal in-process metrics (SAD §4.4); written to the log periodically, diagnosis only. */
export const metrics = {
  counters: new Map(),
  latencies: [],
  inc(name, labels = '') {
    const key = labels ? `${name}{${labels}}` : name;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  },
  observe(ms) {
    this.latencies.push(ms);
    if (this.latencies.length > 10_000) this.latencies.splice(0, 5_000);
  },
  snapshot() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p = (q) => (sorted.length ? sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)] : null);
    return {
      counters: Object.fromEntries(this.counters),
      op_server_latency_ms: { count: sorted.length, p50: p(0.5), p95: p(0.95), max: sorted.at(-1) ?? null },
    };
  },
};
