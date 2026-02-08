/**
 * tools/precipitation/index.ts — Precipitation tool definition.
 *
 * Exports a function to register the precipitation tool on an MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity } from "../shared/geocoding.js";
import { fetchPrecipitationData, formatPrecipitationReport } from "./api.js";

// Re-export types and constants for consumers
export * from "./types.js";
export * from "./constants.js";

/**
 * Register the get_precipitation tool on an MCP server.
 */
export function registerPrecipitationTool(server: McpServer): void {
  server.tool(
    "get_precipitation",
    "Get precipitation data for a city. Returns current precipitation (rain, snow, showers), hourly probabilities, and 7-day forecast with totals.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City name to get precipitation data for (e.g., 'Seattle', 'London')"),
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

        const precipData = await fetchPrecipitationData(location.latitude, location.longitude);
        const report = formatPrecipitationReport(location, precipData);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching precipitation data for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
