import { defineConfig, devices } from '@playwright/test';

/**
 * The portfolio's own suite.
 *
 * It runs against the working tree through scripts/serve.mjs rather than the
 * published site, so a broken page is caught before it is deployed rather than
 * after: the deploy job waits on this suite. The suite's run feed is never
 * fetched from the network here; every test answers it with a recorded feed,
 * so a red run in the other repository cannot turn this one red.
 */
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ['github'],
        ['list'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'reports/results.json' }],
      ]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: `node scripts/serve.mjs ${PORT}`,
    url: BASE_URL,
    env: { SUITE_ORIGIN: 'none' },
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 20_000,
  },
});
