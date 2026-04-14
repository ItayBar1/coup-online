/**
 * Structured JSON logger for the Coup server.
 *
 * Log levels (ascending severity): DEBUG < INFO < WARN < ERROR
 * Set LOG_LEVEL env var to control minimum output (default: "info").
 *
 * Output format: one JSON object per line, e.g.:
 *   {"timestamp":"2026-04-14T12:00:00.000Z","level":"INFO","message":"...","correlationId":"..."}
 */

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const minLevel =
  LEVELS[(process.env.LOG_LEVEL ?? "info").toUpperCase()] ?? LEVELS.INFO;

function log(level, message, meta = {}) {
  if (LEVELS[level] < minLevel) return;

  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });

  if (level === "ERROR") {
    console.error(entry);
  } else if (level === "WARN") {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

module.exports = {
  debug: (msg, meta) => log("DEBUG", msg, meta),
  info: (msg, meta) => log("INFO", msg, meta),
  warn: (msg, meta) => log("WARN", msg, meta),
  error: (msg, meta) => log("ERROR", msg, meta),
};
