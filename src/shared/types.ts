/**
 * shared/types.ts — Type definitions for shared utilities.
 */

// ─── Logger Types ────────────────────────────────────────────────────────────

/** Pino-compatible log levels */
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

// ─── JSON-RPC Types ──────────────────────────────────────────────────────────

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
  };
  id: string | number | null;
}
