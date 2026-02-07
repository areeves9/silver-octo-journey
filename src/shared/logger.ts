/**
 * shared/logger.ts — Centralized logging singleton.
 *
 * Provides structured logging with consistent formatting.
 * Can be extended to use pino, winston, etc. in the future.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private minLevel: LogLevel;
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(minLevel: LogLevel = "info") {
    this.minLevel = minLevel;
  }

  /**
   * Set the minimum log level.
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Create a child logger scoped to a module.
   */
  child(module: string): ModuleLogger {
    return new ModuleLogger(this, module);
  }

  /**
   * Internal log method.
   */
  log(entry: LogEntry): void {
    if (this.levelPriority[entry.level] < this.levelPriority[this.minLevel]) {
      return;
    }

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;
    const message = entry.data
      ? `${prefix} ${entry.message} ${JSON.stringify(entry.data)}`
      : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case "error":
        console.error(message);
        break;
      case "warn":
        console.warn(message);
        break;
      default:
        console.log(message);
    }
  }
}

class ModuleLogger {
  constructor(
    private readonly parent: Logger,
    private readonly module: string
  ) {}

  private createEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): LogEntry {
    return {
      level,
      module: this.module,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.parent.log(this.createEntry("debug", message, data));
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.parent.log(this.createEntry("info", message, data));
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.parent.log(this.createEntry("warn", message, data));
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.parent.log(this.createEntry("error", message, data));
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

/**
 * Global logger singleton.
 * Use logger.child("module-name") to create scoped loggers.
 */
export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) ?? "info"
);

export type { ModuleLogger };
