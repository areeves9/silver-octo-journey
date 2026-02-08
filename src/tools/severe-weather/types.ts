/**
 * tools/severe-weather/types.ts — Severe weather alert types.
 */

/** Severity level for weather alerts, ordered highest to lowest. */
export type SeverityLevel = "Warning" | "Watch" | "Advisory";

/** Category of weather hazard. */
export type AlertCategory =
  | "Heat"
  | "Cold"
  | "Wind"
  | "Precipitation"
  | "Thunderstorm"
  | "Air Quality"
  | "UV";

/** A single weather alert with its details. */
export interface Alert {
  category: AlertCategory;
  severity: SeverityLevel;
  headline: string;
  timeframe: string;
  recommendation: string;
}

/** Raw forecast response shape for the severe weather fetch. */
export interface SevereWeatherForecastResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
    precipitation: number;
    snowfall: number;
  };
  current_units: {
    temperature_2m: string;
    apparent_temperature: string;
    wind_speed_10m: string;
    wind_gusts_10m: string;
    precipitation: string;
    snowfall: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    precipitation_sum: number[];
    snowfall_sum: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    weather_code: number[];
  };
}

/** Raw air quality response shape for the severe weather fetch. */
export interface SevereWeatherAQResponse {
  current: {
    us_aqi: number;
    uv_index: number;
  };
}
