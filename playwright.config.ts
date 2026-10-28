import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

const pilotStatePath = path.join(__dirname, "playwright", ".auth", "pilot-session.json");
const hasPilotSession = fs.existsSync(pilotStatePath);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  reporter: "html",
  use: {
    baseURL: "http://localhost:3005",
    storageState: hasPilotSession ? pilotStatePath : undefined,
    trace: "on-first-retry",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next dev -p 3005",
    url: "http://localhost:3005",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
