// FAULT_INJECT test hook (SAD §4.1.6): stops the process or fails database writes at a chosen
// point of a clear, a restore or start-up recovery. Honoured only when NODE_ENV=test.
import { logger } from './logger.js';

export const CRASH_POINTS = new Set([
  'after_preclear_version',
  'after_pending_clear',
  'during_object_delete',
  'after_pending_restore',
  'after_version_insert',
  'during_object_replace',
  'after_complete',
]);
export const ERROR_POINTS = new Set(['version_write_error', 'commit_write_error']);
export const MODES = new Set([...CRASH_POINTS, ...ERROR_POINTS, 'db_error_after_commit', 'recovery_db_error']);

export class Faults {
  constructor(name = '') {
    if (name && !MODES.has(name)) throw new Error(`Unknown FAULT_INJECT value ${name}`);
    this.name = name;
    this.dbBroken = false;
    this.inRecovery = false;
    if (name) logger.warn('fault.armed', { fault: name });
  }

  /** Stops the process abruptly (simulated crash) if this crash point is armed. */
  crashAt(point) {
    if (this.name !== point) return;
    logger.error('fault.crash', { fault: point });
    process.exit(86);
  }

  /** Throws a simulated database error if this error point is armed. */
  errorAt(point) {
    if (this.name === point) throw new Error(`Injected database error at ${point}`);
  }

  /** Called at the commit point: from now on every guarded write fails (db_error_after_commit). */
  committed() {
    if (this.name === 'db_error_after_commit') this.dbBroken = true;
  }

  /** Guard placed before each database write of steps 4–6 and of start-up recovery. */
  guardWrite() {
    if (this.dbBroken) throw new Error('Injected database error after commit');
    if (this.inRecovery && this.name === 'recovery_db_error') throw new Error('Injected database error during recovery');
  }
}
