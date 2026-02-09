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

// Layer 1: Primitives
import { registerWeatherTool } from "./weather/index.js";
import { registerForecastTool, registerHourlyForecastTool } from "./forecast/index.js";
import { registerAirQualityTool } from "./air-quality/index.js";
import { registerMarineTool } from "./marine/index.js";
import { registerSoilTool } from "./soil/index.js";
import { registerWindTool } from "./wind/index.js";
import { registerPrecipitationTool } from "./precipitation/index.js";
import { registerHumidityTool } from "./humidity/index.js";

// Layer 2: Vertical Compound Tools
import { registerFireWeatherTool } from "./fire-weather/index.js";
import { registerAgricultureTool } from "./agriculture/index.js";
import { registerOutdoorTool } from "./outdoor/index.js";
import { registerMarineConditionsTool } from "./marine-conditions/index.js";
import { registerSevereWeatherTool } from "./severe-weather/index.js";

/**
 * Register all available tools on an MCP server.
 *
 * Add new tool registrations here as they're created.
 */
export function registerAllTools(server: McpServer): void {
  // Layer 1: Primitives - single-purpose tools returning focused data
  registerWeatherTool(server);
  registerForecastTool(server);
  registerHourlyForecastTool(server);
  registerAirQualityTool(server);
  registerMarineTool(server);
  registerSoilTool(server);
  registerWindTool(server);
  registerPrecipitationTool(server);
  registerHumidityTool(server);

  // Layer 2: Vertical Compound Tools - combine multiple data sources
  registerFireWeatherTool(server);
  registerAgricultureTool(server);
  registerOutdoorTool(server);
  registerMarineConditionsTool(server);
  registerSevereWeatherTool(server);
}

/**
 * Tool manifest for hub discovery.
 * Lists available tools without requiring server instantiation.
 */
export const toolManifest = [
  // Layer 1: Primitives
  {
    name: "get_weather",
    description:
      "Get current weather conditions for a city. Returns temperature, humidity, wind, and conditions.",
    category: "primitive",
    tags: ["weather", "current"],
  },
  {
    name: "get_forecast",
    description:
      "Get 7-day daily weather forecast for a city. Returns daily high/low temperatures, conditions, and precipitation chance.",
    category: "primitive",
    tags: ["weather", "forecast", "daily"],
  },
  {
    name: "get_hourly_forecast",
    description:
      "Get hourly weather forecast for a city. Returns temperature, conditions, and precipitation probability for each hour.",
    category: "primitive",
    tags: ["weather", "forecast", "hourly"],
  },
  {
    name: "get_air_quality",
    description:
      "Get current air quality for a city. Returns AQI (US/EU), pollutant levels (PM2.5, PM10, ozone), UV index, and pollen levels.",
    category: "primitive",
    tags: ["air-quality", "pollution", "health"],
  },
  {
    name: "get_marine",
    description:
      "Get current marine weather conditions for ocean coordinates. Returns wave height/direction/period, swell data, and ocean currents.",
    category: "primitive",
    tags: ["marine", "waves", "ocean"],
  },
  {
    name: "get_soil_conditions",
    description:
      "Get current soil conditions for a location. Returns soil moisture and temperature at multiple depths, with planting recommendations.",
    category: "primitive",
    tags: ["soil", "agriculture", "moisture"],
  },
  {
    name: "get_wind",
    description:
      "Get wind conditions for a city. Returns current wind speed, direction, gusts, Beaufort scale, plus 24-hour and 7-day forecasts.",
    category: "primitive",
    tags: ["wind", "weather", "forecast"],
  },
  {
    name: "get_precipitation",
    description:
      "Get precipitation data for a city. Returns current precipitation (rain, snow, showers), hourly probabilities, and 7-day forecast with totals.",
    category: "primitive",
    tags: ["precipitation", "rain", "snow", "forecast"],
  },
  {
    name: "get_humidity",
    description:
      "Get humidity and moisture data for a city. Returns relative humidity, dew point, comfort levels, fog potential, and 48-hour forecast.",
    category: "primitive",
    tags: ["humidity", "moisture", "dew-point", "comfort"],
  },

  // Layer 2: Vertical Compound Tools
  {
    name: "get_fire_weather",
    description:
      "Get fire weather assessment for a location. Combines wind, humidity, temperature, precipitation history, and soil moisture to assess wildfire risk with recommendations.",
    category: "compound",
    tags: ["fire", "wildfire", "safety", "risk-assessment"],
  },
  {
    name: "get_growing_conditions",
    description:
      "Get agricultural growing conditions for a location. Includes soil moisture/temperature, evapotranspiration, precipitation forecast, frost risk, and planting recommendations.",
    category: "compound",
    tags: ["agriculture", "farming", "planting", "irrigation"],
  },
  {
    name: "get_outdoor_conditions",
    description:
      "Get comprehensive outdoor activity assessment for a city. Combines current weather, air quality (AQI), UV index, and pollen levels with suitability recommendations.",
    category: "compound",
    tags: ["outdoor", "recreation", "health", "activity"],
  },
  {
    name: "get_marine_conditions",
    description:
      "Get comprehensive marine conditions assessment for ocean coordinates. Includes waves, swell, wind, currents, and activity recommendations for swimming, surfing, boating, fishing, and diving.",
    category: "compound",
    tags: ["marine", "boating", "surfing", "fishing", "diving"],
  },
  {
    name: "get_severe_weather",
    description:
      "Get severe weather summary for a city. Scans current conditions and 7-day forecast for heat, cold, wind, precipitation, thunderstorm, air quality, and UV hazards with prioritised alerts.",
    category: "compound",
    tags: ["severe", "alerts", "warnings", "safety", "hazards"],
  },
] as const;
