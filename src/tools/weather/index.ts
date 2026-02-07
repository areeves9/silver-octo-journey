/**
 * tools/weather/index.ts — Weather tool definition.
 *
 * Exports a function to register the weather tool on an MCP server.
 * This pattern allows the tool to be registered on any server instance,
 * enabling submounting and composition.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity, fetchWeather, formatWeatherReport } from "./api.js";

// Re-export types and constants for consumers
export * from "./types.js";
export * from "./constants.js";

/**
 * Register the get_weather tool on an MCP server.
 */
export function registerWeatherTool(server: McpServer): void {
  server.tool(
    "get_weather",
    "Get current weather conditions for a city. Returns temperature, humidity, wind, and conditions.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe(
          "City name to get weather for (e.g., 'London', 'Tokyo', 'New York')"
        ),
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

        const weather = await fetchWeather(location.latitude, location.longitude);
        const report = formatWeatherReport(location, weather);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching weather for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
