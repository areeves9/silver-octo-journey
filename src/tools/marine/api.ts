/**
 * tools/marine/api.ts — Open-Meteo Marine API functions.
 */

import type { MarineResponse } from "./types.js";
import { getSeaState, getCardinalDirection, getWaveConditions } from "./constants.js";
import { cachedFetchJson } from "../shared/fetch.js";

/**
 * Fetch current marine weather for coordinates.
 */
export async function fetchMarineWeather(
  latitude: number,
  longitude: number
): Promise<MarineResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "wave_height",
      "wave_direction",
      "wave_period",
      "wind_wave_height",
      "wind_wave_direction",
      "wind_wave_period",
      "swell_wave_height",
      "swell_wave_direction",
      "swell_wave_period",
      "ocean_current_velocity",
      "ocean_current_direction",
    ].join(","),
    length_unit: "imperial",
    timezone: "auto",
  });

  const url = `https://marine-api.open-meteo.com/v1/marine?${params}`;
  return cachedFetchJson<MarineResponse>(url);
}

/**
 * Format marine weather data into a human-readable report.
 */
export function formatMarineReport(
  latitude: number,
  longitude: number,
  data: MarineResponse
): string {
  const { current, current_units } = data;

  const latDirection = latitude >= 0 ? "N" : "S";
  const lonDirection = longitude >= 0 ? "E" : "W";
  const locationStr = `${Math.abs(latitude).toFixed(4)}°${latDirection}, ${Math.abs(longitude).toFixed(4)}°${lonDirection}`;

  // Convert feet to meters for sea state calculation (API returns feet with imperial setting)
  const waveHeightMeters = current.wave_height * 0.3048;
  const seaState = getSeaState(waveHeightMeters);
  const waveConditions = getWaveConditions(waveHeightMeters);
  const waveDir = getCardinalDirection(current.wave_direction);
  const swellDir = getCardinalDirection(current.swell_wave_direction);
  const currentDir = getCardinalDirection(current.ocean_current_direction);

  const lines = [
    `Marine Conditions at ${locationStr}`,
    "",
    "=== Overall Conditions ===",
    `Sea State: ${seaState.code} - ${seaState.description}`,
    `Conditions: ${waveConditions.label}`,
    `Suitability: ${waveConditions.suitability}`,
    "",
    "=== Combined Waves ===",
    `Height: ${current.wave_height} ${current_units.wave_height}`,
    `Direction: ${current.wave_direction}° (from ${waveDir})`,
    `Period: ${current.wave_period} ${current_units.wave_period}`,
    "",
    "=== Wind Waves ===",
    `Height: ${current.wind_wave_height} ${current_units.wind_wave_height}`,
    `Direction: ${current.wind_wave_direction}° (from ${getCardinalDirection(current.wind_wave_direction)})`,
    `Period: ${current.wind_wave_period} ${current_units.wind_wave_period}`,
    "",
    "=== Swell ===",
    `Height: ${current.swell_wave_height} ${current_units.swell_wave_height}`,
    `Direction: ${current.swell_wave_direction}° (from ${swellDir})`,
    `Period: ${current.swell_wave_period} ${current_units.swell_wave_period}`,
    "",
    "=== Ocean Current ===",
    `Velocity: ${current.ocean_current_velocity} ${current_units.ocean_current_velocity}`,
    `Direction: ${current.ocean_current_direction}° (towards ${currentDir})`,
  ];

  return lines.join("\n");
}
