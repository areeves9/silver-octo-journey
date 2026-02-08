/**
 * tools/shared/cache/types.ts — Cache interface and types.
 *
 * Defines the contract that any cache implementation (in-memory, Redis, etc.)
 * must fulfil. Tool code depends only on this interface, so swapping the
 * backing store is a single-file change in the factory / index.
 */

/** A single cached entry with its value and expiry metadata. */
export interface CacheEntry<T = unknown> {
  value: T;
  /** Absolute timestamp (ms since epoch) when this entry expires. */
  expiresAt: number;
}

/** Options for a cache `set` call. */
export interface CacheSetOptions {
  /** Time-to-live in milliseconds. Overrides the default TTL. */
  ttlMs?: number;
}

/**
 * Minimal cache contract.
 *
 * Implementations must be async-ready so that swapping to a
 * network-backed store (Redis) is seamless.
 */
export interface Cache {
  /** Retrieve a value, or `undefined` if missing / expired. */
  get<T = unknown>(key: string): Promise<T | undefined>;

  /** Store a value with an optional per-key TTL override. */
  set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /** Remove a single key. */
  delete(key: string): Promise<boolean>;

  /** Remove all entries. */
  clear(): Promise<void>;

  /** Check if a non-expired entry exists. */
  has(key: string): Promise<boolean>;

  /** Number of live (non-expired) entries. */
  size(): Promise<number>;
}
