/**
 * auth.ts — JWT validation middleware + public path exclusions.
 *
 * Uses `jose` to verify Auth0-issued JWTs against their JWKS endpoint.
 * createRemoteJWKSet handles all key fetching and caching internally
 * (30s cooldown, 10min max age — no custom caching code needed).
 *
 * Public paths (health, OAuth discovery/flow endpoints) skip auth entirely.
 * Protected paths (like /mcp) require a valid Bearer token.
 *
 * Error responses use JSON-RPC 2.0 format since MCP uses JSON-RPC.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import { jsonRpcError, JsonRpcErrorCode } from "./jsonrpc.js";

// ─── Type Augmentation ────────────────────────────────────────────────────────
// Attach MCP SDK's AuthInfo to req.auth so downstream handlers + transport
// see the correct type. This must match what StreamableHTTPServerTransport expects.

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthInfo;
  }
}

// ─── JWKS Setup (module-level singleton) ──────────────────────────────────────
// Fetches keys lazily on first use, then caches automatically.

const JWKS = createRemoteJWKSet(new URL(config.auth0.jwksUri));

// ─── Public Paths ─────────────────────────────────────────────────────────────
// These paths skip JWT validation entirely. O(1) Set lookup.

const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  "/health",
  "/.well-known/openid-configuration",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/authorize",
  "/token",
  "/register",
  "/logout",
]);

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express middleware that validates JWT Bearer tokens.
 *
 * - Public paths: skipped, calls next() immediately
 * - Missing/invalid token: returns 401 JSON-RPC error
 * - Valid token: attaches AuthInfo to req.auth (MCP SDK shape), calls next()
 *
 * Auth0 JWT claims used:
 *   - azp (authorized party) → clientId
 *   - scope (space-delimited string) → scopes[]
 *   - exp (expiration) → expiresAt
 */
export function jwtAuth() {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // 1. Skip public paths
    if (PUBLIC_PATHS.has(req.path)) {
      return next();
    }

    // 2. Extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json(
          jsonRpcError(
            JsonRpcErrorCode.AUTH_ERROR,
            "Missing or invalid Authorization header"
          )
        );
      return;
    }

    const token = authHeader.slice(7);

    // 3. Verify JWT against Auth0 JWKS
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: config.auth0.issuerUrl,
        audience: config.auth0.audience,
        algorithms: ["RS256"],
      });

      // 4. Build AuthInfo (MCP SDK expected shape) from JWT claims
      const authInfo: AuthInfo = {
        token,
        clientId: (payload.azp as string) ?? (payload.sub as string) ?? "unknown",
        scopes: typeof payload.scope === "string"
          ? payload.scope.split(" ")
          : [],
        expiresAt: payload.exp,
      };

      req.auth = authInfo;
      next();
    } catch {
      res
        .status(401)
        .json(
          jsonRpcError(JsonRpcErrorCode.AUTH_ERROR, "Invalid or expired token")
        );
    }
  };
}
