/**
 * tools/wind/index.ts — Wind tool definition.
 *
 * Exports a function to register the wind tool on an MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity } from "../shared/geocoding.js";
import { fetchWindData, formatWindReport } from "./api.js";

// Re-export types and constants for consumers
export * from "./types.js";
export * from "./constants.js";

/**
 * Register the get_wind tool on an MCP server.
 */
export function registerWindTool(server: McpServer): void {
  server.tool(
    "get_wind",
    "Get wind conditions for a city. Returns current wind speed, direction, gusts, Beaufort scale, plus 24-hour and 7-day forecasts.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City name to get wind data for (e.g., 'Chicago', 'Wellington')"),
    },
    async ({ city }) => {
      try {
        const location = await geocodeCity(city);

        if (!location) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Could not find a location matching "${city}". Try a more specific city name.`,
              },
            ],
          };
        }

        const windData = await fetchWindData(location.latitude, location.longitude);
        const report = formatWindReport(location, windData);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching wind data for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
