# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build      # Compile TypeScript to ./build/
npm run dev        # Run with tsx (hot reload)
npm run inspect    # Run with MCP Inspector for debugging
```

## Architecture

This is an **MCP (Model Context Protocol) server** designed as a spoke for federated hub architectures. It exposes weather data via the MCP protocol with Auth0 OAuth authentication.

### Key Patterns

- **Factory Pattern**: `createApp()`, `createMcpServer()`, `createOAuthRouter()` enable testing and submounting
- **Singleton Pattern**: `config` and `logger` are imported by all modules
- **Feature-based Tools**: Each tool is a self-contained module under `src/tools/`

### Module Structure

| Module | Purpose |
|--------|---------|
| `index.ts` | Bootstrap entry point only |
| `app.ts` | Express app factory (submountable into larger apps) |
| `manifest.ts` | Spoke metadata and tags for hub discovery |
| `config/` | Zod-validated environment config singleton |
| `auth/` | JWT middleware using jose + JWKS |
| `mcp/` | MCP server factory and StreamableHTTPServerTransport handler |
| `oauth/` | Auth0 proxy router (discovery, authorize, token, register) |
| `tools/` | Tool registry; each tool in its own subdirectory |
| `shared/` | Utilities: `jsonrpc.ts` (error responses), `logger.ts` (structured logging) |

### Adding a New Tool

1. Create `src/tools/<name>/api.ts` for external API helpers
2. Create `src/tools/<name>/index.ts` with `register<Name>Tool(server: McpServer)` function
3. Import and call the registration function in `src/tools/index.ts`
4. Add to `toolManifest` array in `src/tools/index.ts`

### Environment Variables

Required:
- `AUTH0_DOMAIN` — Auth0 tenant (e.g., `tenant.auth0.com`)
- `AUTH0_AUDIENCE` — API identifier
- `SERVER_URL` — Public URL of this server

Optional:
- `PORT` — Server port (default: 3000)
- `NODE_ENV` — `development` | `production` | `test`
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error`
