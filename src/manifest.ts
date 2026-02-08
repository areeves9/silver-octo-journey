/**
 * manifest.ts — Spoke manifest for hub discovery.
 *
 * Defines metadata, tags, and capabilities for this MCP server.
 * Used by hubs to discover and categorize spokes.
 */

import { toolManifest } from "./tools/index.js";

/**
 * Spoke manifest interface.
 * Extend this as needed for hub registration protocols.
 */
export interface SpokeManifest {
  /** Unique identifier for this spoke */
  id: string;
  /** Human-readable name */
  name: string;
  /** Semantic version */
  version: string;
  /** Brief description */
  description: string;
  /** Categorization tags */
  tags: string[];
  /** Available tools */
  tools: ReadonlyArray<{ name: string; description: string }>;
  /** Authentication requirements */
  auth: {
    required: boolean;
    type: "bearer" | "none";
    provider?: string;
  };
  /** Health check endpoint */
  healthEndpoint: string;
  /** MCP protocol endpoint */
  mcpEndpoint: string;
}

/**
 * This spoke's manifest.
 * Export for hub registration or introspection.
 */
export const spokeManifest: SpokeManifest = {
  id: "weather-mcp-server",
  name: "Weather MCP Server",
  version: "1.0.0",
  description:
    "MCP server providing weather data via Open-Meteo API. Designed as a spoke for federated MCP hubs.",
  tags: [
    "weather",
    "geocoding",
    "open-meteo",
    "utility",
    "external-api",
  ],
  tools: toolManifest,
  auth: {
    required: true,
    type: "bearer",
    provider: "auth0",
  },
  healthEndpoint: "/health",
  mcpEndpoint: "/mcp",
};

/**
 * Get manifest as JSON for API responses.
 */
export function getManifestJson(): SpokeManifest {
  return spokeManifest;
}
