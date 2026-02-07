/**
 * mcp/server.ts — MCP server factory.
 *
 * Creates the McpServer instance. Tools are registered separately
 * via the tools module.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Create a new MCP server instance.
 */
export function createMcpServer(): McpServer {
  return new McpServer({
    name: "weather-server",
    version: "1.0.0",
  });
}

/**
 * Default server instance for single-server deployments.
 * For multi-instance scenarios, use createMcpServer() directly.
 */
export const server = createMcpServer();
