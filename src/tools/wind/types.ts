/**
 * tools/wind/types.ts — Type definitions for wind tool.
 */

export interface WindResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  current_units: Record<string, string>;
  hourly: {
    time: string[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
  };
  hourly_units: Record<string, string>;
  daily: {
    time: string[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
  };
  daily_units: Record<string, string>;
}

export interface BeaufortScale {
  force: number;
  description: string;
  minSpeed: number;
  maxSpeed: number;
  seaCondition: string;
  landCondition: string;
}
