/**
 * app.ts — Express application factory.
 *
 * Creates and configures the Express app with all middleware and routes.
 * This factory pattern enables:
 * - Testing without starting the server
 * - Submounting into larger applications
 * - Multiple instances with different configs
 */

import express, { type Express } from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { logger } from "./shared/index.js";
import { jsonRpcError, JsonRpcErrorCode } from "./shared/index.js";
import { jwtAuth } from "./auth/index.js";
import { createOAuthRouter } from "./oauth/index.js";
import { server, handleMcpRequest } from "./mcp/index.js";
import { registerAllTools } from "./tools/index.js";

const log = logger.child("app");

/**
 * Create and configure the Express application.
 *
 * @returns Configured Express app ready to listen or mount
 */
export function createApp(): Express {
  const app = express();

  // Register tools on the MCP server
  registerAllTools(server);

  // ─── 1. CORS ────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: true,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id"],
      exposedHeaders: ["Mcp-Session-Id"],
      credentials: true,
    })
  );

  // ─── 2. Body Parsing ────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ─── 3. JWT Auth ────────────────────────────────────────────────────────────
  app.use(jwtAuth());

  // ─── 4. Routes ──────────────────────────────────────────────────────────────

  // Health check (public)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // OAuth proxy routes (public)
  app.use(
    createOAuthRouter({
      serverUrl: config.serverUrl,
      auth0: config.auth0,
    })
  );

  // Protected Resource Metadata (RFC 9728)
  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({
      resource: config.serverUrl,
      authorization_servers: [config.serverUrl],
      scopes_supported: ["openid", "profile", "email", "offline_access"],
      bearer_methods_supported: ["header"],
    });
  });

  // MCP endpoint (protected)
  app.all("/mcp", async (req, res) => {
    await handleMcpRequest(req, res, server);
  });

  // ─── 5. Error Handler ───────────────────────────────────────────────────────
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      log.error("Unhandled error", { error: err.message, stack: err.stack });
      if (!res.headersSent) {
        res
          .status(500)
          .json(
            jsonRpcError(
              JsonRpcErrorCode.INTERNAL_ERROR,
              "Internal server error"
            )
          );
      }
    }
  );

  return app;
}
