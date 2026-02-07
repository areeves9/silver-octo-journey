/**
 * jsonrpc.ts — JSON-RPC 2.0 response utilities.
 *
 * MCP uses JSON-RPC 2.0, so we standardize error responses here.
 * This eliminates duplicate error object construction across the codebase.
 */

/** Standard JSON-RPC 2.0 error codes used in this server */
export const JsonRpcErrorCode = {
  /** Authentication/authorization errors */
  AUTH_ERROR: -32000,
  /** Internal server errors */
  INTERNAL_ERROR: -32603,
} as const;

export type JsonRpcErrorCode =
  (typeof JsonRpcErrorCode)[keyof typeof JsonRpcErrorCode];

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
  };
  id: string | number | null;
}

/**
 * Build a JSON-RPC 2.0 error response object.
 */
export function jsonRpcError(
  code: JsonRpcErrorCode,
  message: string,
  id: string | number | null = null
): JsonRpcErrorResponse {
  return {
    jsonrpc: "2.0",
    error: { code, message },
    id,
  };
}
