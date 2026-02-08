/**
 * tools/soil/types.ts — Type definitions for soil conditions tool.
 */

export interface SoilHourlyData {
  time: string[];
  soil_temperature_0cm: number[];
  soil_temperature_6cm: number[];
  soil_temperature_18cm: number[];
  soil_temperature_54cm: number[];
  soil_moisture_0_to_1cm: number[];
  soil_moisture_1_to_3cm: number[];
  soil_moisture_3_to_9cm: number[];
  soil_moisture_9_to_27cm: number[];
  soil_moisture_27_to_81cm: number[];
}

export interface SoilResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: SoilHourlyData;
  hourly_units: Record<string, string>;
}

export interface SoilDepthInfo {
  depth: string;
  description: string;
}

export interface MoistureLevel {
  min: number;
  max: number;
  label: string;
  description: string;
}
