import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a running stack: `make up && make demo`, then `make e2e`.
 * BASE_URL defaults to the local stack; inside Docker it's the frontend container.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "report" }]],
  outputDir: "results",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8400",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
