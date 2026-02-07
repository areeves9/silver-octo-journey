# Auth0 Setup for Weather MCP Server

## 1. Create Regular Web Application
- Applications → Applications → Create Application
- Name: Weather MCP Server
- Type: Regular Web Application
- Copy Domain, Client ID, Client Secret

## 2. Configure Callback URLs
- Settings tab
- Allowed Callback URLs: `http://localhost:3000/oauth/token`

## 3. Create API
- Applications → APIs → Create API
- Name: Weather MCP
- Identifier: `weather-mcp-api`
- Signing Algorithm: RS256

## 4. Authorize Application for API
- APIs → Weather MCP → Application Access tab
- Add Machine to Machine Application: Weather MCP Server
- Authorize

## 5. Set Environment Variables
```
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=weather-mcp-api
SERVER_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

## 6. Run Server
```bash
npm run dev
```

Test OIDC discovery:
```bash
curl http://localhost:3000/.well-known/openid-configuration
```
