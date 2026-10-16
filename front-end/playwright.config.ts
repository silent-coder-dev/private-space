import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Two- and four-browser tests need more than the default 30 s.
  timeout: 90_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    // Fake camera + microphone so calls and the camera can be tested.
    permissions: ["camera", "microphone"],
    launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Tests run against the real production server (build + npm start).
    command: "npm run build && npm start",
    timeout: 180_000,
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
