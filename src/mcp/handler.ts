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

const log = logger.child({ module: "mcp" });

// ─── Session Store ──────────────────────────────────────────────────────────

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  createdAt: number;
}

const sessions = new Map<string, Session>();

// Clean up stale sessions (older than 30 minutes)
const SESSION_TTL_MS = 30 * 60 * 1000;

function cleanupStaleSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      log.debug({ sessionId }, "Cleaning up stale session");
      session.transport.close();
      sessions.delete(sessionId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupStaleSessions, 5 * 60 * 1000);

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
    createdAt: Date.now(),
  };

  sessions.set(sessionId, session);
  log.debug({ sessionId }, "Created new MCP session");

  return session;
}

function getOrCreateSession(sessionId: string | undefined): {
  session: Session;
  isNew: boolean;
} {
  if (sessionId && sessions.has(sessionId)) {
    return { session: sessions.get(sessionId)!, isNew: false };
  }

  const newSessionId = sessionId || randomUUID();
  return { session: createSession(newSessionId), isNew: true };
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
    const { session, isNew } = getOrCreateSession(sessionId);

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
