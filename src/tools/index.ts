/**
 * tools/index.ts — Tool registration loader.
 *
 * Provides a central place to register all tools on an MCP server.
 * This pattern supports:
 * - Adding/removing tools by modifying this file
 * - Dynamic tool loading (future)
 * - Tool discovery for hub registration
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerWeatherTool } from "./weather/index.js";

/**
 * Register all available tools on an MCP server.
 *
 * Add new tool registrations here as they're created.
 */
export function registerAllTools(server: McpServer): void {
  registerWeatherTool(server);
  // Add more tools here:
  // registerOtherTool(server);
}

/**
 * Tool manifest for hub discovery.
 * Lists available tools without requiring server instantiation.
 */
export const toolManifest = [
  {
    name: "get_weather",
    description:
      "Get current weather conditions for a city. Returns temperature, humidity, wind, and conditions.",
  },
  // Add more tools here as they're created
] as const;
