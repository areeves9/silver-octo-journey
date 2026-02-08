/**
 * tools/soil/api.ts — Open-Meteo Soil API functions.
 */

import type { GeoResult } from "../shared/geocoding.js";
import type { SoilResponse } from "./types.js";
import { getMoistureLevel, getPlantingRecommendation, SOIL_DEPTHS, TEMP_DEPTHS } from "./constants.js";
import { cachedFetchJson } from "../shared/fetch.js";

/**
 * Fetch current soil conditions for coordinates.
 */
export async function fetchSoilConditions(
  latitude: number,
  longitude: number
): Promise<SoilResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: [
      "soil_temperature_0cm",
      "soil_temperature_6cm",
      "soil_temperature_18cm",
      "soil_temperature_54cm",
      "soil_moisture_0_to_1cm",
      "soil_moisture_1_to_3cm",
      "soil_moisture_3_to_9cm",
      "soil_moisture_9_to_27cm",
      "soil_moisture_27_to_81cm",
    ].join(","),
    temperature_unit: "fahrenheit",
    timezone: "auto",
    forecast_hours: "1", // Only current hour
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  return cachedFetchJson<SoilResponse>(url);
}

/**
 * Format soil conditions into a human-readable report.
 */
export function formatSoilReport(
  location: GeoResult,
  data: SoilResponse
): string {
  const { hourly, hourly_units } = data;
  const locationName = location.admin1
    ? `${location.name}, ${location.admin1}, ${location.country}`
    : `${location.name}, ${location.country}`;

  // Get current values (first index)
  const temps = [
    hourly.soil_temperature_0cm[0],
    hourly.soil_temperature_6cm[0],
    hourly.soil_temperature_18cm[0],
    hourly.soil_temperature_54cm[0],
  ];

  const moistures = [
    hourly.soil_moisture_0_to_1cm[0],
    hourly.soil_moisture_1_to_3cm[0],
    hourly.soil_moisture_3_to_9cm[0],
    hourly.soil_moisture_9_to_27cm[0],
    hourly.soil_moisture_27_to_81cm[0],
  ];

  // Root zone temp (18cm) for planting recommendation
  const rootZoneTemp = temps[2];
  const plantingRec = getPlantingRecommendation(rootZoneTemp);

  const lines = [
    `Soil Conditions for ${locationName}`,
    "",
    "=== Soil Temperature ===",
  ];

  for (let i = 0; i < temps.length; i++) {
    lines.push(`${TEMP_DEPTHS[i].depth}: ${temps[i]}${hourly_units.soil_temperature_0cm} (${TEMP_DEPTHS[i].description})`);
  }

  lines.push("");
  lines.push(`Planting: ${plantingRec}`);
  lines.push("");
  lines.push("=== Soil Moisture ===");

  for (let i = 0; i < moistures.length; i++) {
    const level = getMoistureLevel(moistures[i]);
    lines.push(`${SOIL_DEPTHS[i].depth}: ${(moistures[i] * 100).toFixed(1)}% (${level.label})`);
    lines.push(`  ${SOIL_DEPTHS[i].description}`);
    lines.push(`  ${level.description}`);
  }

  // Calculate average root zone moisture (3-27cm)
  const rootZoneMoisture = (moistures[2] + moistures[3]) / 2;
  const avgLevel = getMoistureLevel(rootZoneMoisture);
  lines.push("");
  lines.push(`Root Zone Average (3-27cm): ${(rootZoneMoisture * 100).toFixed(1)}% - ${avgLevel.label}`);

  return lines.join("\n");
}
