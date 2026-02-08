/**
 * tools/wind/constants.ts — Constants for wind tool.
 */

import type { BeaufortScale } from "./types.js";

/**
 * Beaufort Wind Scale (speeds in mph).
 */
export const BEAUFORT_SCALE: BeaufortScale[] = [
  { force: 0, description: "Calm", minSpeed: 0, maxSpeed: 1, seaCondition: "Sea like a mirror", landCondition: "Smoke rises vertically" },
  { force: 1, description: "Light air", minSpeed: 1, maxSpeed: 3, seaCondition: "Ripples", landCondition: "Smoke drifts" },
  { force: 2, description: "Light breeze", minSpeed: 4, maxSpeed: 7, seaCondition: "Small wavelets", landCondition: "Leaves rustle" },
  { force: 3, description: "Gentle breeze", minSpeed: 8, maxSpeed: 12, seaCondition: "Large wavelets", landCondition: "Leaves in constant motion" },
  { force: 4, description: "Moderate breeze", minSpeed: 13, maxSpeed: 18, seaCondition: "Small waves", landCondition: "Small branches move" },
  { force: 5, description: "Fresh breeze", minSpeed: 19, maxSpeed: 24, seaCondition: "Moderate waves", landCondition: "Small trees sway" },
  { force: 6, description: "Strong breeze", minSpeed: 25, maxSpeed: 31, seaCondition: "Large waves", landCondition: "Large branches move" },
  { force: 7, description: "Near gale", minSpeed: 32, maxSpeed: 38, seaCondition: "Sea heaps up", landCondition: "Whole trees move" },
  { force: 8, description: "Gale", minSpeed: 39, maxSpeed: 46, seaCondition: "Moderately high waves", landCondition: "Twigs break off" },
  { force: 9, description: "Strong gale", minSpeed: 47, maxSpeed: 54, seaCondition: "High waves", landCondition: "Slight structural damage" },
  { force: 10, description: "Storm", minSpeed: 55, maxSpeed: 63, seaCondition: "Very high waves", landCondition: "Trees uprooted" },
  { force: 11, description: "Violent storm", minSpeed: 64, maxSpeed: 72, seaCondition: "Exceptionally high waves", landCondition: "Widespread damage" },
  { force: 12, description: "Hurricane", minSpeed: 73, maxSpeed: 999, seaCondition: "Sea completely white", landCondition: "Devastation" },
];

/**
 * Get Beaufort scale info from wind speed in mph.
 */
export function getBeaufortScale(speedMph: number): BeaufortScale {
  return BEAUFORT_SCALE.find((b) => speedMph >= b.minSpeed && speedMph <= b.maxSpeed) ?? BEAUFORT_SCALE[12];
}

/**
 * Convert degrees to cardinal direction.
 */
export function getCardinalDirection(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Wind advisory thresholds (mph).
 */
export const WIND_ADVISORIES = {
  WIND_ADVISORY: 31, // Sustained winds 31-39 mph or gusts 46-57 mph
  HIGH_WIND_WARNING: 40, // Sustained winds >= 40 mph or gusts >= 58 mph
  GUST_ADVISORY: 46,
  GUST_WARNING: 58,
};
