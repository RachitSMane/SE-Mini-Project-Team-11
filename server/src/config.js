import path from 'node:path';

// Environment-based configuration. Values are read when loadConfig() is called so that tests can
// start several in-process servers with different settings.
const DEFAULT_VERSION_INTERVAL_MS = 5 * 60 * 1000; // D11a

function int(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) throw new Error(`Invalid integer configuration value: ${value}`);
  return n;
}

export function loadConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };
  const nodeEnv = env.NODE_ENV || 'development';
  const isTest = nodeEnv === 'test';
  const config = {
    nodeEnv,
    isTest,
    isProduction: nodeEnv === 'production',
    port: int(env.PORT, 4000),
    host: env.HOST || '127.0.0.1',
    mongoUrl: env.MONGO_URL || 'mongodb://127.0.0.1:27017/whiteboard',
    jwtSecret: env.JWT_SECRET,
    loginHmacKey: env.LOGIN_HMAC_KEY,
    bcryptCost: int(env.BCRYPT_COST, 12), // D13a
    publicUrl: (env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, ''),
    clientOrigin: env.CLIENT_ORIGIN || '',
    // Absolute: res.sendFile() rejects relative paths (CLIENT_DIST is relative to the working directory).
    clientDist: env.CLIENT_DIST ? path.resolve(env.CLIENT_DIST) : '',
    versionIntervalMs: int(env.VERSION_INTERVAL_MS, DEFAULT_VERSION_INTERVAL_MS),
    versionRetention: 20, // D5a
    logLevel: env.LOG_LEVEL || (nodeEnv === 'development' ? 'debug' : 'info'),
    logFile: env.LOG_FILE || '',
    metricsIntervalMs: int(env.METRICS_INTERVAL_MS, isTest ? 0 : 10_000),
    trustProxy: env.TRUST_PROXY === 'true',
    forceHttps: env.FORCE_HTTPS === 'true',
    // Test hooks (SAD §4.1.6) are honoured only when NODE_ENV=test.
    linkExpiryOverrideSec: isTest ? int(env.LINK_EXPIRY_OVERRIDE_SEC, 0) : 0,
    faultInject: isTest ? env.FAULT_INJECT || '' : '',
  };
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
  }
  if (!config.loginHmacKey || config.loginHmacKey.length < 32) {
    throw new Error('LOGIN_HMAC_KEY must be set to a random value of at least 32 characters');
  }
  if (config.bcryptCost < 4 || config.bcryptCost > 15) throw new Error('BCRYPT_COST must be 4..15');
  if (config.isProduction && config.bcryptCost < 12) {
    throw new Error('BCRYPT_COST below 12 is not allowed in production (D13a)');
  }
  // SEC-REQ-007: HTTPS is recognised from X-Forwarded-Proto, which is trusted only with TRUST_PROXY;
  // without it every request looks like plain HTTP and is redirected in a loop. The redirect target and
  // the share links are built from PUBLIC_URL, so it must be an https:// URL.
  if (config.forceHttps && !config.trustProxy) {
    throw new Error('FORCE_HTTPS=true requires TRUST_PROXY=true (a TLS-terminating proxy in front of the server)');
  }
  if (config.forceHttps && !/^https:\/\/[^/]/.test(config.publicUrl)) {
    throw new Error('FORCE_HTTPS=true requires PUBLIC_URL to be an https:// URL');
  }
  return config;
}
