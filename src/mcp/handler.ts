/**
 * mcp/handler.ts — Unified MCP request handler with session management.
 *
 * Each MCP session gets its own server + transport pair.
 * Sessions are identified by the Mcp-Session-Id header.
 */

import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonRpcError, JsonRpcErrorCode, logger } from "../shared/index.js";
import { registerAllTools } from "../tools/index.js";
import { config } from "../config/index.js";

const log = logger.child({ module: "mcp" });

// ─── Session Store ──────────────────────────────────────────────────────────

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  lastAccessedAt: number;
}

const sessions = new Map<string, Session>();

function cleanupStaleSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (now - session.lastAccessedAt > config.session.ttlMs) {
      log.debug({ sessionId }, "Cleaning up stale session");
      session.transport.close();
      sessions.delete(sessionId);
    }
  }
}

// Run cleanup every 5 minutes
const cleanupInterval = setInterval(cleanupStaleSessions, 5 * 60 * 1000);

/**
 * Close all active sessions and stop the cleanup interval.
 * Called during graceful shutdown.
 */
export function closeAllSessions(): void {
  clearInterval(cleanupInterval);
  for (const [sessionId, session] of sessions) {
    session.transport.close();
    sessions.delete(sessionId);
    log.debug({ sessionId }, "Closed session during shutdown");
  }
}

// ─── Session Management ─────────────────────────────────────────────────────

function createSession(sessionId: string): Session {
  const server = new McpServer({
    name: "weather-server",
    version: "1.0.0",
  });

  // Register tools on this server instance
  registerAllTools(server);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
  });

  const session: Session = {
    server,
    transport,
    lastAccessedAt: Date.now(),
  };

  sessions.set(sessionId, session);
  log.debug({ sessionId }, "Created new MCP session");

  return session;
}

type SessionResult =
  | { ok: true; session: Session; isNew: boolean }
  | { ok: false; status: number; body: ReturnType<typeof jsonRpcError> };

function getOrCreateSession(sessionId: string | undefined): SessionResult {

  // Existing session — refresh TTL and reuse
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.lastAccessedAt = Date.now();
    return { ok: true, session, isNew: false };
  }

  // Client sent a session ID we don't recognize — don't silently replace it
  if (sessionId) {
    return {
      ok: false,
      status: 404,
      body: jsonRpcError(JsonRpcErrorCode.INTERNAL_ERROR, "Session not found or expired"),
    };
  }

  return { ok: true, session: createSession(randomUUID()), isNew: true };
}

function deleteSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (session) {
    session.transport.close();
    sessions.delete(sessionId);
    log.debug({ sessionId }, "Deleted MCP session");
    return true;
  }
  return false;
}

// ─── Request Handler ────────────────────────────────────────────────────────

/**
 * Handle an MCP protocol request.
 *
 * - POST without session: Creates new session, connects, handles request
 * - POST/GET with session: Reuses existing session
 * - DELETE: Closes and removes session
 */
export async function handleMcpRequest(
  req: Request,
  res: Response
): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    // Handle DELETE - close session
    if (req.method === "DELETE") {
      if (sessionId && deleteSession(sessionId)) {
        res.status(204).end();
      } else {
        res.status(404).json(
          jsonRpcError(JsonRpcErrorCode.INTERNAL_ERROR, "Session not found")
        );
      }
      return;
    }

    // Get or create session
    const result = getOrCreateSession(sessionId);

    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }

    const { session, isNew } = result;

    // Connect server to transport if this is a new session
    if (isNew) {
      await session.server.connect(session.transport);
    }

    // Handle the request
    await session.transport.handleRequest(req, res, req.body);
  } catch (error) {
    log.error({ err: error, sessionId }, "Error handling MCP request");
    if (!res.headersSent) {
      res.status(500).json(
        jsonRpcError(JsonRpcErrorCode.INTERNAL_ERROR, "Internal server error")
      );
    }
  }
}
