/**
 * tools/outdoor/index.ts — Outdoor conditions compound tool.
 *
 * Combines current weather, air quality, UV index, and pollen
 * for outdoor activity recommendations.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity, type GeoResult } from "../shared/geocoding.js";
import { fetchWithTimeout } from "../shared/fetch.js";
import { WMO_CODES } from "../weather/constants.js";
import type { OutdoorResponse, OutdoorAssessment, ActivityRecommendation } from "./types.js";

// Re-export types
export * from "./types.js";

/**
 * Fetch outdoor conditions data for coordinates.
 */
async function fetchOutdoorData(
  latitude: number,
  longitude: number
): Promise<OutdoorResponse> {
  // Fetch weather and air quality in parallel
  const weatherParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_gusts_10m",
      "weather_code",
      "precipitation",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
  });

  const aqParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "us_aqi",
      "pm2_5",
      "pm10",
      "uv_index",
      "alder_pollen",
      "birch_pollen",
      "grass_pollen",
      "mugwort_pollen",
      "olive_pollen",
      "ragweed_pollen",
    ].join(","),
    timezone: "auto",
  });

  const [weatherRes, aqRes] = await Promise.all([
    fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${weatherParams}`),
    fetchWithTimeout(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqParams}`),
  ]);

  if (!weatherRes.ok) {
    throw new Error(`Weather API returned ${weatherRes.status}`);
  }
  if (!aqRes.ok) {
    throw new Error(`Air Quality API returned ${aqRes.status}`);
  }

  const weather = (await weatherRes.json()) as OutdoorResponse["weather"];
  const airQuality = (await aqRes.json()) as OutdoorResponse["airQuality"];

  return {
    latitude,
    longitude,
    weather,
    airQuality,
  };
}

/**
 * Assess outdoor conditions.
 */
function assessOutdoorConditions(data: OutdoorResponse): OutdoorAssessment {
  const { weather, airQuality } = data;
  const w = weather.current;
  const aq = airQuality.current;

  const concerns: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Weather assessment
  let weatherSuitability: ActivityRecommendation = "Excellent";

  // Temperature comfort (ideal: 60-80°F)
  if (w.temperature_2m < 32) {
    score -= 30;
    weatherSuitability = "Poor";
    concerns.push("Freezing temperatures");
    recommendations.push("Dress in warm layers");
  } else if (w.temperature_2m < 50) {
    score -= 15;
    if (weatherSuitability === "Excellent") weatherSuitability = "Good";
    concerns.push("Cold temperatures");
    recommendations.push("Wear warm clothing");
  } else if (w.temperature_2m > 95) {
    score -= 30;
    weatherSuitability = "Poor";
    concerns.push("Extreme heat");
    recommendations.push("Limit outdoor activity, stay hydrated");
  } else if (w.temperature_2m > 85) {
    score -= 15;
    if (weatherSuitability === "Excellent") weatherSuitability = "Fair";
    concerns.push("Hot temperatures");
    recommendations.push("Stay hydrated, take breaks in shade");
  }

  // Precipitation
  if (w.precipitation > 0.1 || w.weather_code >= 61) {
    score -= 20;
    weatherSuitability = "Poor";
    concerns.push("Active precipitation");
    recommendations.push("Bring rain gear or stay indoors");
  } else if (w.weather_code >= 51 && w.weather_code < 60) {
    score -= 10;
    if (weatherSuitability === "Excellent") weatherSuitability = "Fair";
    concerns.push("Drizzle/light precipitation");
  }

  // Wind
  if (w.wind_gusts_10m >= 40) {
    score -= 20;
    weatherSuitability = "Poor";
    concerns.push("Dangerous wind gusts");
    recommendations.push("Avoid outdoor activities");
  } else if (w.wind_speed_10m >= 20) {
    score -= 10;
    if (weatherSuitability === "Excellent") weatherSuitability = "Fair";
    concerns.push("Windy conditions");
  }

  // Air quality assessment
  let airQualitySuitability: ActivityRecommendation = "Excellent";
  if (aq.us_aqi > 200) {
    score -= 40;
    airQualitySuitability = "Avoid";
    concerns.push("Very unhealthy air quality");
    recommendations.push("Stay indoors, avoid outdoor exercise");
  } else if (aq.us_aqi > 150) {
    score -= 30;
    airQualitySuitability = "Poor";
    concerns.push("Unhealthy air quality");
    recommendations.push("Limit prolonged outdoor exertion");
  } else if (aq.us_aqi > 100) {
    score -= 15;
    airQualitySuitability = "Fair";
    concerns.push("Air quality unhealthy for sensitive groups");
    recommendations.push("Sensitive individuals should limit outdoor activity");
  } else if (aq.us_aqi > 50) {
    score -= 5;
    airQualitySuitability = "Good";
  }

  // UV assessment
  let uvSafety: ActivityRecommendation = "Excellent";
  if (aq.uv_index >= 11) {
    score -= 20;
    uvSafety = "Avoid";
    concerns.push("Extreme UV radiation");
    recommendations.push("Avoid sun exposure, stay in shade");
  } else if (aq.uv_index >= 8) {
    score -= 15;
    uvSafety = "Poor";
    concerns.push("Very high UV radiation");
    recommendations.push("Apply SPF 30+ sunscreen, wear protective clothing");
  } else if (aq.uv_index >= 6) {
    score -= 10;
    uvSafety = "Fair";
    concerns.push("High UV radiation");
    recommendations.push("Wear sunscreen and hat");
  } else if (aq.uv_index >= 3) {
    score -= 5;
    uvSafety = "Good";
    recommendations.push("Consider sunscreen");
  }

  // Pollen check
  const pollenTypes = [
    { name: "grass", value: aq.grass_pollen },
    { name: "ragweed", value: aq.ragweed_pollen },
    { name: "birch", value: aq.birch_pollen },
  ].filter((p) => p.value && p.value > 50);

  if (pollenTypes.length > 0) {
    score -= 10;
    const pollenNames = pollenTypes.map((p) => p.name).join(", ");
    concerns.push(`Elevated pollen levels (${pollenNames})`);
    recommendations.push("Allergy sufferers should take precautions");
  }

  // Determine overall rating
  let overall: ActivityRecommendation;
  if (score >= 80) {
    overall = "Excellent";
  } else if (score >= 60) {
    overall = "Good";
  } else if (score >= 40) {
    overall = "Fair";
  } else if (score >= 20) {
    overall = "Poor";
  } else {
    overall = "Avoid";
  }

  return {
    overall,
    score: Math.max(0, score),
    weatherSuitability,
    airQualitySuitability,
    uvSafety,
    concerns,
    recommendations,
  };
}

