/**
 * Structured client-side logger for Coup.
 *
 * In development, WARN and ERROR entries are also forwarded to the Vite dev
 * server via POST /dev-log so they appear in the terminal you ran `npm start` from.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.info('Component mounted', { component: 'Coup' });
 *   logger.socket.connected('/ABCDEF');
 *   logger.socket.error(err);
 *
 * VITE_LOG_LEVEL  — controls browser console verbosity (DEBUG|INFO|WARN|ERROR).
 *                   Defaults to INFO in dev, WARN in production.
 */

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const defaultLevel = import.meta.env.MODE === "production" ? "WARN" : "INFO";
const minLevel =
  LEVELS[(import.meta.env.VITE_LOG_LEVEL ?? defaultLevel).toUpperCase()] ??
  LEVELS.INFO;

// In dev mode, forward WARN+ to the Vite terminal via /dev-log endpoint.
const TERMINAL_MIN_LEVEL = LEVELS.WARN;

function sendToTerminal(level, message, meta) {
  if (!import.meta.env.DEV) return;
  if (LEVELS[level] < TERMINAL_MIN_LEVEL) return;
  // fire-and-forget — never throws
  fetch("/dev-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, message, ...meta }),
  }).catch(() => {});
}

function log(level, message, meta = {}) {
  sendToTerminal(level, message, meta);

  if (LEVELS[level] < minLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  switch (level) {
    case "ERROR":
      console.error("[COUP]", entry);
      break;
    case "WARN":
      console.warn("[COUP]", entry);
      break;
    case "DEBUG":
      console.debug("[COUP]", entry);
      break;
    default:
      console.info("[COUP]", entry);
  }
}

const logger = {
  debug: (msg, meta) => log("DEBUG", msg, meta),
  info: (msg, meta) => log("INFO", msg, meta),
  warn: (msg, meta) => log("WARN", msg, meta),
  error: (msg, meta) => log("ERROR", msg, meta),

  /** WebSocket lifecycle helpers */
  socket: {
    connected: (namespace) =>
      log("INFO", "WebSocket connected", { event: "ws_connect", namespace }),
    disconnected: (reason) =>
      log("WARN", "WebSocket disconnected", { event: "ws_disconnect", reason }),
    reconnecting: (attempt) =>
      log("WARN", "WebSocket reconnecting", { event: "ws_reconnect", attempt }),
    error: (err) =>
      log("ERROR", "WebSocket error", {
        event: "ws_error",
        error: String(err),
      }),
    emit: (event, data) =>
      log("DEBUG", "WebSocket emit", { event, payload: data }),
    received: (event, data) =>
      log("DEBUG", "WebSocket received", { event, payload: data }),
  },

  /** React lifecycle helpers */
  lifecycle: {
    mount: (component, meta) =>
      log("DEBUG", "Component mounted", { component, ...meta }),
    unmount: (component) => log("DEBUG", "Component unmounted", { component }),
    error: (component, error, info) =>
      log("ERROR", "Component error boundary triggered", {
        component,
        error: String(error),
        componentStack: info?.componentStack,
      }),
  },
};

export default logger;
