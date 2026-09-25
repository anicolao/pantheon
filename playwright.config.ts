import { defineConfig } from '@playwright/test';

const base = process.env.PUBLIC_BASE_PATH ?? '/pantheon/pr-test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:4193${base}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-CA',
    reducedMotion: 'reduce'
  },
  projects: [
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 393, height: 852 } } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'tabletop-4k', use: { browserName: 'chromium', viewport: { width: 3840, height: 2160 } } }
  ],
  webServer: {
    command: 'bun run build && bun run preview',
    url: `http://127.0.0.1:4193${base}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PUBLIC_BASE_PATH: base }
  }
});
