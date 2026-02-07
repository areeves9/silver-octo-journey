/**
 * auth/types.ts — Type definitions for auth module.
 */

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * Express Request augmentation to include auth info.
 */
declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthInfo;
  }
}

export type { AuthInfo };
