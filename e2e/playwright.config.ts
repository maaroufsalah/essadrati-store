import { defineConfig } from "@playwright/test";

/**
 * COD checkout end to end, on the three design breakpoints, against a
 * running storefront + backend (E2E_BASE_URL, default http://localhost:3000).
 * Orders are real: run against a disposable or development database.
 * Locally, E2E_CHANNEL=chrome (default outside CI) uses the installed Chrome
 * instead of downloading Playwright's Chromium.
 */
const CI = Boolean(process.env.CI);
const channel = process.env.E2E_CHANNEL ?? (CI ? undefined : "chrome");

export default defineConfig({
  testDir: "./tests",
  // A COD order runs a backend workflow: slow through an SSH tunnel in dev.
  timeout: 150_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel,
    locale: "fr-MA",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-390",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    { name: "tablet-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
