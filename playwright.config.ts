import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:7474',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Automatically start dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:7474',
    reuseExistingServer: !process.env['CI'],
    timeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
