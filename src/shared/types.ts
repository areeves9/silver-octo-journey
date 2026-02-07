/**
 * shared/types.ts — Type definitions for shared utilities.
 */

// ─── Logger Types ────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// ─── JSON-RPC Types ──────────────────────────────────────────────────────────

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
  };
  id: string | number | null;
}
