/**
 * tools/shared/geocoding.ts — Shared geocoding utilities.
 *
 * Re-exports geocoding functionality for use across multiple tools.
 */

export { geocodeCity } from "../weather/api.js";
export type { GeoResult, GeoResponse } from "../weather/types.js";
