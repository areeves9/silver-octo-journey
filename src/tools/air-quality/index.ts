/**
 * tools/air-quality/index.ts — Air quality tool definition.
 *
 * Exports a function to register the air quality tool on an MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity } from "../shared/geocoding.js";
import { fetchAirQuality, formatAirQualityReport } from "./api.js";

// Re-export types and constants for consumers
export * from "./types.js";
export * from "./constants.js";

/**
 * Register the get_air_quality tool on an MCP server.
 */
export function registerAirQualityTool(server: McpServer): void {
  server.tool(
    "get_air_quality",
    "Get current air quality for a city. Returns AQI (US/EU), pollutant levels (PM2.5, PM10, ozone), UV index, and pollen levels.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City name to get air quality for (e.g., 'Los Angeles', 'Beijing', 'London')"),
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

        const airQuality = await fetchAirQuality(location.latitude, location.longitude);
        const report = formatAirQualityReport(location, airQuality);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching air quality for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
