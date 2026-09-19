import pino, { type TransportSingleOptions } from 'pino';

/**
 * Structured server logger (pino).
 *
 * - Both dev and prod write daily-rolled files to LOG_DIR (default `logs/`).
 * - Console: dev shows pino-pretty colored lines; prod emits JSON to stdout
 *   so deployment log collectors (docker/cloud) keep working.
 * - Level: LOG_LEVEL env (default `info`).
 * - Usage: logger.info({ userId }, 'message') — pass an error as `err`:
 *   logger.error({ err }, 'failed to x') so the stack is serialized.
 *
 * Cached on globalThis to survive dev hot-reload without re-spawning
 * pino's transport worker threads.
 */

const level = process.env.LOG_LEVEL ?? 'info';
const logDir = process.env.LOG_DIR ?? 'logs';
const fileTarget: TransportSingleOptions = {
  target: 'pino-roll',
  options: { file: `${logDir}/app.log`, frequency: 'daily', limit: { count: 14 }, mkdir: true },
};

const globalForLogger = globalThis as unknown as { logger?: pino.Logger };

export const logger =
  globalForLogger.logger ??
  (process.env.NODE_ENV === 'production'
    ? pino(
        { level },
        pino.transport({
          targets: [
            { target: 'pino/file', options: { destination: 1 } }, // stdout JSON
            fileTarget,
          ],
        }),
      )
    : pino(
        { level },
        pino.transport({
          targets: [
            { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
            fileTarget,
          ],
        }),
      ));

globalForLogger.logger = logger;
