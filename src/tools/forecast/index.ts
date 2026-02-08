/**
 * tools/forecast/index.ts — Forecast tool definitions.
 *
 * Exports functions to register forecast tools on an MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity } from "../shared/geocoding.js";
import {
  fetchDailyForecast,
  fetchHourlyForecast,
  formatDailyForecastReport,
  formatHourlyForecastReport,
} from "./api.js";
import { DEFAULT_FORECAST_HOURS, MAX_FORECAST_HOURS } from "./constants.js";

// Re-export types and constants for consumers
export * from "./types.js";
export * from "./constants.js";

/**
 * Register the get_forecast tool on an MCP server.
 */
export function registerForecastTool(server: McpServer): void {
  server.tool(
    "get_forecast",
    "Get 7-day daily weather forecast for a city. Returns daily high/low temperatures, conditions, and precipitation chance.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City name to get forecast for (e.g., 'London', 'Tokyo', 'New York')"),
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

        const forecast = await fetchDailyForecast(location.latitude, location.longitude);
        const report = formatDailyForecastReport(location, forecast);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching forecast for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Register the get_hourly_forecast tool on an MCP server.
 */
export function registerHourlyForecastTool(server: McpServer): void {
  server.tool(
    "get_hourly_forecast",
    "Get hourly weather forecast for a city. Returns temperature, conditions, and precipitation probability for each hour.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City name to get hourly forecast for"),
      hours: z
        .number()
        .int()
        .min(1)
        .max(MAX_FORECAST_HOURS)
        .optional()
        .describe(`Number of hours to forecast (1-${MAX_FORECAST_HOURS}, default ${DEFAULT_FORECAST_HOURS})`),
    },
    async ({ city, hours }) => {
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

        const forecast = await fetchHourlyForecast(
          location.latitude,
          location.longitude,
          hours ?? DEFAULT_FORECAST_HOURS
        );
        const report = formatHourlyForecastReport(location, forecast);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching hourly forecast for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
