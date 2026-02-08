/**
 * shared/logger.ts — Centralized Pino logging singleton.
 *
 * Provides structured JSON logging with:
 * - Environment-based configuration
 * - Pretty printing in development
 * - Request/response logging middleware
 * - Child loggers for module scoping
 */

import pino from "pino";
import { pinoHttp, type HttpLogger, type Options } from "pino-http";
import type { IncomingMessage, ServerResponse } from "http";
import type { LogLevel } from "./types.js";

// ─── Configuration ───────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== "production";
const level = (process.env.LOG_LEVEL as LogLevel) ?? (isDev ? "debug" : "info");

// ─── Pino Logger Singleton ───────────────────────────────────────────────────

export const logger = pino({
  level,
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined, // JSON output in production
  base: {
    env: process.env.NODE_ENV ?? "development",
  },
});

// ─── HTTP Request Logger Middleware ──────────────────────────────────────────

const httpLoggerOptions: Options = {
  logger,
  // Don't log health checks
  autoLogging: {
    ignore: (req: IncomingMessage) => req.url === "/health",
  },
  // Custom log level based on status code
  customLogLevel: (
    _req: IncomingMessage,
    res: ServerResponse,
    err: Error | undefined
  ) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // Customize what gets logged
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  // Redact sensitive headers
  redact: ["req.headers.authorization", "req.headers.cookie"],
};

export const httpLogger: HttpLogger = pinoHttp(httpLoggerOptions);

// ─── Type Export ─────────────────────────────────────────────────────────────

export type Logger = typeof logger;
export type ChildLogger = ReturnType<typeof logger.child>;
