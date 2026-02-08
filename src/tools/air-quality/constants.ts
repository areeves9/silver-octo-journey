/**
 * tools/air-quality/constants.ts — Constants for air quality tool.
 */

import type { AQILevel } from "./types.js";

/**
 * US AQI levels and descriptions.
 */
export const US_AQI_LEVELS: AQILevel[] = [
  { min: 0, max: 50, label: "Good", description: "Air quality is satisfactory", color: "Green" },
  { min: 51, max: 100, label: "Moderate", description: "Acceptable; some pollutants may be a concern for sensitive individuals", color: "Yellow" },
  { min: 101, max: 150, label: "Unhealthy for Sensitive Groups", description: "Sensitive groups may experience health effects", color: "Orange" },
  { min: 151, max: 200, label: "Unhealthy", description: "Everyone may begin to experience health effects", color: "Red" },
  { min: 201, max: 300, label: "Very Unhealthy", description: "Health alert: everyone may experience serious health effects", color: "Purple" },
  { min: 301, max: 500, label: "Hazardous", description: "Health emergency: entire population likely to be affected", color: "Maroon" },
];

/**
 * European AQI levels.
 */
export const EU_AQI_LEVELS: AQILevel[] = [
  { min: 0, max: 20, label: "Good", description: "Air quality is good", color: "Green" },
  { min: 21, max: 40, label: "Fair", description: "Air quality is fair", color: "Yellow" },
  { min: 41, max: 60, label: "Moderate", description: "Air quality is moderate", color: "Orange" },
  { min: 61, max: 80, label: "Poor", description: "Air quality is poor", color: "Red" },
  { min: 81, max: 100, label: "Very Poor", description: "Air quality is very poor", color: "Purple" },
  { min: 101, max: 500, label: "Extremely Poor", description: "Air quality is extremely poor", color: "Maroon" },
];

/**
 * UV Index levels and protection recommendations.
 */
export const UV_INDEX_LEVELS = [
  { min: 0, max: 2, label: "Low", protection: "No protection needed" },
  { min: 3, max: 5, label: "Moderate", protection: "Wear sunscreen, hat, and sunglasses" },
  { min: 6, max: 7, label: "High", protection: "Reduce sun exposure between 10am-4pm" },
  { min: 8, max: 10, label: "Very High", protection: "Take extra precautions; unprotected skin will burn" },
  { min: 11, max: 20, label: "Extreme", protection: "Avoid sun exposure; stay indoors if possible" },
];

/**
 * Pollen level descriptions.
 */
export const POLLEN_LEVELS = [
  { min: 0, max: 10, label: "None" },
  { min: 11, max: 50, label: "Low" },
  { min: 51, max: 100, label: "Moderate" },
  { min: 101, max: 200, label: "High" },
  { min: 201, max: 1000, label: "Very High" },
];

/**
 * Get AQI level info based on US AQI value.
 */
export function getUSAQILevel(aqi: number): AQILevel {
  return US_AQI_LEVELS.find((level) => aqi >= level.min && aqi <= level.max) ?? US_AQI_LEVELS[5];
}

/**
 * Get UV index level info.
 */
export function getUVIndexLevel(uv: number): { label: string; protection: string } {
  return UV_INDEX_LEVELS.find((level) => uv >= level.min && uv <= level.max) ?? UV_INDEX_LEVELS[4];
}

/**
 * Get pollen level label.
 */
export function getPollenLevel(value: number): string {
  return POLLEN_LEVELS.find((level) => value >= level.min && value <= level.max)?.label ?? "Unknown";
}
