#!/usr/bin/env node

/**
 * index.ts — Application entry point.
 *
 * Bootstrap only. Creates the app and starts listening.
 * All configuration and wiring happens in app.ts.
 */

import { config } from "./config/index.js";
import { logger } from "./shared/index.js";
import { createApp } from "./app.js";
import { spokeManifest } from "./manifest.js";

const log = logger.child("server");

// Create and start the server
const app = createApp();

app.listen(config.port, () => {
  log.info(`${spokeManifest.name} v${spokeManifest.version} started`, {
    port: config.port,
    env: config.nodeEnv,
  });
  log.info(`MCP endpoint: ${config.serverUrl}/mcp`);
  log.info(`Health check: ${config.serverUrl}/health`);
  log.info(`Tags: ${spokeManifest.tags.join(", ")}`);
});
