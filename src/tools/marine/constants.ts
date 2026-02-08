/**
 * tools/marine/constants.ts — Constants for marine weather tool.
 */

import type { SeaState } from "./types.js";

/**
 * Douglas Sea State scale.
 * https://en.wikipedia.org/wiki/Douglas_sea_scale
 */
export const SEA_STATE_CODES: SeaState[] = [
  { code: 0, description: "Calm (glassy)", waveHeight: "0 m" },
  { code: 1, description: "Calm (rippled)", waveHeight: "0-0.1 m" },
  { code: 2, description: "Smooth", waveHeight: "0.1-0.5 m" },
  { code: 3, description: "Slight", waveHeight: "0.5-1.25 m" },
  { code: 4, description: "Moderate", waveHeight: "1.25-2.5 m" },
  { code: 5, description: "Rough", waveHeight: "2.5-4 m" },
  { code: 6, description: "Very rough", waveHeight: "4-6 m" },
  { code: 7, description: "High", waveHeight: "6-9 m" },
  { code: 8, description: "Very high", waveHeight: "9-14 m" },
  { code: 9, description: "Phenomenal", waveHeight: ">14 m" },
];

/**
 * Wave height descriptors for different activities.
 */
export const WAVE_CONDITIONS = {
  FLAT: { max: 0.3, label: "Flat", suitability: "Ideal for swimming, kayaking" },
  SMALL: { max: 1.0, label: "Small waves", suitability: "Good for beginners, SUP" },
  MODERATE: { max: 2.0, label: "Moderate waves", suitability: "Suitable for intermediate surfers" },
  LARGE: { max: 3.5, label: "Large waves", suitability: "Advanced surfers only" },
  VERY_LARGE: { max: 6.0, label: "Very large waves", suitability: "Experts only, dangerous" },
  EXTREME: { max: Infinity, label: "Extreme waves", suitability: "Stay on shore" },
};

/**
 * Get sea state from wave height in meters.
 */
export function getSeaState(waveHeightMeters: number): SeaState {
  if (waveHeightMeters <= 0) return SEA_STATE_CODES[0];
  if (waveHeightMeters <= 0.1) return SEA_STATE_CODES[1];
  if (waveHeightMeters <= 0.5) return SEA_STATE_CODES[2];
  if (waveHeightMeters <= 1.25) return SEA_STATE_CODES[3];
  if (waveHeightMeters <= 2.5) return SEA_STATE_CODES[4];
  if (waveHeightMeters <= 4) return SEA_STATE_CODES[5];
  if (waveHeightMeters <= 6) return SEA_STATE_CODES[6];
  if (waveHeightMeters <= 9) return SEA_STATE_CODES[7];
  if (waveHeightMeters <= 14) return SEA_STATE_CODES[8];
  return SEA_STATE_CODES[9];
}

/**
 * Convert wave direction in degrees to cardinal direction.
 */
export function getCardinalDirection(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Get wave conditions assessment based on wave height.
 */
export function getWaveConditions(waveHeightMeters: number): { label: string; suitability: string } {
  if (waveHeightMeters <= WAVE_CONDITIONS.FLAT.max) return WAVE_CONDITIONS.FLAT;
  if (waveHeightMeters <= WAVE_CONDITIONS.SMALL.max) return WAVE_CONDITIONS.SMALL;
  if (waveHeightMeters <= WAVE_CONDITIONS.MODERATE.max) return WAVE_CONDITIONS.MODERATE;
  if (waveHeightMeters <= WAVE_CONDITIONS.LARGE.max) return WAVE_CONDITIONS.LARGE;
  if (waveHeightMeters <= WAVE_CONDITIONS.VERY_LARGE.max) return WAVE_CONDITIONS.VERY_LARGE;
  return WAVE_CONDITIONS.EXTREME;
}
