/**
 * tools/severe-weather/constants.ts — Alert thresholds.
 *
 * Thresholds modelled after US National Weather Service criteria
 * for watches, warnings, and advisories.
 */

// ─── Heat ────────────────────────────────────────────────────────────────────

/** Feels-like temperature (°F) that triggers a heat advisory. */
export const HEAT_ADVISORY = 100;

/** Feels-like temperature (°F) that triggers a heat warning. */
export const HEAT_WARNING = 110;

// ─── Cold / Freeze ───────────────────────────────────────────────────────────

/** Minimum temperature (°F) that triggers a freeze advisory. */
export const FREEZE_ADVISORY = 32;

/** Wind chill / feels-like (°F) that triggers a cold warning. */
export const COLD_WARNING = 0;

// ─── Wind ────────────────────────────────────────────────────────────────────

/** Sustained wind speed (mph) that triggers a wind advisory. */
export const WIND_ADVISORY_SUSTAINED = 30;

/** Gust speed (mph) that triggers a wind advisory. */
export const WIND_ADVISORY_GUSTS = 45;

/** Sustained wind speed (mph) that triggers a high wind warning. */
export const WIND_WARNING_SUSTAINED = 40;

/** Gust speed (mph) that triggers a high wind warning. */
export const WIND_WARNING_GUSTS = 58;

// ─── Precipitation ───────────────────────────────────────────────────────────

/** Daily rain total (inches) that triggers a rain advisory. */
export const RAIN_ADVISORY = 1;

/** Daily rain total (inches) that triggers a flood warning. */
export const RAIN_WARNING = 2;

/** Daily snowfall (inches) that triggers a snow advisory. */
export const SNOW_ADVISORY = 4;

/** Daily snowfall (inches) that triggers a winter storm warning. */
export const SNOW_WARNING = 8;

// ─── Thunderstorm ────────────────────────────────────────────────────────────

/** WMO weather codes indicating thunderstorm activity. */
export const THUNDERSTORM_CODES = [95, 96, 99];

// ─── Air Quality ─────────────────────────────────────────────────────────────

/** US AQI that triggers an air quality advisory (sensitive groups). */
export const AQI_ADVISORY = 101;

/** US AQI that triggers an air quality warning (unhealthy). */
export const AQI_WARNING = 151;

// ─── UV ──────────────────────────────────────────────────────────────────────

/** UV index that triggers a UV advisory (very high). */
export const UV_ADVISORY = 8;

/** UV index that triggers a UV warning (extreme). */
export const UV_WARNING = 11;

// ─── Severity ordering ──────────────────────────────────────────────────────

import type { SeverityLevel } from "./types.js";

/** Numeric rank for sorting alerts highest-severity-first. */
export const SEVERITY_RANK: Record<SeverityLevel, number> = {
  Warning: 0,
  Watch: 1,
  Advisory: 2,
};
