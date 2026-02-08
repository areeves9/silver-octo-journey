/**
 * auth/constants.ts — Constants for auth module.
 */

/**
 * Paths that skip JWT validation.
 * O(1) Set lookup for performance.
 */
export const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  "/health",
  "/.well-known/openid-configuration",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/authorize",
  "/token",
  "/register",
  "/logout",
]);
