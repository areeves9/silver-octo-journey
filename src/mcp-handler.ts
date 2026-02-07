/**
 * mcp-handler.ts — Unified MCP request handler.
 *
 * Consolidates the repeated transport creation and request handling logic
 * that was duplicated across POST, GET, and DELETE /mcp endpoints.
 */

import type { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonRpcError, JsonRpcErrorCode } from "./jsonrpc.js";

/**
 * Handle an MCP protocol request.
 *
 * Creates a StreamableHTTPServerTransport, connects it to the server,
 * and processes the request. Handles cleanup on connection close.
 *
 * @param req - Express request
 * @param res - Express response
 * @param server - MCP server instance
 */
export async function handleMcpRequest(
  req: Request,
  res: Response,
  server: McpServer
): Promise<void> {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[mcp] Error handling request:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json(jsonRpcError(JsonRpcErrorCode.INTERNAL_ERROR, "Internal server error"));
    }
  }
}
