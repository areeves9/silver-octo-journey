/**
 * tools/severe-weather/index.ts — Severe weather summary compound tool.
 *
 * Fetches current conditions, 7-day forecast, and air quality, then
 * evaluates them against NWS-style thresholds to produce a prioritised
 * alert report.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeCity, type GeoResult } from "../shared/geocoding.js";
import { cachedFetchJson } from "../shared/fetch.js";
import { TTL_FORECAST } from "../shared/cache/index.js";
import type {
  Alert,
  AlertCategory,
  SeverityLevel,
  SevereWeatherForecastResponse,
  SevereWeatherAQResponse,
} from "./types.js";
import {
  HEAT_ADVISORY,
  HEAT_WARNING,
  FREEZE_ADVISORY,
  COLD_WARNING,
  WIND_ADVISORY_SUSTAINED,
  WIND_ADVISORY_GUSTS,
  WIND_WARNING_SUSTAINED,
  WIND_WARNING_GUSTS,
  RAIN_ADVISORY,
  RAIN_WARNING,
  SNOW_ADVISORY,
  SNOW_WARNING,
  THUNDERSTORM_CODES,
  AQI_ADVISORY,
  AQI_WARNING,
  UV_ADVISORY,
  UV_WARNING,
  SEVERITY_RANK,
} from "./constants.js";

// Re-export types and constants
export * from "./types.js";
export * from "./constants.js";

// ─── All alert categories for the "all clear" section ────────────────────────

const ALL_CATEGORIES: AlertCategory[] = [
  "Heat",
  "Cold",
  "Wind",
  "Precipitation",
  "Thunderstorm",
  "Air Quality",
  "UV",
];

// ─── Data fetching ───────────────────────────────────────────────────────────

async function fetchSevereWeatherData(
  latitude: number,
  longitude: number,
): Promise<{ forecast: SevereWeatherForecastResponse; aq: SevereWeatherAQResponse }> {
  const forecastParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "wind_speed_10m",
      "wind_gusts_10m",
      "weather_code",
      "precipitation",
      "snowfall",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_sum",
      "snowfall_sum",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "weather_code",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: "7",
  });

  const aqParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: ["us_aqi", "uv_index"].join(","),
    timezone: "auto",
  });

  const [forecast, aq] = await Promise.all([
    cachedFetchJson<SevereWeatherForecastResponse>(
      `https://api.open-meteo.com/v1/forecast?${forecastParams}`,
      { ttlMs: TTL_FORECAST },
    ),
    cachedFetchJson<SevereWeatherAQResponse>(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${aqParams}`,
    ),
  ]);

  return { forecast, aq };
}

// ─── Alert evaluation ────────────────────────────────────────────────────────

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function evaluateAlerts(
  forecast: SevereWeatherForecastResponse,
  aq: SevereWeatherAQResponse,
): Alert[] {
  const alerts: Alert[] = [];
  const { current, daily } = forecast;

  // ── Heat ─────────────────────────────────────────────────────────────────

  // Current
  if (current.apparent_temperature >= HEAT_WARNING) {
    alerts.push({
      category: "Heat",
      severity: "Warning",
      headline: `Feels like ${current.apparent_temperature}°F`,
      timeframe: "Now",
      recommendation: "Limit outdoor activity, stay hydrated, check on vulnerable people",
    });
  } else if (current.apparent_temperature >= HEAT_ADVISORY) {
    alerts.push({
      category: "Heat",
      severity: "Advisory",
      headline: `Feels like ${current.apparent_temperature}°F`,
      timeframe: "Now",
      recommendation: "Stay hydrated, take frequent breaks in shade",
    });
  }

  // Forecast (skip today = index 0 if current already handled)
  for (let i = current.apparent_temperature >= HEAT_ADVISORY ? 1 : 0; i < daily.time.length; i++) {
    const feelsMax = daily.apparent_temperature_max[i];
    if (feelsMax >= HEAT_WARNING) {
      alerts.push({
        category: "Heat",
        severity: "Watch",
        headline: `Feels like ${feelsMax}°F expected`,
        timeframe: formatDay(daily.time[i]),
        recommendation: "Prepare for extreme heat, plan to limit outdoor exposure",
      });
      break; // one forecast alert per category is enough
    } else if (feelsMax >= HEAT_ADVISORY) {
      alerts.push({
        category: "Heat",
        severity: "Watch",
        headline: `Feels like ${feelsMax}°F expected`,
        timeframe: formatDay(daily.time[i]),
        recommendation: "Plan to stay hydrated and take breaks",
      });
      break;
    }
  }

  // ── Cold / Freeze ────────────────────────────────────────────────────────

  if (current.apparent_temperature <= COLD_WARNING) {
    alerts.push({
      category: "Cold",
      severity: "Warning",
      headline: `Wind chill ${current.apparent_temperature}°F`,
      timeframe: "Now",
      recommendation: "Limit time outdoors, cover exposed skin, risk of frostbite",
    });
  } else if (current.temperature_2m <= FREEZE_ADVISORY) {
    alerts.push({
      category: "Cold",
      severity: "Advisory",
      headline: `Temperature ${current.temperature_2m}°F`,
      timeframe: "Now",
      recommendation: "Protect pipes and plants, dress in warm layers",
    });
  }

  for (let i = current.temperature_2m <= FREEZE_ADVISORY ? 1 : 0; i < daily.time.length; i++) {
    const minTemp = daily.temperature_2m_min[i];
    const feelsMin = daily.apparent_temperature_min[i];
    if (feelsMin <= COLD_WARNING) {
      alerts.push({
        category: "Cold",
        severity: "Watch",
        headline: `Wind chill ${feelsMin}°F expected`,
        timeframe: formatDay(daily.time[i]),
        recommendation: "Prepare for dangerous cold, protect pipes and pets",
      });
      break;
    } else if (minTemp <= FREEZE_ADVISORY) {
      alerts.push({
        category: "Cold",
        severity: "Watch",
        headline: `Low of ${minTemp}°F expected`,
        timeframe: formatDay(daily.time[i]),
        recommendation: "Protect sensitive plants and outdoor pipes",
      });
      break;
    }
  }

  // ── Wind ─────────────────────────────────────────────────────────────────

  if (current.wind_speed_10m >= WIND_WARNING_SUSTAINED || current.wind_gusts_10m >= WIND_WARNING_GUSTS) {
    alerts.push({
      category: "Wind",
      severity: "Warning",
      headline: `Winds ${current.wind_speed_10m} mph, gusts ${current.wind_gusts_10m} mph`,
      timeframe: "Now",
      recommendation: "Secure loose objects, avoid driving high-profile vehicles",
    });
  } else if (current.wind_speed_10m >= WIND_ADVISORY_SUSTAINED || current.wind_gusts_10m >= WIND_ADVISORY_GUSTS) {
    alerts.push({
      category: "Wind",
      severity: "Advisory",
      headline: `Winds ${current.wind_speed_10m} mph, gusts ${current.wind_gusts_10m} mph`,
      timeframe: "Now",
      recommendation: "Use caution outdoors, secure lightweight items",
    });
  }

  const currentWindAlert = current.wind_speed_10m >= WIND_ADVISORY_SUSTAINED || current.wind_gusts_10m >= WIND_ADVISORY_GUSTS;
  for (let i = currentWindAlert ? 1 : 0; i < daily.time.length; i++) {
    const maxWind = daily.wind_speed_10m_max[i];
    const maxGusts = daily.wind_gusts_10m_max[i];
    if (maxWind >= WIND_WARNING_SUSTAINED || maxGusts >= WIND_WARNING_GUSTS) {
      alerts.push({
        category: "Wind",
        severity: "Watch",
        headline: `Winds to ${maxWind} mph, gusts to ${maxGusts} mph expected`,
        timeframe: formatDay(daily.time[i]),
        recommendation: "Secure outdoor furniture and plan accordingly",
      });
      break;
    } else if (maxWind >= WIND_ADVISORY_SUSTAINED || maxGusts >= WIND_ADVISORY_GUSTS) {
      alerts.push({
        category: "Wind",
        severity: "Watch",
        headline: `Winds to ${maxWind} mph, gusts to ${maxGusts} mph expected`,
        timeframe: formatDay(daily.time[i]),
        recommendation: "Be prepared for gusty conditions",
      });
      break;
    }
  }

  // ── Precipitation ────────────────────────────────────────────────────────

  for (let i = 0; i < daily.time.length; i++) {
    const rain = daily.precipitation_sum[i];
    const snow = daily.snowfall_sum[i];
    const timeframe = i === 0 ? "Today" : formatDay(daily.time[i]);

    if (rain >= RAIN_WARNING) {
      alerts.push({
        category: "Precipitation",
        severity: i === 0 ? "Warning" : "Watch",
        headline: `${rain.toFixed(1)}" of rain expected`,
        timeframe,
        recommendation: "Flash flooding possible, avoid low-lying areas",
      });
      break;
    } else if (snow >= SNOW_WARNING) {
      alerts.push({
        category: "Precipitation",
        severity: i === 0 ? "Warning" : "Watch",
        headline: `${snow.toFixed(1)}" of snow expected`,
        timeframe,
        recommendation: "Hazardous travel expected, stock supplies",
      });
      break;
    } else if (rain >= RAIN_ADVISORY) {
      alerts.push({
        category: "Precipitation",
        severity: i === 0 ? "Advisory" : "Watch",
        headline: `${rain.toFixed(1)}" of rain expected`,
        timeframe,
        recommendation: "Localized flooding possible, plan travel carefully",
      });
      break;
    } else if (snow >= SNOW_ADVISORY) {
      alerts.push({
        category: "Precipitation",
        severity: i === 0 ? "Advisory" : "Watch",
        headline: `${snow.toFixed(1)}" of snow expected`,
        timeframe,
        recommendation: "Slippery roads possible, allow extra travel time",
      });
      break;
    }
  }

  // ── Thunderstorm ─────────────────────────────────────────────────────────

  if (THUNDERSTORM_CODES.includes(current.weather_code)) {
    alerts.push({
      category: "Thunderstorm",
      severity: "Warning",
      headline: "Thunderstorm activity",
      timeframe: "Now",
      recommendation: "Seek shelter, avoid open areas and tall objects",
    });
  } else {
    for (let i = 0; i < daily.time.length; i++) {
      if (THUNDERSTORM_CODES.includes(daily.weather_code[i])) {
        alerts.push({
          category: "Thunderstorm",
          severity: "Watch",
          headline: "Thunderstorms possible",
          timeframe: i === 0 ? "Today" : formatDay(daily.time[i]),
          recommendation: "Monitor conditions, have a plan to seek shelter",
        });
        break;
      }
    }
  }

  // ── Air Quality ──────────────────────────────────────────────────────────

  if (aq.current.us_aqi >= AQI_WARNING) {
    alerts.push({
      category: "Air Quality",
      severity: "Warning",
      headline: `AQI ${aq.current.us_aqi} (Unhealthy)`,
      timeframe: "Now",
      recommendation: "Limit prolonged outdoor exertion, keep windows closed",
    });
  } else if (aq.current.us_aqi >= AQI_ADVISORY) {
    alerts.push({
      category: "Air Quality",
      severity: "Advisory",
      headline: `AQI ${aq.current.us_aqi} (Unhealthy for Sensitive Groups)`,
      timeframe: "Now",
      recommendation: "Sensitive individuals should limit outdoor activity",
    });
  }

  // ── UV ───────────────────────────────────────────────────────────────────

  if (aq.current.uv_index >= UV_WARNING) {
    alerts.push({
      category: "UV",
      severity: "Warning",
      headline: `UV index ${aq.current.uv_index} (Extreme)`,
      timeframe: "Now",
      recommendation: "Avoid sun exposure, stay in shade, SPF 50+",
    });
  } else if (aq.current.uv_index >= UV_ADVISORY) {
    alerts.push({
      category: "UV",
      severity: "Advisory",
      headline: `UV index ${aq.current.uv_index} (Very High)`,
      timeframe: "Now",
      recommendation: "Apply SPF 30+ sunscreen, wear protective clothing",
    });
  }

  // Sort: warnings first, then watches, then advisories
  alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return alerts;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatSevereWeatherReport(
  location: GeoResult,
  alerts: Alert[],
): string {
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const lines = [`Severe Weather Summary for ${locationName}`, ""];

  if (alerts.length === 0) {
    lines.push("=== ALL CLEAR ===");
    lines.push("No active alerts or watches for the next 7 days.");
    return lines.join("\n");
  }

  // Group alerts by severity
  const bySeverity = new Map<SeverityLevel, Alert[]>();
  for (const alert of alerts) {
    const group = bySeverity.get(alert.severity) ?? [];
    group.push(alert);
    bySeverity.set(alert.severity, group);
  }

  const severityOrder: SeverityLevel[] = ["Warning", "Watch", "Advisory"];

  for (const severity of severityOrder) {
    const group = bySeverity.get(severity);
    if (!group || group.length === 0) continue;

    const label = severity.toUpperCase();
    lines.push(`=== ${group.length} ${label}${group.length > 1 ? "S" : ""} ===`);

    for (const alert of group) {
      lines.push(`  ${alert.category.toUpperCase()} ${label}: ${alert.headline} (${alert.timeframe})`);
      lines.push(`    -> ${alert.recommendation}`);
    }

    lines.push("");
  }

  // Show which categories are clear
  const alertedCategories = new Set(alerts.map((a) => a.category));
  const clearCategories = ALL_CATEGORIES.filter((c) => !alertedCategories.has(c));

  if (clearCategories.length > 0) {
    lines.push("=== ALL CLEAR ===");
    lines.push(`  No alerts: ${clearCategories.join(", ")}`);
  }

  return lines.join("\n");
}

// ─── Tool registration ───────────────────────────────────────────────────────

/**
 * Register the get_severe_weather tool on an MCP server.
 */
export function registerSevereWeatherTool(server: McpServer): void {
  server.tool(
    "get_severe_weather",
    "Get severe weather summary for a city. Scans current conditions and 7-day forecast for heat, cold, wind, precipitation, thunderstorm, air quality, and UV hazards. Returns prioritised alerts with recommendations.",
    {
      city: z
        .string()
        .min(1, "City name cannot be empty")
        .describe("City or location name to check for severe weather"),
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

        const { forecast, aq } = await fetchSevereWeatherData(
          location.latitude,
          location.longitude,
        );
        const alerts = evaluateAlerts(forecast, aq);
        const report = formatSevereWeatherReport(location, alerts);

        return {
          content: [{ type: "text" as const, text: report }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching severe weather for "${city}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
