import { defineConfig } from "@playwright/test";

/**
 * Retakes the README screenshots from the demo account: `make up && make demo`, then
 * `make screenshots`. Not a test suite; it only saves pictures to docs/screenshots.
 */
export default defineConfig({
  testDir: "./screenshots",
  timeout: 180_000,
  workers: 1,
  reporter: [["list"]],
  outputDir: "results/screenshots",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:8400" },
});
