/**
 * tools/forecast/api.ts — Open-Meteo forecast API functions.
 */

import type { GeoResult } from "../shared/geocoding.js";
import type { DailyForecastResponse, HourlyForecastResponse } from "./types.js";
import { MAX_FORECAST_DAYS, MAX_FORECAST_HOURS } from "./constants.js";
import { WMO_CODES } from "../weather/constants.js";

/**
 * Fetch 7-day daily forecast for coordinates.
 */
export async function fetchDailyForecast(
  latitude: number,
  longitude: number
): Promise<DailyForecastResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "sunrise",
      "sunset",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: MAX_FORECAST_DAYS.toString(),
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Forecast API returned ${response.status}`);
  }

  return (await response.json()) as DailyForecastResponse;
}

/**
 * Fetch hourly forecast for coordinates.
 */
export async function fetchHourlyForecast(
  latitude: number,
  longitude: number,
  hours: number = 24
): Promise<HourlyForecastResponse> {
  const forecastHours = Math.min(hours, MAX_FORECAST_HOURS);

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_hours: forecastHours.toString(),
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Hourly forecast API returned ${response.status}`);
  }

  return (await response.json()) as HourlyForecastResponse;
}

/**
 * Format daily forecast into a human-readable report.
 */
export function formatDailyForecastReport(
  location: GeoResult,
  forecast: DailyForecastResponse
): string {
  const { daily, daily_units } = forecast;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const lines = [`7-Day Forecast for ${locationName}`, ""];

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const condition = WMO_CODES[daily.weather_code[i]] ?? "Unknown";
    const high = daily.temperature_2m_max[i];
    const low = daily.temperature_2m_min[i];
    const precipChance = daily.precipitation_probability_max[i];
    const precipAmount = daily.precipitation_sum[i];
    const wind = daily.wind_speed_10m_max[i];

    lines.push(`${date}:`);
    lines.push(`  ${condition}`);
    lines.push(`  High: ${high}${daily_units.temperature_2m_max} / Low: ${low}${daily_units.temperature_2m_min}`);
    lines.push(`  Precip: ${precipChance}% chance, ${precipAmount}${daily_units.precipitation_sum}`);
    lines.push(`  Wind: up to ${wind} ${daily_units.wind_speed_10m_max}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format hourly forecast into a human-readable report.
 */
export function formatHourlyForecastReport(
  location: GeoResult,
  forecast: HourlyForecastResponse
): string {
  const { hourly, hourly_units } = forecast;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  const lines = [`Hourly Forecast for ${locationName}`, ""];

  for (let i = 0; i < hourly.time.length; i++) {
    const time = new Date(hourly.time[i]).toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      hour12: true,
    });
    const condition = WMO_CODES[hourly.weather_code[i]] ?? "Unknown";
    const temp = hourly.temperature_2m[i];
    const humidity = hourly.relative_humidity_2m[i];
    const precipProb = hourly.precipitation_probability[i];
    const wind = hourly.wind_speed_10m[i];

    lines.push(
      `${time}: ${temp}${hourly_units.temperature_2m}, ${condition}, ` +
      `${precipProb}% precip, ${humidity}% humidity, ${wind} ${hourly_units.wind_speed_10m} wind`
    );
  }

  return lines.join("\n");
}
