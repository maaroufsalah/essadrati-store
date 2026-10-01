import { defineConfig } from "vitest/config";

// Unit tests: pure functions, no database.
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.unit.spec.ts"],
  },
});
