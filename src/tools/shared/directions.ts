/**
 * tools/shared/directions.ts — Shared cardinal direction utility.
 *
 * Converts degrees to 16-point compass cardinal directions.
 * Used by wind, marine, fire-weather, and marine-conditions tools.
 */

/**
 * Convert degrees (0-360) to cardinal direction.
 */
export function getCardinalDirection(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
