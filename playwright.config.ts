import { existsSync } from 'fs';
import { defineConfig, devices } from '@playwright/test';

// Some sandboxes ship a fixed, pre-downloaded Chromium build at this path
// (to skip a network fetch). Everywhere else — CI, a developer's machine —
// this is absent and Playwright resolves its own installed browser instead.
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium';
const executablePath = existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined;

/**
 * E2E config. Runs against a locally-started `next dev` server on a
 * dedicated port so it never collides with a developer's own dev server.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 4300',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
