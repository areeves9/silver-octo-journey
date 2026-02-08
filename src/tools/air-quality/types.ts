/**
 * tools/air-quality/types.ts — Type definitions for air quality tool.
 */

export interface AirQualityCurrent {
  time: string;
  us_aqi: number;
  european_aqi: number;
  pm10: number;
  pm2_5: number;
  carbon_monoxide: number;
  nitrogen_dioxide: number;
  sulphur_dioxide: number;
  ozone: number;
  uv_index: number;
  uv_index_clear_sky: number;
  alder_pollen?: number;
  birch_pollen?: number;
  grass_pollen?: number;
  mugwort_pollen?: number;
  olive_pollen?: number;
  ragweed_pollen?: number;
}

export interface AirQualityResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: AirQualityCurrent;
  current_units: Record<string, string>;
}

export interface AQILevel {
  min: number;
  max: number;
  label: string;
  description: string;
  color: string;
}
