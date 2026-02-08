import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// ─── Mock jose before importing middleware ────────────────────────────────────

const mockJwtVerify = vi.fn();

vi.mock("jose", () => ({
  createRemoteJWKSet: () => "mocked-jwks",
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

// Now import the middleware (it will use the mocked jose)
const { jwtAuth } = await import("../middleware.js");

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    path: "/mcp",
    headers: {},
    ...overrides,
  } as Request;
}

function mockResponse(): Response & {
  _status: number;
  _json: unknown;
} {
  const res = {
    _status: 0,
    _json: null,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._json = body;
      return res;
    },
  };
  return res as unknown as Response & { _status: number; _json: unknown };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("jwtAuth middleware", () => {
  const middleware = jwtAuth();
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  // ─── Public Path Tests ────────────────────────────────────────────────

  describe("public paths", () => {
    const publicPaths = [
      "/health",
      "/.well-known/openid-configuration",
      "/.well-known/oauth-authorization-server",
      "/.well-known/oauth-protected-resource",
      "/authorize",
      "/token",
      "/register",
      "/logout",
    ];

    it.each(publicPaths)("skips auth for %s", async (path) => {
      const req = mockRequest({ path });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });
  });

  // ─── Missing/Malformed Authorization Header ───────────────────────────

  describe("missing or invalid Authorization header", () => {
    it("returns 401 when no Authorization header is present", async () => {
      const req = mockRequest({ headers: {} });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
      expect(res._json).toEqual({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Missing or invalid Authorization header",
        },
        id: null,
      });
    });

    it("returns 401 for Basic auth instead of Bearer", async () => {
      const req = mockRequest({
        headers: { authorization: "Basic dXNlcjpwYXNz" },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
    });

    it("returns 401 for empty Authorization header", async () => {
      const req = mockRequest({
        headers: { authorization: "" },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
    });

    it("returns 401 for Bearer with no token", async () => {
      const req = mockRequest({
        headers: { authorization: "Bearer " },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      // "Bearer " → token is empty string, jwtVerify will throw
      expect(mockJwtVerify).toHaveBeenCalled();
    });
  });

  // ─── Invalid/Expired Token ────────────────────────────────────────────

  describe("invalid token", () => {
    it("returns 401 when jwtVerify throws", async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error("token expired"));

      const req = mockRequest({
        headers: { authorization: "Bearer expired-token" },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
      expect(res._json).toEqual({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Invalid or expired token",
        },
        id: null,
      });
    });
  });

  // ─── Valid Token ──────────────────────────────────────────────────────

  describe("valid token", () => {
    it("sets req.auth with AuthInfo and calls next", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: {
          azp: "client-123",
          sub: "user-456",
          scope: "openid profile email",
          exp: 1700000000,
        },
      });

      const req = mockRequest({
        headers: { authorization: "Bearer valid-token" },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toEqual({
        token: "valid-token",
        clientId: "client-123",
        scopes: ["openid", "profile", "email"],
        expiresAt: 1700000000,
      });
    });

    it("uses sub as clientId when azp is missing", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: {
          sub: "user-456",
          scope: "openid",
          exp: 1700000000,
        },
      });

      const req = mockRequest({
        headers: { authorization: "Bearer valid-token" },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth!.clientId).toBe("user-456");
    });

    it("defaults clientId to 'unknown' when both azp and sub missing", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: {
          scope: "openid",
          exp: 1700000000,
        },
      });

      const req = mockRequest({
        headers: { authorization: "Bearer valid-token" },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth!.clientId).toBe("unknown");
    });

    it("sets empty scopes when scope claim is missing", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: {
          azp: "client-123",
          exp: 1700000000,
        },
      });

      const req = mockRequest({
        headers: { authorization: "Bearer valid-token" },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth!.scopes).toEqual([]);
    });

    it("passes correct options to jwtVerify", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { azp: "c", scope: "", exp: 0 },
      });

      const req = mockRequest({
        headers: { authorization: "Bearer my-token" },
      });
      const res = mockResponse();

      await middleware(req, res, next);

      expect(mockJwtVerify).toHaveBeenCalledWith("my-token", "mocked-jwks", {
        issuer: "https://test-tenant.auth0.com/",
        audience: "https://test-api.example.com",
        algorithms: ["RS256"],
      });
    });
  });

  // ─── Protected Paths ──────────────────────────────────────────────────

  describe("protected paths", () => {
    const protectedPaths = ["/mcp", "/api/data", "/some-other-route"];

    it.each(protectedPaths)(
      "requires auth for %s",
      async (path) => {
        const req = mockRequest({ path, headers: {} });
        const res = mockResponse();

        await middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(401);
      }
    );
  });
});
