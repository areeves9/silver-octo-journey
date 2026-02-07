/**
 * tools/weather/api.ts — Open-Meteo API helpers.
 *
 * Contains types and functions for geocoding and weather data fetching.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // state/province
}

interface GeoResponse {
  results?: GeoResult[];
}

export interface CurrentWeather {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  weather_code: number;
}

export interface WeatherResponse {
  current: CurrentWeather;
  current_units: Record<string, string>;
}

// ─── WMO Weather Code Descriptions ───────────────────────────────────────────

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Geocode a city name to coordinates.
 */
export async function geocodeCity(city: string): Promise<GeoResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding API returned ${response.status}`);
  }

  const data = (await response.json()) as GeoResponse;

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
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API returned ${response.status}`);
  }

  return (await response.json()) as WeatherResponse;
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
