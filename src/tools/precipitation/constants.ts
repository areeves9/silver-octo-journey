/**
 * tools/precipitation/constants.ts — Constants for precipitation tool.
 */

import type { PrecipitationType } from "./types.js";

/**
 * Precipitation intensity thresholds (inches per hour).
 */
export const PRECIP_INTENSITY = {
  LIGHT: 0.1,
  MODERATE: 0.3,
  HEAVY: 0.5,
};

/**
 * Snowfall intensity thresholds (inches per hour).
 */
export const SNOW_INTENSITY = {
  LIGHT: 0.5,
  MODERATE: 1.0,
  HEAVY: 2.0,
};

/**
 * Get precipitation intensity description.
 */
export function getPrecipIntensity(inchesPerHour: number, isSnow: boolean = false): string {
  if (inchesPerHour === 0) return "none";

  const thresholds = isSnow ? SNOW_INTENSITY : PRECIP_INTENSITY;

  if (inchesPerHour < thresholds.LIGHT) return "trace";
  if (inchesPerHour < thresholds.MODERATE) return "light";
  if (inchesPerHour < thresholds.HEAVY) return "moderate";
  return "heavy";
}

/**
 * Determine precipitation type from weather code.
 */
export function getPrecipType(weatherCode: number): PrecipitationType {
  // No precipitation
  if (weatherCode <= 3) {
    return { type: "none", intensity: "none" };
  }

  // Drizzle (51-57)
  if (weatherCode >= 51 && weatherCode <= 57) {
    const intensity = weatherCode <= 53 ? "light" : weatherCode <= 55 ? "moderate" : "heavy";
    return { type: "rain", intensity };
  }

  // Rain (61-67)
  if (weatherCode >= 61 && weatherCode <= 67) {
    const intensity = weatherCode <= 63 ? "light" : weatherCode <= 65 ? "moderate" : "heavy";
    return { type: "rain", intensity };
  }

  // Snow (71-77)
  if (weatherCode >= 71 && weatherCode <= 77) {
    const intensity = weatherCode <= 73 ? "light" : weatherCode <= 75 ? "moderate" : "heavy";
    return { type: "snow", intensity };
  }

  // Showers (80-82)
  if (weatherCode >= 80 && weatherCode <= 82) {
    const intensity = weatherCode === 80 ? "light" : weatherCode === 81 ? "moderate" : "heavy";
    return { type: "showers", intensity };
  }

  // Snow showers (85-86)
  if (weatherCode >= 85 && weatherCode <= 86) {
    const intensity = weatherCode === 85 ? "light" : "heavy";
    return { type: "snow", intensity };
  }

  // Thunderstorm (95-99)
  if (weatherCode >= 95) {
    return { type: "showers", intensity: "heavy" };
  }

  return { type: "none", intensity: "none" };
}

/**
 * Probability descriptions.
 */
export function getProbabilityDescription(percent: number): string {
  if (percent === 0) return "No chance";
  if (percent < 20) return "Slight chance";
  if (percent < 40) return "Possible";
  if (percent < 60) return "Likely";
  if (percent < 80) return "Very likely";
  return "Almost certain";
}
