/**
 * tools/agriculture/types.ts — Type definitions for agriculture tool.
 */

export interface AgricultureResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    temperature_2m: number;
  };
  current_units: Record<string, string>;
  hourly: {
    time: string[];
    soil_temperature_6cm: number[];
    soil_temperature_18cm: number[];
    soil_moisture_0_to_1cm: number[];
    soil_moisture_3_to_9cm: number[];
    soil_moisture_9_to_27cm: number[];
    et0_fao_evapotranspiration: number[];
  };
  hourly_units: Record<string, string>;
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    et0_fao_evapotranspiration: number[];
  };
  daily_units: Record<string, string>;
}

export interface GrowingConditions {
  soilMoistureStatus: "Dry" | "Optimal" | "Wet" | "Saturated";
  irrigationNeeded: boolean;
  frostRisk: boolean;
  frostDays: string[];
  growingDegreeDays: number;
  weeklyPrecipForecast: number;
  weeklyET0: number;
  waterBalance: number;
}

export interface PlantingWindow {
  cropType: string;
  minSoilTemp: number;
  suitable: boolean;
}
