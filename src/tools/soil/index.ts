/**
 * tools/soil/index.ts — Soil conditions tool definition.
 *
 * Exports a function to register the soil conditions tool on an MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity } from "../shared/geocoding.js";
import { fetchSoilConditions, formatSoilReport } from "./api.js";

// Re-export types and constants for consumers
export * from "./types.js";
export * from "./constants.js";

/**
 * Register the get_soil_conditions tool on an MCP server.
 */
export function registerSoilTool(server: McpServer): void {
  server.tool(
    "get_soil_conditions",
    "Get current soil conditions for a location. Returns soil moisture and temperature at multiple depths, with planting recommendations.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City or location name to get soil conditions for"),
    },
    async ({ city }) => {
      try {
        const location = await geocodeCity(city);

        if (!location) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Could not find a location matching "${city}". Try a more specific location name.`,
              },
            ],
          };
        }

        const soil = await fetchSoilConditions(location.latitude, location.longitude);
        const report = formatSoilReport(location, soil);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching soil conditions for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
