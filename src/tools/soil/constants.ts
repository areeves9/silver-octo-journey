/**
 * tools/soil/constants.ts — Constants for soil conditions tool.
 */

import type { SoilDepthInfo, MoistureLevel } from "./types.js";

/**
 * Soil measurement depths and their agricultural relevance.
 */
export const SOIL_DEPTHS: SoilDepthInfo[] = [
  { depth: "0-1cm", description: "Surface - seed germination zone" },
  { depth: "1-3cm", description: "Shallow roots - seedlings" },
  { depth: "3-9cm", description: "Typical root zone - annuals" },
  { depth: "9-27cm", description: "Deep root zone - most crops" },
  { depth: "27-81cm", description: "Subsoil - deep-rooted plants, trees" },
];

/**
 * Soil temperature depths and their relevance.
 */
export const TEMP_DEPTHS: SoilDepthInfo[] = [
  { depth: "0cm", description: "Surface temperature" },
  { depth: "6cm", description: "Shallow soil (~2.5 inches)" },
  { depth: "18cm", description: "Root zone (~7 inches)" },
  { depth: "54cm", description: "Deep soil (~21 inches)" },
];

/**
 * Volumetric soil moisture levels (m³/m³).
 * These are general guidelines; optimal ranges vary by soil type.
 */
export const MOISTURE_LEVELS: MoistureLevel[] = [
  { min: 0, max: 0.1, label: "Very Dry", description: "Wilting point - irrigation needed" },
  { min: 0.1, max: 0.2, label: "Dry", description: "Below optimal - consider watering" },
  { min: 0.2, max: 0.35, label: "Optimal", description: "Good moisture for most plants" },
  { min: 0.35, max: 0.45, label: "Moist", description: "Well-watered soil" },
  { min: 0.45, max: 1.0, label: "Saturated", description: "Waterlogged - may cause root issues" },
];

/**
 * Get moisture level description.
 */
export function getMoistureLevel(moisture: number): MoistureLevel {
  return MOISTURE_LEVELS.find((level) => moisture >= level.min && moisture < level.max) ?? MOISTURE_LEVELS[0];
}

/**
 * Soil temperature thresholds for planting (Fahrenheit).
 */
export const PLANTING_TEMPS = {
  COLD_SEASON: { min: 40, label: "Cold-season crops (lettuce, spinach, peas)" },
  COOL_SEASON: { min: 50, label: "Cool-season crops (broccoli, carrots)" },
  WARM_SEASON: { min: 60, label: "Warm-season crops (tomatoes, peppers)" },
  HOT_SEASON: { min: 70, label: "Hot-season crops (melons, squash)" },
};

/**
 * Get planting recommendation based on soil temperature.
 */
export function getPlantingRecommendation(tempF: number): string {
  if (tempF >= PLANTING_TEMPS.HOT_SEASON.min) {
    return `Suitable for all crops including ${PLANTING_TEMPS.HOT_SEASON.label}`;
  }
  if (tempF >= PLANTING_TEMPS.WARM_SEASON.min) {
    return `Good for ${PLANTING_TEMPS.WARM_SEASON.label} and cooler`;
  }
  if (tempF >= PLANTING_TEMPS.COOL_SEASON.min) {
    return `Good for ${PLANTING_TEMPS.COOL_SEASON.label} and cooler`;
  }
  if (tempF >= PLANTING_TEMPS.COLD_SEASON.min) {
    return `Only suitable for ${PLANTING_TEMPS.COLD_SEASON.label}`;
  }
  return "Too cold for most planting";
}
