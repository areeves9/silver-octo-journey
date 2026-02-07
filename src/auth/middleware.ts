/**
 * auth/middleware.ts — JWT validation middleware.
 *
 * Uses `jose` to verify Auth0-issued JWTs against their JWKS endpoint.
 * Public paths skip auth entirely. Protected paths require valid Bearer token.
 *
 * Error responses use JSON-RPC 2.0 format since MCP uses JSON-RPC.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";
import { jsonRpcError, JsonRpcErrorCode } from "../shared/index.js";

// ─── Type Augmentation ────────────────────────────────────────────────────────

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthInfo;
  }
}

// ─── JWKS Setup (module-level singleton) ──────────────────────────────────────

const JWKS = createRemoteJWKSet(new URL(config.auth0.jwksUri));

// ─── Public Paths ─────────────────────────────────────────────────────────────

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
        clientId:
          (payload.azp as string) ?? (payload.sub as string) ?? "unknown",
        scopes:
          typeof payload.scope === "string" ? payload.scope.split(" ") : [],
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
