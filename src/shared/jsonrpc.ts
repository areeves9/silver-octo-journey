/**
 * shared/jsonrpc.ts — JSON-RPC 2.0 response utilities.
 *
 * MCP uses JSON-RPC 2.0, so we standardize error responses here.
 */

import type { JsonRpcErrorResponse } from "./types.js";
import { JsonRpcErrorCode } from "./constants.js";

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
