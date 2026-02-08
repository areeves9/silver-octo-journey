/**
 * tools/precipitation/types.ts — Type definitions for precipitation tool.
 */

export interface PrecipitationResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    precipitation: number;
    rain: number;
    showers: number;
    snowfall: number;
    weather_code: number;
  };
  current_units: Record<string, string>;
  hourly: {
    time: string[];
    precipitation: number[];
    precipitation_probability: number[];
    rain: number[];
    showers: number[];
    snowfall: number[];
    weather_code: number[];
  };
  hourly_units: Record<string, string>;
  daily: {
    time: string[];
    precipitation_sum: number[];
    precipitation_hours: number[];
    precipitation_probability_max: number[];
    rain_sum: number[];
    showers_sum: number[];
    snowfall_sum: number[];
  };
  daily_units: Record<string, string>;
}

export interface PrecipitationType {
  type: "none" | "rain" | "showers" | "snow" | "mixed";
  intensity: "none" | "light" | "moderate" | "heavy";
}
