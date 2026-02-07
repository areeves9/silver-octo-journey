/**
 * config/index.ts — Centralized configuration singleton.
 *
 * Validates env vars at import time using Zod. If required vars are missing,
 * the process crashes immediately with a clear error — fail fast.
 *
 * This module follows the singleton pattern:
 * - Imported once, validated once
 * - All other modules import from here
 * - Derived values computed from env vars
 *
 * Usage:
 *   import { config } from "./config/index.js";
 *   console.log(config.port);
 *   console.log(config.auth0.domain);
 */

import { z } from "zod";

// ─── Environment Schema ──────────────────────────────────────────────────────

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  SERVER_URL: z.string().min(1, "SERVER_URL is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Auth0
  AUTH0_DOMAIN: z.string().min(1, "AUTH0_DOMAIN is required"),
  AUTH0_AUDIENCE: z.string().min(1, "AUTH0_AUDIENCE is required"),
  AUTH0_ISSUER_URL: z.string().optional(),
});

// ─── Validation ──────────────────────────────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

// ─── Derived Values ──────────────────────────────────────────────────────────

const isDevelopment = env.NODE_ENV === "development";
const isProduction = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";

// ─── Config Singleton ────────────────────────────────────────────────────────

export const config = {
  // Server
  port: env.PORT,
  serverUrl: env.SERVER_URL,
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,

  // Environment flags (derived)
  isDevelopment,
  isProduction,
  isTest,

  // Auth0
  auth0: {
    domain: env.AUTH0_DOMAIN,
    audience: env.AUTH0_AUDIENCE,
    /** Auth0 issuer always includes trailing slash */
    issuerUrl: env.AUTH0_ISSUER_URL ?? `https://${env.AUTH0_DOMAIN}/`,
    /** Derived: JWKS endpoint for token verification */
    jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  },
} as const;

export type Config = typeof config;
