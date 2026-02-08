/**
 * oauth/constants.ts — Constants for OAuth module.
 */

export const SCOPES_SUPPORTED = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

export const TOKEN_AUTH_METHODS = [
  "client_secret_basic",
  "client_secret_post",
  "none",
] as const;

export const RESPONSE_TYPES_SUPPORTED = ["code"] as const;

export const GRANT_TYPES_SUPPORTED = [
  "authorization_code",
  "refresh_token",
] as const;

export const CODE_CHALLENGE_METHODS = ["S256"] as const;
