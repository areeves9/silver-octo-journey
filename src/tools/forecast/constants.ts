/**
 * tools/forecast/constants.ts — Constants for forecast tools.
 */

/**
 * Maximum days for daily forecast.
 */
export const MAX_FORECAST_DAYS = 7;

/**
 * Maximum hours for hourly forecast.
 */
export const MAX_FORECAST_HOURS = 48;

/**
 * Default hours for hourly forecast.
 */
export const DEFAULT_FORECAST_HOURS = 24;

/**
 * Precipitation intensity descriptions.
 */
export const PRECIPITATION_INTENSITY: Record<string, string> = {
  none: "No precipitation",
  light: "Light precipitation",
  moderate: "Moderate precipitation",
  heavy: "Heavy precipitation",
};

/**
 * Get precipitation intensity description based on mm/hour.
 */
export function getPrecipitationIntensity(mmPerHour: number): string {
  if (mmPerHour === 0) return PRECIPITATION_INTENSITY.none;
  if (mmPerHour < 2.5) return PRECIPITATION_INTENSITY.light;
  if (mmPerHour < 7.5) return PRECIPITATION_INTENSITY.moderate;
  return PRECIPITATION_INTENSITY.heavy;
}
