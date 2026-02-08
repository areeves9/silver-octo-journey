/**
 * tools/humidity/constants.ts — Constants for humidity tool.
 */

import type { ComfortLevel } from "./types.js";

/**
 * Relative humidity comfort levels.
 */
export const HUMIDITY_LEVELS: { max: number; level: ComfortLevel }[] = [
  { max: 25, level: { level: "Dry", description: "Very dry air, may cause discomfort" } },
  { max: 40, level: { level: "Comfortable", description: "Ideal humidity range" } },
  { max: 55, level: { level: "Slightly Humid", description: "Still comfortable for most" } },
  { max: 65, level: { level: "Humid", description: "Becoming uncomfortable" } },
  { max: 80, level: { level: "Very Humid", description: "Uncomfortable, muggy" } },
  { max: 100, level: { level: "Oppressive", description: "Very uncomfortable, tropical" } },
];

/**
 * Dew point comfort levels (Fahrenheit).
 * Dew point is often a better indicator of comfort than relative humidity.
 */
export const DEW_POINT_LEVELS: { max: number; description: string }[] = [
  { max: 50, description: "Dry and comfortable" },
  { max: 55, description: "Comfortable" },
  { max: 60, description: "Slightly humid" },
  { max: 65, description: "Becoming uncomfortable" },
  { max: 70, description: "Humid and uncomfortable" },
  { max: 75, description: "Very humid, oppressive" },
  { max: 100, description: "Severely humid, dangerous" },
];

/**
 * Get humidity comfort level.
 */
export function getHumidityLevel(humidity: number): ComfortLevel {
  const found = HUMIDITY_LEVELS.find((l) => humidity <= l.max);
  return found?.level ?? HUMIDITY_LEVELS[HUMIDITY_LEVELS.length - 1].level;
}

/**
 * Get dew point comfort description.
 */
export function getDewPointComfort(dewPointF: number): string {
  const found = DEW_POINT_LEVELS.find((l) => dewPointF <= l.max);
  return found?.description ?? DEW_POINT_LEVELS[DEW_POINT_LEVELS.length - 1].description;
}

/**
 * Check for fog potential based on temperature and dew point spread.
 */
export function getFogPotential(tempF: number, dewPointF: number): string {
  const spread = tempF - dewPointF;
  if (spread <= 2.5) return "High - fog likely";
  if (spread <= 5) return "Moderate - fog possible";
  if (spread <= 10) return "Low - mist possible";
  return "None";
}

/**
 * Vapour Pressure Deficit interpretation for plants.
 */
export function getVPDDescription(vpd: number): string {
  if (vpd < 0.4) return "Low - risk of mold, fungal issues";
  if (vpd < 0.8) return "Optimal for propagation/seedlings";
  if (vpd < 1.2) return "Optimal for vegetative growth";
  if (vpd < 1.6) return "Optimal for flowering/fruiting";
  return "High - plants may stress, increase watering";
}
