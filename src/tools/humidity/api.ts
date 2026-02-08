/**
 * tools/humidity/api.ts — Open-Meteo humidity API functions.
 */

import type { GeoResult } from "../shared/geocoding.js";
import { cachedFetchJson } from "../shared/fetch.js";
import type { HumidityResponse } from "./types.js";
import {
  getHumidityLevel,
  getDewPointComfort,
  getFogPotential,
  getVPDDescription,
} from "./constants.js";

/**
 * Fetch humidity data for coordinates.
 */
export async function fetchHumidityData(
  latitude: number,
  longitude: number
): Promise<HumidityResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "dew_point_2m",
      "apparent_temperature",
      "surface_pressure",
    ].join(","),
    hourly: [
      "relative_humidity_2m",
      "dew_point_2m",
      "vapour_pressure_deficit",
    ].join(","),
    temperature_unit: "fahrenheit",
    timezone: "auto",
    forecast_days: "7",
    forecast_hours: "48",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  return cachedFetchJson<HumidityResponse>(url);
}

/**
 * Format humidity data into a human-readable report.
 */
export function formatHumidityReport(
  location: GeoResult,
  data: HumidityResponse
): string {
  const { current, current_units, hourly, hourly_units } = data;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const humidityLevel = getHumidityLevel(current.relative_humidity_2m);
  const dewPointComfort = getDewPointComfort(current.dew_point_2m);
  const fogPotential = getFogPotential(current.temperature_2m, current.dew_point_2m);

  const lines = [
    `Humidity & Moisture for ${locationName}`,
    "",
    "=== Current Conditions ===",
    `Relative Humidity: ${current.relative_humidity_2m}${current_units.relative_humidity_2m}`,
    `  Comfort: ${humidityLevel.level} - ${humidityLevel.description}`,
    "",
    `Dew Point: ${current.dew_point_2m}${current_units.dew_point_2m}`,
    `  Comfort: ${dewPointComfort}`,
    "",
    `Temperature: ${current.temperature_2m}${current_units.temperature_2m}`,
    `Feels Like: ${current.apparent_temperature}${current_units.apparent_temperature}`,
    `Surface Pressure: ${current.surface_pressure} ${current_units.surface_pressure}`,
    "",
    `Fog Potential: ${fogPotential}`,
  ];

  // Current VPD for agriculture/gardening
  if (hourly.vapour_pressure_deficit.length > 0) {
    const vpd = hourly.vapour_pressure_deficit[0];
    lines.push("");
    lines.push("=== Plant/Agriculture ===");
    lines.push(`Vapour Pressure Deficit: ${vpd.toFixed(2)} ${hourly_units.vapour_pressure_deficit}`);
    lines.push(`  ${getVPDDescription(vpd)}`);
  }

  // 24-hour humidity forecast
  lines.push("");
  lines.push("=== 24-Hour Humidity Forecast ===");
  for (let i = 0; i < 24 && i < hourly.time.length; i += 3) {
    const time = new Date(hourly.time[i]).toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      hour12: true,
    });
    const humidity = hourly.relative_humidity_2m[i];
    const dewPoint = hourly.dew_point_2m[i];
    const level = getHumidityLevel(humidity);
    lines.push(`${time}: ${humidity}% (${level.level}), Dew point ${dewPoint}${hourly_units.dew_point_2m}`);
  }

  // 48-hour trends
  lines.push("");
  lines.push("=== 48-Hour Statistics ===");

  const humidities48h = hourly.relative_humidity_2m.slice(0, 48);
  const dewPoints48h = hourly.dew_point_2m.slice(0, 48);

  const avgHumidity = humidities48h.reduce((a, b) => a + b, 0) / humidities48h.length;
  const minHumidity = Math.min(...humidities48h);
  const maxHumidity = Math.max(...humidities48h);
  const avgDewPoint = dewPoints48h.reduce((a, b) => a + b, 0) / dewPoints48h.length;

  lines.push(`Humidity: Min ${minHumidity}%, Max ${maxHumidity}%, Avg ${avgHumidity.toFixed(0)}%`);
  lines.push(`Average Dew Point: ${avgDewPoint.toFixed(1)}${hourly_units.dew_point_2m}`);

  // Identify uncomfortable periods
  const uncomfortableHours = humidities48h.filter((h) => h > 70).length;
  const veryDryHours = humidities48h.filter((h) => h < 30).length;

  if (uncomfortableHours > 0) {
    lines.push(`Humid periods (>70%): ${uncomfortableHours} hours in next 48h`);
  }
  if (veryDryHours > 0) {
    lines.push(`Dry periods (<30%): ${veryDryHours} hours in next 48h`);
  }

  return lines.join("\n");
}
