/**
 * tools/weather/types.ts — Type definitions for weather tool.
 */

export interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // state/province
}

export interface GeoResponse {
  results?: GeoResult[];
}

export interface CurrentWeather {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  weather_code: number;
}

export interface WeatherResponse {
  current: CurrentWeather;
  current_units: Record<string, string>;
}
