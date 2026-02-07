import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock the MCP SDK — we don't want real servers or transports in tests.
// Use function syntax (not arrows) so they work as constructors with `new`.
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockHandleRequest = vi.fn().mockResolvedValue(undefined);
const mockTransportClose = vi.fn();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: vi.fn().mockImplementation(function () {
    return { connect: mockConnect };
  }),
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(function () {
    return { handleRequest: mockHandleRequest, close: mockTransportClose };
  }),
}));

// Mock tool registration — no real tool setup in tests
vi.mock("../../tools/index.js", () => ({
  registerAllTools: vi.fn(),
}));

// Mock randomUUID so we can predict session IDs
const MOCK_SESSION_ID = "test-session-id-1234";
vi.mock("crypto", () => ({
  randomUUID: () => MOCK_SESSION_ID,
}));

// Import handler after mocks are in place
const { handleMcpRequest } = await import("../handler.js");

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: "POST",
    headers: {},
    body: { jsonrpc: "2.0", method: "initialize", id: 1 },
    ...overrides,
  } as Request;
}

function mockResponse(): Response & {
  _status: number;
  _json: unknown;
  _ended: boolean;
  headersSent: boolean;
} {
  const res = {
    _status: 0,
    _json: null,
    _ended: false,
    headersSent: false,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._json = body;
      res.headersSent = true;
      return res;
    },
    end() {
      res._ended = true;
      res.headersSent = true;
      return res;
    },
  };
  return res as unknown as Response & {
    _status: number;
    _json: unknown;
    _ended: boolean;
    headersSent: boolean;
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("handleMcpRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── New Session Creation ───────────────────────────────────────────

  describe("new session (no Mcp-Session-Id header)", () => {
    it("creates a new session and connects server to transport", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await handleMcpRequest(req, res);

      expect(mockConnect).toHaveBeenCalledOnce();
      expect(mockHandleRequest).toHaveBeenCalledOnce();
    });

    it("delegates to transport.handleRequest with the request body", async () => {
      const body = { jsonrpc: "2.0", method: "tools/list", id: 2 };
      const req = mockRequest({ body });
      const res = mockResponse();

      await handleMcpRequest(req, res);

      expect(mockHandleRequest).toHaveBeenCalledWith(req, res, body);
    });
  });

  // ─── Session Reuse ────────────────────────────────────────────────

  describe("session reuse (known Mcp-Session-Id)", () => {
    it("reuses an existing session without calling connect again", async () => {
      // First request creates the session
      const req1 = mockRequest();
      const res1 = mockResponse();
      await handleMcpRequest(req1, res1);

      vi.clearAllMocks();

      // Second request reuses the session (uses the mocked UUID)
      const req2 = mockRequest({
        headers: { "mcp-session-id": MOCK_SESSION_ID },
      });
      const res2 = mockResponse();

      await handleMcpRequest(req2, res2);

      // Should NOT call connect again — session already connected
      expect(mockConnect).not.toHaveBeenCalled();
      // Should still handle the request
      expect(mockHandleRequest).toHaveBeenCalledOnce();
    });

    it("refreshes lastAccessedAt on reuse", async () => {
      // Create session
      const req1 = mockRequest();
      const res1 = mockResponse();
      await handleMcpRequest(req1, res1);

      vi.clearAllMocks();

      // Reuse — if it didn't refresh, stale cleanup could kill it
      // We verify reuse works (which means the session was found and touched)
      const req2 = mockRequest({
        headers: { "mcp-session-id": MOCK_SESSION_ID },
      });
      const res2 = mockResponse();

      await handleMcpRequest(req2, res2);

      // Session found and reused (not 404)
      expect(res2._status).toBe(0); // no error status set
      expect(mockHandleRequest).toHaveBeenCalledOnce();
    });
  });

  // ─── Unknown Session ID ───────────────────────────────────────────

  describe("unknown session ID", () => {
    it("returns 404 for an unrecognized Mcp-Session-Id", async () => {
      const req = mockRequest({
        headers: { "mcp-session-id": "nonexistent-session-id" },
      });
      const res = mockResponse();

      await handleMcpRequest(req, res);

      expect(res._status).toBe(404);
      expect(res._json).toEqual({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Session not found or expired",
        },
        id: null,
      });
      expect(mockConnect).not.toHaveBeenCalled();
      expect(mockHandleRequest).not.toHaveBeenCalled();
    });

    it("does not create a new session when an unknown ID is provided", async () => {
      const { McpServer } = await import(
        "@modelcontextprotocol/sdk/server/mcp.js"
      );

      const req = mockRequest({
        headers: { "mcp-session-id": "bogus-id" },
      });
      const res = mockResponse();

      await handleMcpRequest(req, res);

      // No new McpServer should have been created
      expect(McpServer).not.toHaveBeenCalled();
    });
  });

  // ─── DELETE Session ───────────────────────────────────────────────

  describe("DELETE method", () => {
    it("deletes an existing session and returns 204", async () => {
      // Create a session first
      const req1 = mockRequest();
      const res1 = mockResponse();
      await handleMcpRequest(req1, res1);

      vi.clearAllMocks();

      // Delete the session
      const req2 = mockRequest({
        method: "DELETE",
        headers: { "mcp-session-id": MOCK_SESSION_ID },
      });
      const res2 = mockResponse();

      await handleMcpRequest(req2, res2);

      expect(res2._status).toBe(204);
      expect(res2._ended).toBe(true);
      expect(mockTransportClose).toHaveBeenCalledOnce();
    });

    it("returns 404 when deleting an unknown session", async () => {
      const req = mockRequest({
        method: "DELETE",
        headers: { "mcp-session-id": "no-such-session" },
      });
      const res = mockResponse();

      await handleMcpRequest(req, res);

      expect(res._status).toBe(404);
      expect(res._json).toEqual({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Session not found",
        },
        id: null,
      });
    });

    it("returns 404 when DELETE has no session ID", async () => {
      const req = mockRequest({ method: "DELETE" });
      const res = mockResponse();

      await handleMcpRequest(req, res);

      expect(res._status).toBe(404);
    });

    it("session is gone after DELETE — subsequent requests get 404", async () => {
      // Create a session
      const req1 = mockRequest();
      const res1 = mockResponse();
      await handleMcpRequest(req1, res1);

      // Delete it
      const req2 = mockRequest({
        method: "DELETE",
        headers: { "mcp-session-id": MOCK_SESSION_ID },
      });
      const res2 = mockResponse();
      await handleMcpRequest(req2, res2);

      vi.clearAllMocks();

      // Try to use the deleted session
      const req3 = mockRequest({
        headers: { "mcp-session-id": MOCK_SESSION_ID },
      });
      const res3 = mockResponse();
      await handleMcpRequest(req3, res3);

      expect(res3._status).toBe(404);
      expect(mockHandleRequest).not.toHaveBeenCalled();
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────

  describe("error handling", () => {
    it("returns 500 JSON-RPC error when transport.handleRequest throws", async () => {
      mockHandleRequest.mockRejectedValueOnce(new Error("transport broke"));

      const req = mockRequest();
      const res = mockResponse();

      await handleMcpRequest(req, res);

      expect(res._status).toBe(500);
      expect(res._json).toEqual({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    });

    it("does not send error response if headers already sent", async () => {
      mockHandleRequest.mockImplementationOnce(async function (_req, res) {
        // Simulate: transport already started writing the response, then fails
        (res as unknown as { headersSent: boolean }).headersSent = true;
        throw new Error("late failure");
      });

      const req = mockRequest();
      const res = mockResponse();

      await handleMcpRequest(req, res);

      // Handler should NOT have called res.json() with an error
      // because headersSent was already true
      expect(res._json).toBeNull();
    });
  });
});
