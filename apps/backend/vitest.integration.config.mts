import { defineConfig } from "vitest/config";

/**
 * Integration tests against the essadrati_test database (SSH tunnel open).
 * @medusajs/test-utils registers Jest-style globals, hence `globals`.
 */
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.integration.spec.ts", "integration-tests/**/*.spec.ts"],
    globals: true,
    setupFiles: ["./integration-tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
