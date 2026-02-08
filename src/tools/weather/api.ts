/**
 * tools/weather/api.ts — Open-Meteo API functions.
 */

import type { GeoResult, GeoResponse, WeatherResponse } from "./types.js";
import { WMO_CODES } from "./constants.js";
import { cachedFetchJson } from "../shared/fetch.js";

/**
 * Geocode a city name to coordinates.
 */
export async function geocodeCity(city: string): Promise<GeoResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const data = await cachedFetchJson<GeoResponse>(url);

  if (!data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0];
}

/**
 * Fetch current weather for coordinates.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "wind_speed_10m",
      "wind_direction_10m",
      "weather_code",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  return cachedFetchJson<WeatherResponse>(url);
}

/**
 * Format weather data into a human-readable report.
 */
export function formatWeatherReport(
  location: GeoResult,
  weather: WeatherResponse
): string {
  const { current, current_units } = weather;
  const condition =
    WMO_CODES[current.weather_code] ??
    `Unknown (code ${current.weather_code})`;

  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const lonDirection = location.longitude >= 0 ? "E" : "W";
  const latDirection = location.latitude >= 0 ? "N" : "S";

  return [
    `Weather for ${locationName}`,
    `Coordinates: ${Math.abs(location.latitude)}°${latDirection}, ${Math.abs(location.longitude)}°${lonDirection}`,
    ``,
    `Condition: ${condition}`,
    `Temperature: ${current.temperature_2m}${current_units.temperature_2m}`,
    `Feels like: ${current.apparent_temperature}${current_units.apparent_temperature}`,
    `Humidity: ${current.relative_humidity_2m}${current_units.relative_humidity_2m}`,
    `Wind: ${current.wind_speed_10m} ${current_units.wind_speed_10m} from ${current.wind_direction_10m}°`,
  ].join("\n");
}
