/**
 * tools/precipitation/api.ts — Open-Meteo precipitation API functions.
 */

import type { GeoResult } from "../shared/geocoding.js";
import type { PrecipitationResponse } from "./types.js";
import { getPrecipIntensity, getPrecipType, getProbabilityDescription } from "./constants.js";
import { WMO_CODES } from "../weather/constants.js";

/**
 * Fetch precipitation data for coordinates.
 */
export async function fetchPrecipitationData(
  latitude: number,
  longitude: number
): Promise<PrecipitationResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: ["precipitation", "rain", "showers", "snowfall", "weather_code"].join(","),
    hourly: [
      "precipitation",
      "precipitation_probability",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
    ].join(","),
    daily: [
      "precipitation_sum",
      "precipitation_hours",
      "precipitation_probability_max",
      "rain_sum",
      "showers_sum",
      "snowfall_sum",
    ].join(","),
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: "7",
    forecast_hours: "48",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Precipitation API returned ${response.status}`);
  }

  return (await response.json()) as PrecipitationResponse;
}

/**
 * Format precipitation data into a human-readable report.
 */
export function formatPrecipitationReport(
  location: GeoResult,
  data: PrecipitationResponse
): string {
  const { current, current_units, hourly, hourly_units, daily, daily_units } = data;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const precipType = getPrecipType(current.weather_code);
  const condition = WMO_CODES[current.weather_code] ?? "Unknown";
  const totalCurrent = current.precipitation;
  const intensity = getPrecipIntensity(totalCurrent);

  const lines = [
    `Precipitation for ${locationName}`,
    "",
    "=== Current Conditions ===",
    `Status: ${condition}`,
    `Type: ${precipType.type === "none" ? "No precipitation" : `${precipType.intensity} ${precipType.type}`}`,
    `Rate: ${totalCurrent} ${current_units.precipitation}/hr (${intensity})`,
  ];

  if (current.rain > 0) lines.push(`  Rain: ${current.rain} ${current_units.rain}/hr`);
  if (current.showers > 0) lines.push(`  Showers: ${current.showers} ${current_units.showers}/hr`);
  if (current.snowfall > 0) lines.push(`  Snow: ${current.snowfall} ${current_units.snowfall}/hr`);

  // Next 12 hours summary
  lines.push("");
  lines.push("=== Next 12 Hours ===");

  let precipHours = 0;
  let totalPrecip12h = 0;
  for (let i = 0; i < 12 && i < hourly.time.length; i++) {
    if (hourly.precipitation[i] > 0) precipHours++;
    totalPrecip12h += hourly.precipitation[i];
  }

  const maxProb12h = Math.max(...hourly.precipitation_probability.slice(0, 12));
  lines.push(`Expected: ${totalPrecip12h.toFixed(2)} ${hourly_units.precipitation} over ${precipHours} hours`);
  lines.push(`Max probability: ${maxProb12h}% (${getProbabilityDescription(maxProb12h)})`);

  // Hourly breakdown for next 24 hours (every 3 hours)
  lines.push("");
  lines.push("=== Hourly Forecast (24h) ===");
  for (let i = 0; i < 24 && i < hourly.time.length; i += 3) {
    const time = new Date(hourly.time[i]).toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      hour12: true,
    });
    const precip = hourly.precipitation[i];
    const prob = hourly.precipitation_probability[i];
    const hourType = getPrecipType(hourly.weather_code[i]);

    let desc = "Dry";
    if (precip > 0 || prob >= 20) {
      const typeStr = hourType.type !== "none" ? hourType.type : "precip";
      desc = `${prob}% ${typeStr}, ${precip.toFixed(2)}${hourly_units.precipitation}`;
    }
    lines.push(`${time}: ${desc}`);
  }

  // 7-day daily forecast
  lines.push("");
  lines.push("=== 7-Day Precipitation Forecast ===");
  let weekTotal = 0;

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const total = daily.precipitation_sum[i];
    const hours = daily.precipitation_hours[i];
    const prob = daily.precipitation_probability_max[i];
    const rain = daily.rain_sum[i];
    const snow = daily.snowfall_sum[i];

    weekTotal += total;

    let typeStr = "";
    if (snow > 0 && rain > 0) typeStr = " (rain/snow mix)";
    else if (snow > 0) typeStr = " (snow)";
    else if (rain > 0) typeStr = " (rain)";

    lines.push(`${date}: ${total.toFixed(2)}${daily_units.precipitation_sum}${typeStr}, ${hours}hrs, ${prob}% chance`);
  }

  lines.push("");
  lines.push(`Weekly Total: ${weekTotal.toFixed(2)} ${daily_units.precipitation_sum}`);

  return lines.join("\n");
}
