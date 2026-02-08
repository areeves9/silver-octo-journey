/**
 * tools/shared/sea-state.ts — Shared Douglas Sea State scale.
 *
 * Provides sea state classification from wave height.
 * Used by marine and marine-conditions tools.
 * https://en.wikipedia.org/wiki/Douglas_sea_scale
 */

export interface SeaState {
  code: number;
  description: string;
  waveHeight: string;
}

/**
 * Douglas Sea State scale.
 */
export const SEA_STATE_CODES: SeaState[] = [
  { code: 0, description: "Calm (glassy)", waveHeight: "0 m" },
  { code: 1, description: "Calm (rippled)", waveHeight: "0-0.1 m" },
  { code: 2, description: "Smooth", waveHeight: "0.1-0.5 m" },
  { code: 3, description: "Slight", waveHeight: "0.5-1.25 m" },
  { code: 4, description: "Moderate", waveHeight: "1.25-2.5 m" },
  { code: 5, description: "Rough", waveHeight: "2.5-4 m" },
  { code: 6, description: "Very rough", waveHeight: "4-6 m" },
  { code: 7, description: "High", waveHeight: "6-9 m" },
  { code: 8, description: "Very high", waveHeight: "9-14 m" },
  { code: 9, description: "Phenomenal", waveHeight: ">14 m" },
];

/**
 * Get sea state from wave height in meters.
 */
export function getSeaState(waveHeightMeters: number): SeaState {
  if (waveHeightMeters <= 0) return SEA_STATE_CODES[0];
  if (waveHeightMeters <= 0.1) return SEA_STATE_CODES[1];
  if (waveHeightMeters <= 0.5) return SEA_STATE_CODES[2];
  if (waveHeightMeters <= 1.25) return SEA_STATE_CODES[3];
  if (waveHeightMeters <= 2.5) return SEA_STATE_CODES[4];
  if (waveHeightMeters <= 4) return SEA_STATE_CODES[5];
  if (waveHeightMeters <= 6) return SEA_STATE_CODES[6];
  if (waveHeightMeters <= 9) return SEA_STATE_CODES[7];
  if (waveHeightMeters <= 14) return SEA_STATE_CODES[8];
  return SEA_STATE_CODES[9];
}
