/**
 * tools/marine/index.ts — Marine weather tool definition.
 *
 * Exports a function to register the marine weather tool on an MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchMarineWeather, formatMarineReport } from "./api.js";

// Re-export types and constants for consumers
export * from "./types.js";
export * from "./constants.js";

/**
 * Register the get_marine tool on an MCP server.
 */
export function registerMarineTool(server: McpServer): void {
  server.tool(
    "get_marine",
    "Get current marine weather conditions for ocean coordinates. Returns wave height/direction/period, swell data, and ocean currents. Requires coordinates since marine data is only available for ocean locations.",
    {
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .describe("Latitude of the ocean location (-90 to 90)"),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe("Longitude of the ocean location (-180 to 180)"),
    },
    async ({ latitude, longitude }) => {
      try {
        const marine = await fetchMarineWeather(latitude, longitude);
        const report = formatMarineReport(latitude, longitude, marine);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching marine data for coordinates (${latitude}, ${longitude}): ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
