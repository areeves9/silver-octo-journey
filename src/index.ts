#!/usr/bin/env node

/**
 * index.ts — Application entry point.
 *
 * Bootstrap only. Creates the app and starts listening.
 * All configuration and wiring happens in app.ts.
 */

// Load .env before anything else
import "dotenv/config";

import { config } from "./config/index.js";
import { logger } from "./shared/index.js";
import { createApp } from "./app.js";
import { spokeManifest } from "./manifest.js";
import { closeAllSessions } from "./mcp/index.js";

const log = logger.child({ module: "server" });

// Create and start the server
const app = createApp();

const server = app.listen(config.port, () => {
  log.info(
    { port: config.port, env: config.nodeEnv },
    `${spokeManifest.name} v${spokeManifest.version} started`
  );
  log.info(`MCP endpoint: ${config.serverUrl}/mcp`);
  log.info(`Health check: ${config.serverUrl}/health`);
  log.info(`Tags: ${spokeManifest.tags.join(", ")}`);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string) {
  log.info({ signal }, "Shutting down");
  closeAllSessions();
  server.close(() => {
    log.info("HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
