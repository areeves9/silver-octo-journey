/**
 * tools/shared/fetch.ts — Shared fetch wrappers with timeout and caching.
 *
 * All external API calls in tools should use these wrappers
 * to ensure consistent timeout behaviour and response caching.
 */

import { getCache, type CacheSetOptions } from "./cache/index.js";

/** Default request timeout in milliseconds (10 seconds). */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Fetch with a default 10-second timeout.
 *
 * Mirrors the global `fetch` signature but applies an
 * `AbortSignal.timeout` so requests cannot hang indefinitely.
 */
export function fetchWithTimeout(
  url: string | URL | Request,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...init, signal });
}

/** Options for `cachedFetchJson`. */
export interface CachedFetchOptions {
  /** Timeout in milliseconds for the HTTP request (default: 10 000). */
  timeoutMs?: number;
  /** Cache TTL in milliseconds (default: cache's default, 5 min). */
  ttlMs?: number;
}

/**
 * In-flight request map keyed by URL.
 *
 * Prevents duplicate network calls when multiple callers request the
 * same URL before the first response has been cached ("cache stampede").
 */
const inflight = new Map<string, Promise<unknown>>();

/**
 * Fetch JSON with caching, deduplication, and timeout.
 *
 * - Cache key is the full URL string.
 * - On cache hit the network call is skipped entirely.
 * - On cache miss, concurrent callers for the same URL share a single
 *   in-flight fetch rather than issuing duplicate requests.
 * - Only successful (response.ok) responses are cached.
 *
 * Use this for GET requests to external APIs (weather, geocoding, etc.)
 * where repeated identical requests within a short window return the
 * same data.
 */
export async function cachedFetchJson<T = unknown>(
  url: string,
  options?: CachedFetchOptions,
): Promise<T> {
  const cache = getCache();

  // Check cache first
  const cached = await cache.get<T>(url);
  if (cached !== undefined) {
    return cached;
  }

  // If an identical request is already in-flight, wait for it
  const pending = inflight.get(url);
  if (pending) {
    return pending as Promise<T>;
  }

  // Cache miss — fetch from network
  const request = (async (): Promise<T> => {
    const response = await fetchWithTimeout(url, undefined, options?.timeoutMs);

    if (!response.ok) {
      const host = new URL(url).host;
      throw new Error(`${host} returned ${response.status}`);
    }

    const data = (await response.json()) as T;

    // Cache the parsed result
    const setOptions: CacheSetOptions | undefined = options?.ttlMs
      ? { ttlMs: options.ttlMs }
      : undefined;
    await cache.set(url, data, setOptions);

    return data;
  })();

  inflight.set(url, request);

  try {
    return await request;
  } finally {
    inflight.delete(url);
  }
}
