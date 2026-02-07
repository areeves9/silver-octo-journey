import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      AUTH0_DOMAIN: "test-tenant.auth0.com",
      AUTH0_AUDIENCE: "https://test-api.example.com",
      SERVER_URL: "http://localhost:3000",
      NODE_ENV: "test",
      LOG_LEVEL: "fatal",
    },
  },
});
