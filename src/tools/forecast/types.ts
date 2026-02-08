/**
 * tools/forecast/types.ts — Type definitions for forecast tools.
 */

export interface DailyForecast {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  wind_gusts_10m_max: number[];
  sunrise: string[];
  sunset: string[];
}

export interface DailyForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: DailyForecast;
  daily_units: Record<string, string>;
}

export interface HourlyForecast {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
}

export interface HourlyForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: HourlyForecast;
  hourly_units: Record<string, string>;
}
