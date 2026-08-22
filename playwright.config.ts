import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1, // Run sequentially to avoid DB write collisons
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5188',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run dev --prefix server',
      url: 'http://localhost:5005/api/health',
      timeout: 30000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev --prefix client',
      url: 'http://localhost:5188',
      timeout: 30000,
      reuseExistingServer: true,
    },
  ],
});
