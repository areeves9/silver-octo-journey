/**
 * oauth-proxy.ts — OAuth/OIDC Forwarding Endpoints
 *
 * This mirrors your drund_mcp_orchestrator/oauth.py exactly:
 * - /.well-known/openid-configuration      → constructed from Auth0 metadata
 * - /.well-known/oauth-authorization-server → same, RFC 8414 format
 * - /authorize                              → redirect to Auth0
 * - /token                                  → proxy POST to Auth0
 * - /register                               → proxy POST to Auth0 (DCR)
 *
 * Your MCP server acts as the FRONT DOOR. Clients talk to you,
 * you redirect/proxy to Auth0. This is identical to what you built
 * for Cognito — the provider is irrelevant, the pattern is the same.
 *
 * Why proxy instead of just pointing clients at Auth0 directly?
 * 1. Single origin — clients only need YOUR server URL
 * 2. You control the metadata — you decide which scopes/grants to advertise
 * 3. You can swap providers (Auth0 → Cognito → Keycloak) without clients knowing
 * 4. MCP clients expect these endpoints at the authorization_server URL
 *    from your Protected Resource Metadata, which points to YOUR server
 */

import { Router, type Request, type Response } from "express";
import { config } from "./config.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Proxy a POST request to Auth0.
 *
 * Forwards the request body and content-type, returns Auth0's response.
 * This is the equivalent of your Python httpx.AsyncClient() proxy calls.
 *
 * We use native fetch (Node 18+) — no axios/got dependency needed.
 */
async function proxyPost(
  targetUrl: string,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const contentType = req.headers["content-type"] ?? "application/json";

    // Forward the raw body. For /token it's usually application/x-www-form-urlencoded.
    // For /register it's application/json.
    let body: string;
    if (contentType.includes("application/json")) {
      body = JSON.stringify(req.body);
    } else {
      // x-www-form-urlencoded — Express parsed it into req.body as object,
      // we need to re-encode it.
      body = new URLSearchParams(
        req.body as Record<string, string>
      ).toString();
    }

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    });

    const responseBody = await upstream.text();
    res.status(upstream.status).type("application/json").send(responseBody);
  } catch (error) {
    console.error(`[oauth-proxy] Proxy to ${targetUrl} failed:`, error);
    res.status(502).json({
      error: "proxy_error",
      error_description: `Failed to reach authorization server: ${targetUrl}`,
    });
  }
}

// ─── Router Factory ─────────────────────────────────────────────────────────

/**
 * Create an Express Router with all OAuth/OIDC forwarding endpoints.
 *
 * This is the TypeScript equivalent of your Starlette Route() list in oauth.py.
 *
 * Usage:
 *   app.use(createOAuthProxyRouter());
 */
export function createOAuthProxyRouter(): Router {
  const router = Router();
  const serverUrl = config.serverUrl;

  // Auth0's actual endpoints
  const auth0Authorize = `https://${config.auth0.domain}/authorize`;
  const auth0Token = `https://${config.auth0.domain}/oauth/token`;
  const auth0Jwks = config.auth0.jwksUri;
  const auth0Register = `https://${config.auth0.domain}/oidc/register`;

  const scopesSupported = ["openid", "profile", "email", "offline_access"];

  // ─── Discovery: OpenID Connect Configuration ──────────────────────────
  router.get(
    "/.well-known/openid-configuration",
    (_req: Request, res: Response) => {
      res.json({
        issuer: serverUrl,
        authorization_endpoint: `${serverUrl}/authorize`,
        token_endpoint: `${serverUrl}/token`,
        registration_endpoint: `${serverUrl}/register`,
        end_session_endpoint: `${serverUrl}/logout`,
        jwks_uri: auth0Jwks,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: scopesSupported,
        token_endpoint_auth_methods_supported: [
          "client_secret_basic",
          "client_secret_post",
          "none",
        ],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
      });
    }
  );

  // ─── Discovery: OAuth Authorization Server Metadata (RFC 8414) ────────
  router.get(
    "/.well-known/oauth-authorization-server",
    (_req: Request, res: Response) => {
      res.json({
        issuer: serverUrl,
        authorization_endpoint: `${serverUrl}/authorize`,
        token_endpoint: `${serverUrl}/token`,
        registration_endpoint: `${serverUrl}/register`,
        end_session_endpoint: `${serverUrl}/logout`,
        jwks_uri: auth0Jwks,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: scopesSupported,
        token_endpoint_auth_methods_supported: [
          "client_secret_basic",
          "client_secret_post",
          "none",
        ],
      });
    }
  );

  // ─── /authorize → Redirect to Auth0 ──────────────────────────────────
  router.get("/authorize", (req: Request, res: Response) => {
    const params = new URLSearchParams(
      req.query as Record<string, string>
    );

    if (!params.has("audience")) {
      params.set("audience", config.auth0.audience);
    }

    const targetUrl = `${auth0Authorize}?${params.toString()}`;
    console.log(`[oauth-proxy] /authorize → redirect to Auth0`);
    res.redirect(302, targetUrl);
  });

  // ─── /token → Proxy to Auth0 ─────────────────────────────────────────
  router.post("/token", async (req: Request, res: Response) => {
    console.log(`[oauth-proxy] /token → proxy to Auth0`);
    await proxyPost(auth0Token, req, res);
  });

  // ─── /register → Proxy to Auth0 (Dynamic Client Registration) ────────
  router.post("/register", async (req: Request, res: Response) => {
    console.log(`[oauth-proxy] /register → proxy to Auth0 DCR`);
    await proxyPost(auth0Register, req, res);
  });

  // ─── /logout → Redirect to Auth0 ────────────────────────────────────
  router.get("/logout", (req: Request, res: Response) => {
    const params = new URLSearchParams(
      req.query as Record<string, string>
    );

    const targetUrl = `https://${config.auth0.domain}/v2/logout?${params.toString()}`;
    console.log(`[oauth-proxy] /logout → redirect to Auth0`);
    res.redirect(302, targetUrl);
  });

  return router;
}
