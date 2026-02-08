/**
 * tools/fire-weather/types.ts — Type definitions for fire weather tool.
 */

export interface FireWeatherData {
  // Current conditions
  temperature: number;
  temperatureMax: number;
  relativeHumidity: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;

  // Precipitation history (last 7 days)
  recentPrecipitation: number;

  // Soil moisture (drought indicator)
  soilMoisture: number;
}

export interface FireWeatherResponse {
  latitude: number;
  longitude: number;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    wind_direction_10m: number;
  };
  current_units: Record<string, string>;
  daily: {
    temperature_2m_max: number[];
    precipitation_sum: number[];
  };
  daily_units: Record<string, string>;
  hourly: {
    soil_moisture_0_to_1cm: number[];
  };
}

export type FireRiskLevel = "Low" | "Moderate" | "High" | "Very High" | "Extreme";

export interface FireRiskAssessment {
  level: FireRiskLevel;
  score: number;
  factors: string[];
  recommendations: string[];
}
