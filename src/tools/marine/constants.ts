/**
 * tools/marine/constants.ts — Constants for marine weather tool.
 */

// Re-export shared utilities
export { getCardinalDirection } from "../shared/directions.js";
export { SEA_STATE_CODES, getSeaState, type SeaState } from "../shared/sea-state.js";

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
