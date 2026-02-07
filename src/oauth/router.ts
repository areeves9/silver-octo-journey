/**
 * oauth/router.ts — OAuth/OIDC Forwarding Endpoints.
 *
 * Acts as a front door for OAuth flows. Clients talk to this server,
 * which redirects/proxies to the actual auth provider (Auth0).
 */

import { Router, type Request, type Response } from "express";
import type { OAuthProxyConfig } from "./types.js";
import { buildOpenIdConfiguration, buildOAuthServerMetadata } from "./metadata.js";

/**
 * Proxy a POST request to an upstream URL.
 */
async function proxyPost(
  targetUrl: string,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const contentType = req.headers["content-type"] ?? "application/json";

    let body: string;
    if (contentType.includes("application/json")) {
      body = JSON.stringify(req.body);
    } else {
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

/**
 * Create an Express Router with OAuth/OIDC forwarding endpoints.
 */
export function createOAuthRouter(config: OAuthProxyConfig): Router {
  const router = Router();
  const { serverUrl, auth0 } = config;

  // Auth0's actual endpoints
  const auth0Authorize = `https://${auth0.domain}/authorize`;
  const auth0Token = `https://${auth0.domain}/oauth/token`;
  const auth0Register = `https://${auth0.domain}/oidc/register`;

  // Metadata config for discovery endpoints
  const metadataConfig = { serverUrl, jwksUri: auth0.jwksUri };

  // ─── Discovery Endpoints ─────────────────────────────────────────────

  router.get("/.well-known/openid-configuration", (_req, res) => {
    res.json(buildOpenIdConfiguration(metadataConfig));
  });

  router.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json(buildOAuthServerMetadata(metadataConfig));
  });

  // ─── OAuth Flow Endpoints ────────────────────────────────────────────

  router.get("/authorize", (req, res) => {
    const params = new URLSearchParams(req.query as Record<string, string>);
    if (!params.has("audience")) {
      params.set("audience", auth0.audience);
    }
    const targetUrl = `${auth0Authorize}?${params.toString()}`;
    res.redirect(302, targetUrl);
  });

  router.post("/token", async (req, res) => {
    await proxyPost(auth0Token, req, res);
  });

  router.post("/register", async (req, res) => {
    await proxyPost(auth0Register, req, res);
  });

  router.get("/logout", (req, res) => {
    const params = new URLSearchParams(req.query as Record<string, string>);
    const targetUrl = `https://${auth0.domain}/v2/logout?${params.toString()}`;
    res.redirect(302, targetUrl);
  });

  return router;
}
