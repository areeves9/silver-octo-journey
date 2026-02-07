#!/usr/bin/env node

/**
 * index.ts — Express app, middleware wiring, HTTP transport.
 *
 * Middleware order:
 *   1. CORS (preflight must resolve first)
 *   2. Body parsing (json + urlencoded for OAuth /token)
 *   3. JWT auth (skips public paths, validates on protected paths)
 *   4. Routes (health, OAuth proxy, protected resource metadata, /mcp)
 *   5. Error handler
 *
 * The /mcp endpoint uses StreamableHTTPServerTransport from the MCP SDK.
 */

import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { jwtAuth } from "./auth.js";
import { createOAuthProxyRouter } from "./oauth-proxy.js";
import { server } from "./server.js";
import { handleMcpRequest } from "./mcp-handler.js";
import { jsonRpcError, JsonRpcErrorCode } from "./jsonrpc.js";

// Side-effect import: registers tools on the server instance
import "./tools.js";

const app = express();

// ─── 1. CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id"],
    exposedHeaders: ["Mcp-Session-Id"],
    credentials: true,
  })
);

// ─── 2. Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── 3. JWT Auth ──────────────────────────────────────────────────────────────
app.use(jwtAuth());

// ─── 4. Routes ────────────────────────────────────────────────────────────────

// Health check (public — auth skipped by jwtAuth)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// OAuth proxy routes (all public — auth skipped by jwtAuth)
app.use(createOAuthProxyRouter());

// Protected Resource Metadata (RFC 9728)
// Tells MCP clients where to authenticate.
app.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: config.serverUrl,
    authorization_servers: [config.serverUrl],
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    bearer_methods_supported: ["header"],
  });
});

// ─── MCP Endpoint (protected — JWT validated by jwtAuth) ──────────────────────
// Handles POST (requests), GET (SSE streams), and DELETE (session termination)
app.all("/mcp", async (req, res) => {
  await handleMcpRequest(req, res, server);
});

// ─── 5. Error Handler ─────────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server] Unhandled error:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json(
          jsonRpcError(JsonRpcErrorCode.INTERNAL_ERROR, "Internal server error")
        );
    }
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`Weather MCP server listening on port ${config.port}`);
  console.log(`  MCP endpoint: ${config.serverUrl}/mcp`);
  console.log(`  Health check: ${config.serverUrl}/health`);
});
