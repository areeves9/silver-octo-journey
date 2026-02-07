/**
 * config.ts — Centralized configuration via environment variables.
 *
 * Validates env vars at import time using Zod. If required vars are missing,
 * the process crashes immediately with a clear error — fail fast, not at
 * runtime when a request happens to need the value.
 *
 * Usage:
 *   import { config } from "./config.js";
 *   console.log(config.port);            // 3000
 *   console.log(config.auth0.domain);    // "your-tenant.auth0.com"
 */

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  AUTH0_DOMAIN: z.string().min(1, "AUTH0_DOMAIN is required"),
  AUTH0_AUDIENCE: z.string().min(1, "AUTH0_AUDIENCE is required"),
  SERVER_URL: z.string().min(1, "SERVER_URL is required"),
  /** Override issuer URL; defaults to https://{AUTH0_DOMAIN}/ */
  AUTH0_ISSUER_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export const config = {
  port: env.PORT,
  serverUrl: env.SERVER_URL,
  auth0: {
    domain: env.AUTH0_DOMAIN,
    audience: env.AUTH0_AUDIENCE,
    /** Auth0 issuer always includes trailing slash */
    issuerUrl: env.AUTH0_ISSUER_URL ?? `https://${env.AUTH0_DOMAIN}/`,
    jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  },
} as const;
