/**
 * server.ts — MCP server instantiation.
 *
 * Single responsibility: create and export the McpServer instance.
 * Tool registration happens in tools.ts.
 *
 * Python equivalent:
 *   mcp = FastMCP("weather-server")
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const server = new McpServer({
  name: "weather-server",
  version: "1.0.0",
});
