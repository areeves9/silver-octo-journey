/**
 * shared/constants.ts — Constants for shared utilities.
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
