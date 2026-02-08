/**
 * tools/humidity/index.ts — Humidity tool definition.
 *
 * Exports a function to register the humidity tool on an MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity } from "../shared/geocoding.js";
import { fetchHumidityData, formatHumidityReport } from "./api.js";

// Re-export types and constants for consumers
export * from "./types.js";
export * from "./constants.js";

/**
 * Register the get_humidity tool on an MCP server.
 */
export function registerHumidityTool(server: McpServer): void {
  server.tool(
    "get_humidity",
    "Get humidity and moisture data for a city. Returns relative humidity, dew point, comfort levels, fog potential, and 48-hour forecast.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City name to get humidity data for (e.g., 'Miami', 'Phoenix')"),
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

        const humidityData = await fetchHumidityData(location.latitude, location.longitude);
        const report = formatHumidityReport(location, humidityData);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching humidity data for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
