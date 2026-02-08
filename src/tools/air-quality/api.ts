/**
 * tools/air-quality/api.ts — Open-Meteo Air Quality API functions.
 */

import type { GeoResult } from "../shared/geocoding.js";
import type { AirQualityResponse } from "./types.js";
import { getUSAQILevel, getUVIndexLevel, getPollenLevel } from "./constants.js";
import { fetchWithTimeout } from "../shared/fetch.js";

/**
 * Fetch current air quality for coordinates.
 */
export async function fetchAirQuality(
  latitude: number,
  longitude: number
): Promise<AirQualityResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "us_aqi",
      "european_aqi",
      "pm10",
      "pm2_5",
      "carbon_monoxide",
      "nitrogen_dioxide",
      "sulphur_dioxide",
      "ozone",
      "uv_index",
      "uv_index_clear_sky",
      "alder_pollen",
      "birch_pollen",
      "grass_pollen",
      "mugwort_pollen",
      "olive_pollen",
      "ragweed_pollen",
    ].join(","),
    timezone: "auto",
  });

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`Air Quality API returned ${response.status}`);
  }

  return (await response.json()) as AirQualityResponse;
}

/**
 * Format air quality data into a human-readable report.
 */
export function formatAirQualityReport(
  location: GeoResult,
  data: AirQualityResponse
): string {
  const { current, current_units } = data;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const usAqiLevel = getUSAQILevel(current.us_aqi);
  const uvLevel = getUVIndexLevel(current.uv_index);

  const lines = [
    `Air Quality for ${locationName}`,
    "",
    "=== Air Quality Index ===",
    `US AQI: ${current.us_aqi} (${usAqiLevel.label})`,
    `  ${usAqiLevel.description}`,
    `European AQI: ${current.european_aqi}`,
    "",
    "=== Pollutants ===",
    `PM2.5: ${current.pm2_5} ${current_units.pm2_5}`,
    `PM10: ${current.pm10} ${current_units.pm10}`,
    `Ozone (O₃): ${current.ozone} ${current_units.ozone}`,
    `Nitrogen Dioxide (NO₂): ${current.nitrogen_dioxide} ${current_units.nitrogen_dioxide}`,
    `Sulphur Dioxide (SO₂): ${current.sulphur_dioxide} ${current_units.sulphur_dioxide}`,
    `Carbon Monoxide (CO): ${current.carbon_monoxide} ${current_units.carbon_monoxide}`,
    "",
    "=== UV Index ===",
    `Current: ${current.uv_index} (${uvLevel.label})`,
    `Clear Sky Max: ${current.uv_index_clear_sky}`,
    `Protection: ${uvLevel.protection}`,
  ];

  // Add pollen data if available
  const pollenTypes = [
    { name: "Alder", value: current.alder_pollen },
    { name: "Birch", value: current.birch_pollen },
    { name: "Grass", value: current.grass_pollen },
    { name: "Mugwort", value: current.mugwort_pollen },
    { name: "Olive", value: current.olive_pollen },
    { name: "Ragweed", value: current.ragweed_pollen },
  ].filter((p) => p.value !== undefined && p.value > 0);

  if (pollenTypes.length > 0) {
    lines.push("");
    lines.push("=== Pollen Levels ===");
    for (const pollen of pollenTypes) {
      lines.push(`${pollen.name}: ${pollen.value} grains/m³ (${getPollenLevel(pollen.value!)})`);
    }
  }

  return lines.join("\n");
}
