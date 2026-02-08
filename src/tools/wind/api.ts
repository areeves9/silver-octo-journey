/**
 * tools/wind/api.ts — Open-Meteo wind API functions.
 */

import type { GeoResult } from "../shared/geocoding.js";
import type { WindResponse } from "./types.js";
import { getBeaufortScale, getCardinalDirection, WIND_ADVISORIES } from "./constants.js";
import { cachedFetchJson } from "../shared/fetch.js";

/**
 * Fetch wind data for coordinates.
 */
export async function fetchWindData(
  latitude: number,
  longitude: number
): Promise<WindResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: ["wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"].join(","),
    hourly: ["wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"].join(","),
    daily: ["wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant"].join(","),
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "7",
    forecast_hours: "24",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  return cachedFetchJson<WindResponse>(url);
}

/**
 * Format wind data into a human-readable report.
 */
export function formatWindReport(
  location: GeoResult,
  data: WindResponse
): string {
  const { current, current_units, hourly, hourly_units, daily, daily_units } = data;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const beaufort = getBeaufortScale(current.wind_speed_10m);
  const direction = getCardinalDirection(current.wind_direction_10m);

  const lines = [
    `Wind Conditions for ${locationName}`,
    "",
    "=== Current Wind ===",
    `Speed: ${current.wind_speed_10m} ${current_units.wind_speed_10m}`,
    `Direction: ${current.wind_direction_10m}° (from ${direction})`,
    `Gusts: ${current.wind_gusts_10m} ${current_units.wind_gusts_10m}`,
    "",
    `Beaufort Scale: Force ${beaufort.force} - ${beaufort.description}`,
    `  Sea: ${beaufort.seaCondition}`,
    `  Land: ${beaufort.landCondition}`,
  ];

  // Add warnings if applicable
  const warnings: string[] = [];
  if (current.wind_speed_10m >= WIND_ADVISORIES.HIGH_WIND_WARNING) {
    warnings.push("HIGH WIND WARNING: Dangerous wind speeds");
  } else if (current.wind_speed_10m >= WIND_ADVISORIES.WIND_ADVISORY) {
    warnings.push("WIND ADVISORY: Strong winds expected");
  }
  if (current.wind_gusts_10m >= WIND_ADVISORIES.GUST_WARNING) {
    warnings.push("GUST WARNING: Dangerous gusts");
  } else if (current.wind_gusts_10m >= WIND_ADVISORIES.GUST_ADVISORY) {
    warnings.push("GUST ADVISORY: Strong gusts expected");
  }

  if (warnings.length > 0) {
    lines.push("");
    lines.push("=== Warnings ===");
    for (const w of warnings) {
      lines.push(`⚠️ ${w}`);
    }
  }

  // 24-hour hourly forecast
  lines.push("");
  lines.push("=== 24-Hour Wind Forecast ===");
  for (let i = 0; i < Math.min(24, hourly.time.length); i += 3) {
    const time = new Date(hourly.time[i]).toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      hour12: true,
    });
    const speed = hourly.wind_speed_10m[i];
    const dir = getCardinalDirection(hourly.wind_direction_10m[i]);
    const gusts = hourly.wind_gusts_10m[i];
    lines.push(`${time}: ${speed} ${hourly_units.wind_speed_10m} from ${dir}, gusts ${gusts}`);
  }

  // 7-day daily forecast
  lines.push("");
  lines.push("=== 7-Day Wind Forecast ===");
  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const maxSpeed = daily.wind_speed_10m_max[i];
    const maxGusts = daily.wind_gusts_10m_max[i];
    const domDir = getCardinalDirection(daily.wind_direction_10m_dominant[i]);
    const dayBeaufort = getBeaufortScale(maxSpeed);
    lines.push(`${date}: Max ${maxSpeed} ${daily_units.wind_speed_10m_max} from ${domDir}, gusts ${maxGusts} (${dayBeaufort.description})`);
  }

  return lines.join("\n");
}
