/**
 * tools/marine-conditions/types.ts — Type definitions for marine conditions compound tool.
 */

export interface MarineConditionsResponse {
  latitude: number;
  longitude: number;
  marine: {
    current: {
      wave_height: number;
      wave_direction: number;
      wave_period: number;
      swell_wave_height: number;
      swell_wave_direction: number;
      swell_wave_period: number;
      wind_wave_height: number;
      wind_wave_direction: number;
      ocean_current_velocity: number;
      ocean_current_direction: number;
    };
    current_units: Record<string, string>;
    daily?: {
      time: string[];
      wave_height_max: number[];
      wave_period_max: number[];
    };
    daily_units?: Record<string, string>;
  };
  weather: {
    current: {
      temperature_2m: number;
      wind_speed_10m: number;
      wind_direction_10m: number;
      wind_gusts_10m: number;
      weather_code: number;
    };
    current_units: Record<string, string>;
  };
}

export type MarineActivity = "swimming" | "surfing" | "boating" | "fishing" | "diving";

export interface ActivitySuitability {
  activity: MarineActivity;
  rating: "Excellent" | "Good" | "Fair" | "Poor" | "Dangerous";
  notes: string;
}

export interface MarineAssessment {
  seaState: string;
  seaStateCode: number;
  overallSafety: "Safe" | "Caution" | "Hazardous";
  activities: ActivitySuitability[];
  warnings: string[];
}
