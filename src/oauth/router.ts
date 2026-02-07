/**
 * oauth/router.ts — OAuth/OIDC Forwarding Endpoints.
 *
 * Acts as a front door for OAuth flows. Clients talk to this server,
 * which redirects/proxies to the actual auth provider (Auth0).
 */

import { Router, type Request, type Response } from "express";
import type { OAuthProxyConfig } from "./types.js";
import { buildOpenIdConfiguration, buildOAuthServerMetadata } from "./metadata.js";
import { logger } from "../shared/index.js";

const log = logger.child({ module: "oauth-proxy" });

/**
 * Extract client credentials from Basic auth header.
 * Returns { clientId, clientSecret } or null if not present.
 */
function extractBasicAuth(
  authHeader: string | undefined
): { clientId: string; clientSecret: string } | null {
  if (!authHeader?.startsWith("Basic ")) {
    return null;
  }
  try {
    const encoded = authHeader.slice(6); // Remove "Basic "
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const [clientId, clientSecret = ""] = decoded.split(":");
    return clientId ? { clientId, clientSecret } : null;
  } catch {
    return null;
  }
}

/**
 * Proxy a POST request to an upstream URL.
 * Extracts Basic auth credentials and adds them to the body for Auth0.
 */
async function proxyPost(
  targetUrl: string,
  req: Request,
  res: Response
): Promise<void> {
  try {
    const contentType = req.headers["content-type"] ?? "application/json";

    // Extract client credentials from Basic auth header if present
    const basicAuth = extractBasicAuth(req.headers.authorization);

    // Build the body, injecting client credentials from Basic auth
    let bodyParams: Record<string, string> = { ...req.body };
    if (basicAuth) {
      if (!bodyParams.client_id) {
        bodyParams.client_id = basicAuth.clientId;
      }
      if (!bodyParams.client_secret && basicAuth.clientSecret) {
        bodyParams.client_secret = basicAuth.clientSecret;
      }
    }

    let body: string;
    if (contentType.includes("application/json")) {
      body = JSON.stringify(bodyParams);
    } else {
      body = new URLSearchParams(bodyParams).toString();
    }

    // Log the outgoing request (redact sensitive data)
    const redactedBody = body.replace(
      /client_secret=[^&]+/g,
      "client_secret=[REDACTED]"
    );
    log.debug(
      { targetUrl, contentType, body: redactedBody },
      "Proxying request to Auth0"
    );

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    });

    const responseBody = await upstream.text();

    // Log the response (especially errors)
    if (upstream.status >= 400) {
      log.warn(
        { targetUrl, status: upstream.status, response: responseBody },
        "Auth0 returned error response"
      );
    } else {
      log.debug({ targetUrl, status: upstream.status }, "Auth0 request successful");
    }

    res.status(upstream.status).type("application/json").send(responseBody);
  } catch (error) {
    log.error({ err: error, targetUrl }, "Proxy to Auth0 failed");
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
    log.debug(
      {
        clientId: params.get("client_id"),
        redirectUri: params.get("redirect_uri"),
        scope: params.get("scope"),
      },
      "Redirecting to Auth0 authorize"
    );
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
