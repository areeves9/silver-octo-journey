/**
 * tools/shared/fetch.ts — Shared fetch wrapper with timeout.
 *
 * All external API calls in tools should use this wrapper
 * to ensure consistent timeout behaviour.
 */

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
