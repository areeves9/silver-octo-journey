/**
 * tools/marine-conditions/index.ts — Marine conditions compound tool.
 *
 * Combines wave data, swell, wind, and currents for comprehensive
 * marine activity assessment.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WMO_CODES } from "../weather/constants.js";
import { getCardinalDirection } from "../shared/directions.js";
import { getSeaState } from "../shared/sea-state.js";
import { fetchWithTimeout } from "../shared/fetch.js";
import type { MarineConditionsResponse, MarineAssessment, ActivitySuitability, MarineActivity } from "./types.js";

// Re-export types
export * from "./types.js";

/**
 * Fetch marine conditions data for coordinates.
 */
async function fetchMarineConditionsData(
  latitude: number,
  longitude: number
): Promise<MarineConditionsResponse> {
  const marineParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "wave_height",
      "wave_direction",
      "wave_period",
      "swell_wave_height",
      "swell_wave_direction",
      "swell_wave_period",
      "wind_wave_height",
      "wind_wave_direction",
      "ocean_current_velocity",
      "ocean_current_direction",
    ].join(","),
    daily: ["wave_height_max", "wave_period_max"].join(","),
    length_unit: "imperial",
    timezone: "auto",
    forecast_days: "3",
  });

  const weatherParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "weather_code",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
  });

  const [marineRes, weatherRes] = await Promise.all([
    fetchWithTimeout(`https://marine-api.open-meteo.com/v1/marine?${marineParams}`),
    fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${weatherParams}`),
  ]);

  if (!marineRes.ok) {
    throw new Error(`Marine API returned ${marineRes.status}`);
  }
  if (!weatherRes.ok) {
    throw new Error(`Weather API returned ${weatherRes.status}`);
  }

  const marine = (await marineRes.json()) as MarineConditionsResponse["marine"];
  const weather = (await weatherRes.json()) as MarineConditionsResponse["weather"];

  return {
    latitude,
    longitude,
    marine,
    weather,
  };
}

/** Feet to meters conversion factor. */
const FEET_TO_METERS = 0.3048;

/**
 * Assess marine conditions for various activities.
 */
function assessMarineConditions(data: MarineConditionsResponse): MarineAssessment {
  const m = data.marine.current;
  const w = data.weather.current;

  const seaStateInfo = getSeaState(m.wave_height * FEET_TO_METERS);
  const warnings: string[] = [];
  let overallSafety: MarineAssessment["overallSafety"] = "Safe";

  // Check for hazardous conditions
  if (seaStateInfo.code >= 6) {
    overallSafety = "Hazardous";
    warnings.push("Dangerous sea state - avoid water activities");
  } else if (seaStateInfo.code >= 4 || w.wind_gusts_10m >= 35) {
    overallSafety = "Caution";
    if (seaStateInfo.code >= 4) warnings.push("Rough seas - exercise caution");
    if (w.wind_gusts_10m >= 35) warnings.push("Strong wind gusts");
  }

  if (w.wind_speed_10m >= 25) {
    warnings.push("Strong sustained winds");
  }

  if (m.ocean_current_velocity > 2) {
    warnings.push("Strong currents present");
  }

  // Assess individual activities
  const activities: ActivitySuitability[] = [];

  // Swimming
  const swimmingRating = assessSwimming(m.wave_height, m.ocean_current_velocity, w.temperature_2m);
  activities.push(swimmingRating);

  // Surfing
  const surfingRating = assessSurfing(m.wave_height, m.wave_period, m.swell_wave_height, w.wind_speed_10m);
  activities.push(surfingRating);

  // Boating
  const boatingRating = assessBoating(seaStateInfo.code, w.wind_speed_10m, w.wind_gusts_10m);
  activities.push(boatingRating);

  // Fishing
  const fishingRating = assessFishing(seaStateInfo.code, w.wind_speed_10m, w.weather_code);
  activities.push(fishingRating);

  // Diving
  const divingRating = assessDiving(m.wave_height, m.ocean_current_velocity, seaStateInfo.code);
  activities.push(divingRating);

  return {
    seaState: seaStateInfo.description,
    seaStateCode: seaStateInfo.code,
    overallSafety,
    activities,
    warnings,
  };
}

function assessSwimming(waveHeight: number, currentVelocity: number, temp: number): ActivitySuitability {
  if (waveHeight > 4 || currentVelocity > 1.5) {
    return { activity: "swimming", rating: "Dangerous", notes: "Waves/currents too strong" };
  }
  if (temp < 60) {
    return { activity: "swimming", rating: "Poor", notes: "Water likely too cold" };
  }
  if (waveHeight > 2 || currentVelocity > 0.8) {
    return { activity: "swimming", rating: "Fair", notes: "Moderate waves/currents" };
  }
  if (waveHeight > 1) {
    return { activity: "swimming", rating: "Good", notes: "Small waves present" };
  }
  return { activity: "swimming", rating: "Excellent", notes: "Calm conditions" };
}

function assessSurfing(waveHeight: number, wavePeriod: number, swellHeight: number, windSpeed: number): ActivitySuitability {
  if (waveHeight < 1 && swellHeight < 1) {
    return { activity: "surfing", rating: "Poor", notes: "Waves too small" };
  }
  if (waveHeight > 10) {
    return { activity: "surfing", rating: "Dangerous", notes: "Expert only - very large waves" };
  }
  if (windSpeed > 20) {
    return { activity: "surfing", rating: "Fair", notes: "Choppy conditions from wind" };
  }
  if (waveHeight >= 3 && waveHeight <= 6 && wavePeriod >= 8) {
    return { activity: "surfing", rating: "Excellent", notes: "Good wave height and period" };
  }
  if (waveHeight >= 2 && wavePeriod >= 6) {
    return { activity: "surfing", rating: "Good", notes: "Decent conditions" };
  }
  return { activity: "surfing", rating: "Fair", notes: "Marginal conditions" };
}

function assessBoating(seaStateCode: number, windSpeed: number, windGusts: number): ActivitySuitability {
  if (seaStateCode >= 6 || windGusts >= 45) {
    return { activity: "boating", rating: "Dangerous", notes: "Hazardous conditions" };
  }
  if (seaStateCode >= 4 || windSpeed >= 25) {
    return { activity: "boating", rating: "Poor", notes: "Rough conditions" };
  }
  if (seaStateCode >= 3 || windSpeed >= 15) {
    return { activity: "boating", rating: "Fair", notes: "Moderate conditions" };
  }
  if (seaStateCode <= 1 && windSpeed < 10) {
    return { activity: "boating", rating: "Excellent", notes: "Calm seas" };
  }
  return { activity: "boating", rating: "Good", notes: "Light seas" };
}

function assessFishing(seaStateCode: number, windSpeed: number, weatherCode: number): ActivitySuitability {
  if (seaStateCode >= 5) {
    return { activity: "fishing", rating: "Poor", notes: "Too rough" };
  }
  if (weatherCode >= 61) {
    return { activity: "fishing", rating: "Fair", notes: "Precipitation expected" };
  }
  if (seaStateCode <= 2 && windSpeed < 15) {
    return { activity: "fishing", rating: "Excellent", notes: "Ideal conditions" };
  }
  if (seaStateCode <= 3) {
    return { activity: "fishing", rating: "Good", notes: "Manageable conditions" };
  }
  return { activity: "fishing", rating: "Fair", notes: "Moderate conditions" };
}

function assessDiving(waveHeight: number, currentVelocity: number, seaStateCode: number): ActivitySuitability {
  if (seaStateCode >= 4 || currentVelocity > 1.5) {
    return { activity: "diving", rating: "Dangerous", notes: "Conditions too rough" };
  }
  if (waveHeight > 3 || currentVelocity > 1) {
    return { activity: "diving", rating: "Poor", notes: "Reduced visibility likely" };
  }
  if (waveHeight > 1.5 || currentVelocity > 0.5) {
    return { activity: "diving", rating: "Fair", notes: "Some surge possible" };
  }
  if (waveHeight <= 1 && currentVelocity <= 0.3) {
    return { activity: "diving", rating: "Excellent", notes: "Calm conditions, good visibility" };
  }
  return { activity: "diving", rating: "Good", notes: "Light conditions" };
}

/**
 * Format marine conditions report.
 */
function formatMarineConditionsReport(
  latitude: number,
  longitude: number,
  data: MarineConditionsResponse,
  assessment: MarineAssessment
): string {
  const m = data.marine.current;
  const mu = data.marine.current_units;
  const w = data.weather.current;
  const wu = data.weather.current_units;

  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  const locStr = `${Math.abs(latitude).toFixed(4)}°${latDir}, ${Math.abs(longitude).toFixed(4)}°${lonDir}`;

  const condition = WMO_CODES[w.weather_code] ?? "Unknown";
  const windDir = getCardinalDirection(w.wind_direction_10m);
  const waveDir = getCardinalDirection(m.wave_direction);
  const swellDir = getCardinalDirection(m.swell_wave_direction);

  const lines = [
    `Marine Conditions at ${locStr}`,
    "",
    `=== OVERALL: ${assessment.overallSafety.toUpperCase()} ===`,
    `Sea State: ${assessment.seaStateCode} - ${assessment.seaState}`,
  ];

  if (assessment.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of assessment.warnings) {
      lines.push(`  ⚠️ ${warning}`);
    }
  }

  lines.push("");
  lines.push("=== Activity Suitability ===");
  for (const activity of assessment.activities) {
    const emoji = activity.rating === "Excellent" ? "✓" :
                  activity.rating === "Good" ? "✓" :
                  activity.rating === "Fair" ? "~" :
                  activity.rating === "Poor" ? "✗" : "⚠️";
    const name = activity.activity.charAt(0).toUpperCase() + activity.activity.slice(1);
    lines.push(`  ${emoji} ${name}: ${activity.rating} - ${activity.notes}`);
  }

  lines.push("");
  lines.push("=== Waves ===");
  lines.push(`Combined Height: ${m.wave_height} ${mu.wave_height}`);
  lines.push(`Direction: ${m.wave_direction}° (from ${waveDir})`);
  lines.push(`Period: ${m.wave_period} ${mu.wave_period}`);

  lines.push("");
  lines.push("=== Swell ===");
  lines.push(`Height: ${m.swell_wave_height} ${mu.swell_wave_height}`);
  lines.push(`Direction: ${m.swell_wave_direction}° (from ${swellDir})`);
  lines.push(`Period: ${m.swell_wave_period} ${mu.swell_wave_period}`);

  lines.push("");
  lines.push("=== Wind Waves ===");
  lines.push(`Height: ${m.wind_wave_height} ${mu.wind_wave_height}`);
  lines.push(`Direction: ${m.wind_wave_direction}° (from ${getCardinalDirection(m.wind_wave_direction)})`);

  lines.push("");
  lines.push("=== Current ===");
  lines.push(`Velocity: ${m.ocean_current_velocity} ${mu.ocean_current_velocity}`);
  lines.push(`Direction: ${m.ocean_current_direction}° (towards ${getCardinalDirection(m.ocean_current_direction)})`);

  lines.push("");
  lines.push("=== Weather ===");
  lines.push(`Condition: ${condition}`);
  lines.push(`Air Temperature: ${w.temperature_2m}${wu.temperature_2m}`);
  lines.push(`Wind: ${w.wind_speed_10m} ${wu.wind_speed_10m} from ${windDir}`);
  lines.push(`Gusts: ${w.wind_gusts_10m} ${wu.wind_gusts_10m}`);

  // Add 3-day wave forecast if available
  if (data.marine.daily && data.marine.daily_units) {
    lines.push("");
    lines.push("=== 3-Day Wave Forecast ===");
    for (let i = 0; i < data.marine.daily.time.length; i++) {
      const date = new Date(data.marine.daily.time[i]).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const maxHeight = data.marine.daily.wave_height_max[i];
      const maxPeriod = data.marine.daily.wave_period_max[i];
      lines.push(`  ${date}: Max ${maxHeight} ${data.marine.daily_units.wave_height_max}, Period ${maxPeriod}s`);
    }
  }

  return lines.join("\n");
}

/**
 * Register the get_marine_conditions tool on an MCP server.
 */
export function registerMarineConditionsTool(server: McpServer): void {
  server.tool(
    "get_marine_conditions",
    "Get comprehensive marine conditions assessment for ocean coordinates. Includes waves, swell, wind, currents, and activity recommendations for swimming, surfing, boating, fishing, and diving.",
    {
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .describe("Latitude of the ocean location (-90 to 90)"),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe("Longitude of the ocean location (-180 to 180)"),
    },
    async ({ latitude, longitude }) => {
      try {
        const data = await fetchMarineConditionsData(latitude, longitude);
        const assessment = assessMarineConditions(data);
        const report = formatMarineConditionsReport(latitude, longitude, data, assessment);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching marine conditions for (${latitude}, ${longitude}): ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
