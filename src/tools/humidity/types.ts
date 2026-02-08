/**
 * tools/humidity/types.ts — Type definitions for humidity tool.
 */

export interface HumidityResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    dew_point_2m: number;
    apparent_temperature: number;
    surface_pressure: number;
  };
  current_units: Record<string, string>;
  hourly: {
    time: string[];
    relative_humidity_2m: number[];
    dew_point_2m: number[];
    vapour_pressure_deficit: number[];
  };
  hourly_units: Record<string, string>;
}

export interface ComfortLevel {
  level: "Dry" | "Comfortable" | "Slightly Humid" | "Humid" | "Very Humid" | "Oppressive";
  description: string;
}