/**
 * Get UV protection level description.
 */
function getUVDescription(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very High";
  return "Extreme";
}

/**
 * Get AQI description.
 */
function getAQIDescription(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

/**
 * Format outdoor conditions report.
 */
function formatOutdoorReport(
  location: GeoResult,
  data: OutdoorResponse,
  assessment: OutdoorAssessment
): string {
  const { weather, airQuality } = data;
  const w = weather.current;
  const wu = weather.current_units;
  const aq = airQuality.current;

  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const condition = WMO_CODES[w.weather_code] ?? "Unknown";

  const lines = [
    `Outdoor Conditions for ${locationName}`,
    "",
    `=== OVERALL: ${assessment.overall.toUpperCase()} (${assessment.score}/100) ===`,
    "",
    "Category Ratings:",
    `  Weather: ${assessment.weatherSuitability}`,
    `  Air Quality: ${assessment.airQualitySuitability}`,
    `  UV Safety: ${assessment.uvSafety}`,
  ];

  if (assessment.concerns.length > 0) {
    lines.push("");
    lines.push("Concerns:");
    for (const concern of assessment.concerns) {
      lines.push(`  ⚠️ ${concern}`);
    }
  }

  if (assessment.recommendations.length > 0) {
    lines.push("");
    lines.push("Recommendations:");
    for (const rec of assessment.recommendations) {
      lines.push(`  • ${rec}`);
    }
  }

  lines.push("");
  lines.push("=== Current Weather ===");
  lines.push(`Condition: ${condition}`);
  lines.push(`Temperature: ${w.temperature_2m}${wu.temperature_2m}`);
  lines.push(`Feels Like: ${w.apparent_temperature}${wu.apparent_temperature}`);
  lines.push(`Humidity: ${w.relative_humidity_2m}${wu.relative_humidity_2m}`);
  lines.push(`Wind: ${w.wind_speed_10m} ${wu.wind_speed_10m} (gusts ${w.wind_gusts_10m} ${wu.wind_gusts_10m})`);

  lines.push("");
  lines.push("=== Air Quality ===");
  lines.push(`US AQI: ${aq.us_aqi} (${getAQIDescription(aq.us_aqi)})`);
  lines.push(`PM2.5: ${aq.pm2_5} µg/m³`);
  lines.push(`PM10: ${aq.pm10} µg/m³`);

  lines.push("");
  lines.push("=== UV Index ===");
  lines.push(`Current: ${aq.uv_index} (${getUVDescription(aq.uv_index)})`);

  // Add pollen if present
  const pollenData = [
    { name: "Grass", value: aq.grass_pollen },
    { name: "Ragweed", value: aq.ragweed_pollen },
    { name: "Birch", value: aq.birch_pollen },
    { name: "Alder", value: aq.alder_pollen },
    { name: "Mugwort", value: aq.mugwort_pollen },
    { name: "Olive", value: aq.olive_pollen },
  ].filter((p) => p.value !== undefined && p.value > 0);

  if (pollenData.length > 0) {
    lines.push("");
    lines.push("=== Pollen ===");
    for (const p of pollenData) {
      let level = "Low";
      if (p.value! > 100) level = "High";
      else if (p.value! > 50) level = "Moderate";
      lines.push(`${p.name}: ${p.value} grains/m³ (${level})`);
    }
  }

  return lines.join("\n");
}

/**
 * Register the get_outdoor_conditions tool on an MCP server.
 */
export function registerOutdoorTool(server: McpServer): void {
  server.tool(
    "get_outdoor_conditions",
    "Get comprehensive outdoor activity assessment for a city. Combines current weather, air quality (AQI), UV index, and pollen levels with suitability recommendations.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City name to get outdoor conditions for"),
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

        const data = await fetchOutdoorData(location.latitude, location.longitude);
        const assessment = assessOutdoorConditions(data);
        const report = formatOutdoorReport(location, data, assessment);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching outdoor conditions for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
