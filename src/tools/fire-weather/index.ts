/**
 * tools/fire-weather/index.ts — Fire weather compound tool.
 *
 * Combines wind, humidity, temperature, precipitation, and soil data
 * for wildfire risk assessment.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity, type GeoResult } from "../shared/geocoding.js";
import { getCardinalDirection } from "../shared/directions.js";
import type { FireWeatherResponse, FireRiskLevel, FireRiskAssessment, FireWeatherData } from "./types.js";

// Re-export types
export * from "./types.js";

/**
 * Fetch fire weather data for coordinates.
 */
async function fetchFireWeatherData(
  latitude: number,
  longitude: number
): Promise<FireWeatherResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
    ].join(","),
    daily: ["temperature_2m_max", "precipitation_sum"].join(","),
    hourly: "soil_moisture_0_to_1cm",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    past_days: "7",
    forecast_days: "1",
    forecast_hours: "1",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Fire weather API returned ${response.status}`);
  }

  return (await response.json()) as FireWeatherResponse;
}

/**
 * Calculate fire risk based on weather conditions.
 */
function assessFireRisk(data: FireWeatherData): FireRiskAssessment {
  let score = 0;
  const factors: string[] = [];
  const recommendations: string[] = [];

  // Temperature factor (high temps increase risk)
  if (data.temperature >= 100) {
    score += 25;
    factors.push("Extreme heat (100°F+)");
  } else if (data.temperature >= 90) {
    score += 20;
    factors.push("High temperatures (90°F+)");
  } else if (data.temperature >= 80) {
    score += 10;
    factors.push("Warm temperatures");
  }

  // Humidity factor (low humidity increases risk)
  if (data.relativeHumidity < 15) {
    score += 30;
    factors.push("Critical humidity (<15%)");
  } else if (data.relativeHumidity < 25) {
    score += 25;
    factors.push("Very low humidity (<25%)");
  } else if (data.relativeHumidity < 35) {
    score += 15;
    factors.push("Low humidity (<35%)");
  }

  // Wind factor (high winds increase fire spread)
  if (data.windGusts >= 50) {
    score += 25;
    factors.push("Dangerous wind gusts (50+ mph)");
  } else if (data.windGusts >= 35) {
    score += 20;
    factors.push("Strong wind gusts (35+ mph)");
  } else if (data.windSpeed >= 20) {
    score += 10;
    factors.push("Moderate winds (20+ mph)");
  }

  // Precipitation factor (dry conditions increase risk)
  if (data.recentPrecipitation === 0) {
    score += 15;
    factors.push("No rain in 7 days");
  } else if (data.recentPrecipitation < 0.1) {
    score += 10;
    factors.push("Minimal rain in 7 days (<0.1 in)");
  }

  // Soil moisture factor (dry soil = more fuel)
  if (data.soilMoisture < 0.1) {
    score += 15;
    factors.push("Very dry soil conditions");
  } else if (data.soilMoisture < 0.2) {
    score += 10;
    factors.push("Dry soil conditions");
  }

  // Determine risk level
  let level: FireRiskLevel;
  if (score >= 80) {
    level = "Extreme";
    recommendations.push("Avoid all outdoor burning");
    recommendations.push("Have evacuation plan ready");
    recommendations.push("Clear defensible space around structures");
  } else if (score >= 60) {
    level = "Very High";
    recommendations.push("No outdoor burning");
    recommendations.push("Avoid activities that create sparks");
    recommendations.push("Monitor local fire conditions");
  } else if (score >= 40) {
    level = "High";
    recommendations.push("Exercise caution with fire activities");
    recommendations.push("Ensure campfires are fully extinguished");
  } else if (score >= 20) {
    level = "Moderate";
    recommendations.push("Be careful with outdoor burning");
    recommendations.push("Follow local fire restrictions");
  } else {
    level = "Low";
    recommendations.push("Normal fire precautions apply");
  }

  return { level, score, factors, recommendations };
}

/**
 * Format fire weather report.
 */
function formatFireWeatherReport(
  location: GeoResult,
  response: FireWeatherResponse,
  assessment: FireRiskAssessment
): string {
  const { current, current_units, daily, daily_units } = response;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  // Sum precipitation from last 7 days
  const recentPrecip = daily.precipitation_sum
    .slice(0, 7)
    .reduce((sum, val) => sum + val, 0);

  const windDir = getCardinalDirection(current.wind_direction_10m);

  const lines = [
    `Fire Weather Assessment for ${locationName}`,
    "",
    `=== FIRE RISK: ${assessment.level.toUpperCase()} ===`,
    `Risk Score: ${assessment.score}/100`,
    "",
    "Contributing Factors:",
    ...assessment.factors.map((f) => `  • ${f}`),
    "",
    "Recommendations:",
    ...assessment.recommendations.map((r) => `  • ${r}`),
    "",
    "=== Current Conditions ===",
    `Temperature: ${current.temperature_2m}${current_units.temperature_2m}`,
    `Today's High: ${daily.temperature_2m_max[daily.temperature_2m_max.length - 1]}${daily_units.temperature_2m_max}`,
    `Relative Humidity: ${current.relative_humidity_2m}${current_units.relative_humidity_2m}`,
    "",
    "=== Wind ===",
    `Speed: ${current.wind_speed_10m} ${current_units.wind_speed_10m}`,
    `Gusts: ${current.wind_gusts_10m} ${current_units.wind_gusts_10m}`,
    `Direction: ${current.wind_direction_10m}° (from ${windDir})`,
    "",
    "=== Moisture ===",
    `Last 7 Days Precipitation: ${recentPrecip.toFixed(2)} ${daily_units.precipitation_sum}`,
    `Surface Soil Moisture: ${(response.hourly.soil_moisture_0_to_1cm[0] * 100).toFixed(1)}%`,
  ];

  return lines.join("\n");
}

/**
 * Register the get_fire_weather tool on an MCP server.
 */
export function registerFireWeatherTool(server: McpServer): void {
  server.tool(
    "get_fire_weather",
    "Get fire weather assessment for a location. Combines wind, humidity, temperature, precipitation history, and soil moisture to assess wildfire risk with recommendations.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City or location name to assess fire weather for"),
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

        const response = await fetchFireWeatherData(location.latitude, location.longitude);

        // Extract data for assessment
        const recentPrecip = response.daily.precipitation_sum
          .slice(0, 7)
          .reduce((sum, val) => sum + val, 0);

        const data: FireWeatherData = {
          temperature: response.current.temperature_2m,
          temperatureMax: response.daily.temperature_2m_max[response.daily.temperature_2m_max.length - 1],
          relativeHumidity: response.current.relative_humidity_2m,
          windSpeed: response.current.wind_speed_10m,
          windGusts: response.current.wind_gusts_10m,
          windDirection: response.current.wind_direction_10m,
          recentPrecipitation: recentPrecip,
          soilMoisture: response.hourly.soil_moisture_0_to_1cm[0],
        };

        const assessment = assessFireRisk(data);
        const report = formatFireWeatherReport(location, response, assessment);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching fire weather for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
