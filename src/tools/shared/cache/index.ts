/**
 * tools/shared/cache/index.ts — In-memory cache singleton.
 *
 * Singleton instance accessed via `getCache()`. To migrate to Redis
 * later, swap the implementation returned by `getCache()` — all
 * consumers depend only on the `Cache` interface.
 */

import type { Cache, CacheEntry, CacheSetOptions } from "./types.js";

// Re-export types for convenience
export type { Cache, CacheEntry, CacheSetOptions } from "./types.js";

/** Default TTL: 5 minutes. Weather data is reasonably fresh at this interval. */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

// ─── Per-volatility TTL tiers ────────────────────────────────────────────────
//
// Data‑volatility strategy:
//   REALTIME  — current observations that update every 10–15 min at the source.
//   FORECAST  — daily/hourly forecasts that update 1–2× per day.
//   STATIC    — reference data (geocoding) that effectively never changes.

/** 5 min — current weather, wind, precip, humidity, marine, soil, air quality, fire weather. */
export const TTL_REALTIME = 5 * 60 * 1_000;

/** 15 min — daily & hourly forecasts, agriculture (7-day). */
export const TTL_FORECAST = 15 * 60 * 1_000;

/** 24 hrs — geocoding lookups (city → lat/lon). */
export const TTL_STATIC = 24 * 60 * 60 * 1_000;

/** How often the passive sweep runs to prune expired entries (60 s). */
const SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * In-memory cache backed by a `Map`.
 *
 * - Lazy expiry on reads (expired entries are pruned on `get` / `has`)
 * - Periodic passive sweep removes stale entries in the background
 * - All methods are async to match the `Cache` interface contract
 */
class InMemoryCache implements Cache {
  private store = new Map<string, CacheEntry>();
  private defaultTtlMs: number;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTtlMs: number = DEFAULT_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
    this.startSweep();
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const ttl = options?.ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  async size(): Promise<number> {
    this.evictExpired();
    return this.store.size;
  }

  /** Remove all expired entries in one pass. */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /** Start the background sweep timer. */
  private startSweep(): void {
    this.sweepTimer = setInterval(() => this.evictExpired(), SWEEP_INTERVAL_MS);
    // Allow the process to exit even if the timer is running
    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  /** Stop the background sweep (useful for tests / shutdown). */
  dispose(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let instance: InMemoryCache | null = null;

/**
 * Get the cache singleton.
 *
 * To migrate to Redis: replace the body of this function to return
 * a `RedisCache` instance that implements the same `Cache` interface.
 */
export function getCache(): Cache {
  if (!instance) {
    instance = new InMemoryCache();
  }
  return instance;
}

/**
 * Reset the singleton (for tests).
 */
export function resetCache(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
