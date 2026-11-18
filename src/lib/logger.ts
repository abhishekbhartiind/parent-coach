/**
 * Minimal structured logger (one JSON object per line).
 *
 * Design rules:
 *  - Logs carry metadata, never parent message content. Sensitive keys are
 *    redacted defensively even if a caller passes them by mistake.
 *  - Errors are serialised with their cause chain; stacks are omitted in
 *    production output.
 *  - `child()` binds context (e.g. requestId) once, so call sites stay clean.
 *  - The sink is injectable so tests can assert on log output.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogData = Record<string, unknown>;

export interface Logger {
  debug(event: string, data?: LogData): void;
  info(event: string, data?: LogData): void;
  warn(event: string, data?: LogData): void;
  error(event: string, data?: LogData): void;
  child(bindings: LogData): Logger;
}

export type LogSink = (level: LogLevel, line: string) => void;

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACTED_KEYS = new Set([
  "content",
  "messages",
  "text",
  "prompt",
  "system",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
]);

const defaultSink: LogSink = (level, line) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export function serializeError(error: unknown, includeStack: boolean, depth = 0): LogData {
  if (!(error instanceof Error)) return { value: String(error) };
  const base: LogData = { name: error.name, message: error.message };
  const code = (error as { code?: unknown }).code;
  const status = (error as { status?: unknown }).status;
  if (code !== undefined) base.code = code;
  if (status !== undefined) base.status = status;
  if (includeStack && error.stack) base.stack = error.stack;
  if (error.cause !== undefined && depth < 3) {
    base.cause = serializeError(error.cause, includeStack, depth + 1);
  }
  return base;
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as LogData).map(([key, val]) => [
      key,
      REDACTED_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(val, depth + 1),
    ]),
  );
}

function parseLevel(raw: string | undefined): LogLevel {
  return raw && raw in LEVEL_WEIGHT ? (raw as LogLevel) : "info";
}

interface CreateLoggerOptions {
  level?: LogLevel;
  bindings?: LogData;
  sink?: LogSink;
  includeStack?: boolean;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const level = options.level ?? parseLevel(process.env.LOG_LEVEL);
  const sink = options.sink ?? defaultSink;
  const bindings = options.bindings ?? {};
  const includeStack = options.includeStack ?? process.env.NODE_ENV !== "production";

  const write = (lvl: LogLevel, event: string, data: LogData = {}) => {
    if (LEVEL_WEIGHT[lvl] < LEVEL_WEIGHT[level]) return;
    const { err, ...rest } = data;
    const entry: LogData = {
      level: lvl,
      time: new Date().toISOString(),
      event,
      ...(redact(bindings) as LogData),
      ...(redact(rest) as LogData),
    };
    if (err !== undefined) entry.err = serializeError(err, includeStack);
    sink(lvl, JSON.stringify(entry));
  };

  return {
    debug: (event, data) => write("debug", event, data),
    info: (event, data) => write("info", event, data),
    warn: (event, data) => write("warn", event, data),
    error: (event, data) => write("error", event, data),
    child: (extra) => createLogger({ level, sink, includeStack, bindings: { ...bindings, ...extra } }),
  };
}

let rootLogger: Logger | undefined;

/** Process-wide logger. Use `.child({...})` for request-scoped context. */
export function getLogger(): Logger {
  rootLogger ??= createLogger({ bindings: { service: "sukoon" } });
  return rootLogger;
}
