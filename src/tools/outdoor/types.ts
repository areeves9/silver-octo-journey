/**
 * tools/outdoor/types.ts — Type definitions for outdoor conditions tool.
 */

export interface OutdoorResponse {
  latitude: number;
  longitude: number;
  weather: {
    current: {
      temperature_2m: number;
      apparent_temperature: number;
      relative_humidity_2m: number;
      wind_speed_10m: number;
      wind_gusts_10m: number;
      weather_code: number;
      precipitation: number;
    };
    current_units: Record<string, string>;
  };
  airQuality: {
    current: {
      us_aqi: number;
      pm2_5: number;
      pm10: number;
      uv_index: number;
      alder_pollen?: number;
      birch_pollen?: number;
      grass_pollen?: number;
      mugwort_pollen?: number;
      olive_pollen?: number;
      ragweed_pollen?: number;
    };
    current_units: Record<string, string>;
  };
}

export type ActivityRecommendation = "Excellent" | "Good" | "Fair" | "Poor" | "Avoid";

export interface OutdoorAssessment {
  overall: ActivityRecommendation;
  score: number;
  weatherSuitability: ActivityRecommendation;
  airQualitySuitability: ActivityRecommendation;
  uvSafety: ActivityRecommendation;
  concerns: string[];
  recommendations: string[];
}
