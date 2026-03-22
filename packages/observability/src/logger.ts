/**
 * Structured JSON logger for Code-Kit-Ultra.
 * All logs are emitted as newline-delimited JSON to satisfy the
 * HeliosOS Observability Rule (structured format requirement).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  data?: Record<string, unknown>;
}

export interface LoggerOptions {
  service?: string;
  minLevel?: LogLevel;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "error" || entry.level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

function buildEntry(
  level: LogLevel,
  message: string,
  service: string | undefined,
  data?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(service ? { service } : {}),
    ...(data ? { data } : {}),
  };
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const service = options.service;
  const minLevel: LogLevel = options.minLevel ?? "info";

  return {
    debug(message, data) {
      if (shouldLog("debug", minLevel)) {
        emit(buildEntry("debug", message, service, data));
      }
    },
    info(message, data) {
      if (shouldLog("info", minLevel)) {
        emit(buildEntry("info", message, service, data));
      }
    },
    warn(message, data) {
      if (shouldLog("warn", minLevel)) {
        emit(buildEntry("warn", message, service, data));
      }
    },
    error(message, data) {
      if (shouldLog("error", minLevel)) {
        emit(buildEntry("error", message, service, data));
      }
    },
  };
}

/**
 * Default logger instance for convenience.
 */
export const logger: Logger = createLogger({ service: "code-kit-ultra" });
