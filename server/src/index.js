// Process entry point: `node src/index.js` (reads server/.env when present).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js';
import { logger } from './logger.js';

const envFile = process.env.ENV_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

try {
  const server = await startServer();
  const shutdown = async (signal) => {
    logger.info('server.stopping', { signal });
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  // Includes failed start-up recovery: exit non-zero without accepting connections (SAD §3.6).
  logger.error('server.start_failed', { error: err.message });
  process.exit(1);
}
