/**
 * tools/marine/types.ts — Type definitions for marine weather tool.
 */

export interface MarineCurrentData {
  time: string;
  wave_height: number;
  wave_direction: number;
  wave_period: number;
  wind_wave_height: number;
  wind_wave_direction: number;
  wind_wave_period: number;
  swell_wave_height: number;
  swell_wave_direction: number;
  swell_wave_period: number;
  ocean_current_velocity: number;
  ocean_current_direction: number;
}

export interface MarineDailyData {
  time: string[];
  wave_height_max: number[];
  wave_direction_dominant: number[];
  wave_period_max: number[];
  swell_wave_height_max: number[];
  swell_wave_direction_dominant: number[];
}

export interface MarineResponse {
  latitude: number;
  longitude: number;
  current: MarineCurrentData;
  current_units: Record<string, string>;
  daily?: MarineDailyData;
  daily_units?: Record<string, string>;
}

export interface SeaState {
  code: number;
  description: string;
  waveHeight: string;
}
