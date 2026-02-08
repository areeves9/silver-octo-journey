/**
 * tools/agriculture/index.ts — Agriculture compound tool.
 *
 * Combines soil moisture/temp, evapotranspiration, precipitation forecast,
 * and frost risk for growing condition assessment.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity, type GeoResult } from "../shared/geocoding.js";
import type { AgricultureResponse, GrowingConditions, PlantingWindow } from "./types.js";

// Re-export types
export * from "./types.js";

/**
 * Fetch agriculture data for coordinates.
 */
async function fetchAgricultureData(
  latitude: number,
  longitude: number
): Promise<AgricultureResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: "temperature_2m",
    hourly: [
      "soil_temperature_6cm",
      "soil_temperature_18cm",
      "soil_moisture_0_to_1cm",
      "soil_moisture_3_to_9cm",
      "soil_moisture_9_to_27cm",
      "et0_fao_evapotranspiration",
    ].join(","),
    daily: [
      "temperature_2m_min",
      "temperature_2m_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "et0_fao_evapotranspiration",
    ].join(","),
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: "7",
    forecast_hours: "1",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Agriculture API returned ${response.status}`);
  }

  return (await response.json()) as AgricultureResponse;
}

/**
 * Analyze growing conditions.
 */
function analyzeGrowingConditions(data: AgricultureResponse): GrowingConditions {
  const { hourly, daily } = data;

  // Calculate average root zone moisture
  const avgMoisture = (
    hourly.soil_moisture_3_to_9cm[0] +
    hourly.soil_moisture_9_to_27cm[0]
  ) / 2;

  // Determine moisture status
  let soilMoistureStatus: GrowingConditions["soilMoistureStatus"];
  if (avgMoisture < 0.15) {
    soilMoistureStatus = "Dry";
  } else if (avgMoisture < 0.35) {
    soilMoistureStatus = "Optimal";
  } else if (avgMoisture < 0.45) {
    soilMoistureStatus = "Wet";
  } else {
    soilMoistureStatus = "Saturated";
  }

  // Check for frost risk (min temp below 32°F)
  const frostDays = daily.time.filter((_, i) => daily.temperature_2m_min[i] <= 32);
  const frostRisk = frostDays.length > 0;

  // Calculate weekly precipitation forecast
  const weeklyPrecipForecast = daily.precipitation_sum.reduce((sum, val) => sum + val, 0);

  // Calculate weekly ET0 (evapotranspiration)
  const weeklyET0 = daily.et0_fao_evapotranspiration.reduce((sum, val) => sum + val, 0);

  // Water balance (precip - ET0)
  const waterBalance = weeklyPrecipForecast - weeklyET0;

  // Irrigation recommendation
  const irrigationNeeded = soilMoistureStatus === "Dry" || waterBalance < -0.5;

  // Calculate growing degree days (base 50°F)
  const baseTemp = 50;
  let gdd = 0;
  for (let i = 0; i < daily.time.length; i++) {
    const avgTemp = (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2;
    if (avgTemp > baseTemp) {
      gdd += avgTemp - baseTemp;
    }
  }

  return {
    soilMoistureStatus,
    irrigationNeeded,
    frostRisk,
    frostDays,
    growingDegreeDays: Math.round(gdd),
    weeklyPrecipForecast,
    weeklyET0,
    waterBalance,
  };
}

/**
 * Check planting windows based on soil temperature.
 */
function checkPlantingWindows(soilTemp: number): PlantingWindow[] {
  const crops: PlantingWindow[] = [
    { cropType: "Cold-season (lettuce, spinach, peas)", minSoilTemp: 40, suitable: false },
    { cropType: "Cool-season (broccoli, carrots, beets)", minSoilTemp: 50, suitable: false },
    { cropType: "Warm-season (tomatoes, peppers, beans)", minSoilTemp: 60, suitable: false },
    { cropType: "Hot-season (melons, squash, corn)", minSoilTemp: 70, suitable: false },
  ];

  for (const crop of crops) {
    crop.suitable = soilTemp >= crop.minSoilTemp;
  }

  return crops;
}

/**
 * Format agriculture report.
 */
function formatAgricultureReport(
  location: GeoResult,
  data: AgricultureResponse,
  conditions: GrowingConditions,
  plantingWindows: PlantingWindow[]
): string {
  const { hourly, hourly_units, daily, daily_units } = data;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const lines = [
    `Growing Conditions for ${locationName}`,
    "",
    "=== Soil Status ===",
    `Moisture Status: ${conditions.soilMoistureStatus}`,
    `  Surface (0-1cm): ${(hourly.soil_moisture_0_to_1cm[0] * 100).toFixed(1)}%`,
    `  Root Zone (3-9cm): ${(hourly.soil_moisture_3_to_9cm[0] * 100).toFixed(1)}%`,
    `  Deep (9-27cm): ${(hourly.soil_moisture_9_to_27cm[0] * 100).toFixed(1)}%`,
    "",
    `Soil Temperature:`,
    `  Shallow (6cm): ${hourly.soil_temperature_6cm[0]}${hourly_units.soil_temperature_6cm}`,
    `  Root Zone (18cm): ${hourly.soil_temperature_18cm[0]}${hourly_units.soil_temperature_18cm}`,
    "",
    "=== Water Balance (7-day) ===",
    `Expected Precipitation: ${conditions.weeklyPrecipForecast.toFixed(2)} ${daily_units.precipitation_sum}`,
    `Expected Evapotranspiration (ET₀): ${conditions.weeklyET0.toFixed(2)} ${daily_units.et0_fao_evapotranspiration}`,
    `Net Water Balance: ${conditions.waterBalance >= 0 ? "+" : ""}${conditions.waterBalance.toFixed(2)} ${daily_units.precipitation_sum}`,
    "",
    `Irrigation Needed: ${conditions.irrigationNeeded ? "YES - soil is dry or water deficit expected" : "No - adequate moisture"}`,
    "",
    "=== Frost Risk ===",
  ];

  if (conditions.frostRisk) {
    lines.push(`⚠️ FROST WARNING - Freezing temperatures expected:`);
    for (const day of conditions.frostDays) {
      const idx = daily.time.indexOf(day);
      const date = new Date(day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      lines.push(`  ${date}: Low of ${daily.temperature_2m_min[idx]}${daily_units.temperature_2m_min}`);
    }
  } else {
    lines.push("No frost risk in 7-day forecast");
  }

  lines.push("");
  lines.push(`Growing Degree Days (7-day, base 50°F): ${conditions.growingDegreeDays}`);
  lines.push("");
  lines.push("=== Planting Windows ===");
  lines.push(`Based on root zone soil temp of ${hourly.soil_temperature_18cm[0]}${hourly_units.soil_temperature_18cm}:`);

  for (const crop of plantingWindows) {
    const status = crop.suitable ? "✓ Ready" : "✗ Too cold";
    lines.push(`  ${status} - ${crop.cropType} (need ${crop.minSoilTemp}°F+)`);
  }

  lines.push("");
  lines.push("=== 7-Day Precipitation Forecast ===");
  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const precip = daily.precipitation_sum[i];
    const chance = daily.precipitation_probability_max[i];
    lines.push(`  ${date}: ${precip.toFixed(2)}${daily_units.precipitation_sum} (${chance}% chance)`);
  }

  return lines.join("\n");
}

/**
 * Register the get_growing_conditions tool on an MCP server.
 */
export function registerAgricultureTool(server: McpServer): void {
  server.tool(
    "get_growing_conditions",
    "Get agricultural growing conditions for a location. Includes soil moisture/temperature, evapotranspiration, precipitation forecast, frost risk, and planting recommendations.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City or location name to get growing conditions for"),
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

        const data = await fetchAgricultureData(location.latitude, location.longitude);
        const conditions = analyzeGrowingConditions(data);
        const plantingWindows = checkPlantingWindows(data.hourly.soil_temperature_18cm[0]);
        const report = formatAgricultureReport(location, data, conditions, plantingWindows);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching growing conditions for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
