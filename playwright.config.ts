import { defineConfig } from '@playwright/test';

const base = process.env.PUBLIC_BASE_PATH ?? '/pantheon/pr-test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:4193${base}/`,
    trace: 'retain-on-failure',
    deviceScaleFactor: 1,
    // Full rasterization avoids reload-dependent rounded-edge pixels on macOS.
    launchOptions: { args: ['--font-render-hinting=none', '--disable-font-subpixel-positioning', '--disable-lcd-text', '--force-device-scale-factor=1', '--disable-gpu', '--disable-skia-runtime-opts', '--disable-partial-raster', '--use-gl=swiftshader'] },
    timezoneId: 'America/Toronto',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    locale: 'en-CA',
    reducedMotion: 'reduce'
  },
  projects: [
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 393, height: 852 } } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'tabletop-4k', use: { browserName: 'chromium', viewport: { width: 3840, height: 2160 } } }
  ],
  snapshotPathTemplate: '{testDir}/{testFileDir}/screenshots/{arg}{ext}',
  // Two complete 4K software captures can exceed five seconds on hosted runners.
  expect: { toHaveScreenshot: { timeout: 15_000, maxDiffPixels: 0, threshold: 0, animations: 'disabled', caret: 'hide', scale: 'css', fullPage: true } },
  webServer: {
    command: 'bun run build && bun run preview',
    url: `http://127.0.0.1:4193${base}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PUBLIC_BASE_PATH: base, VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_AUTH_DOMAIN: 'demo-pantheon.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'demo-pantheon', VITE_FIREBASE_APP_ID: 'demo-pantheon', VITE_USE_FIREBASE_EMULATORS: 'true' }
  }
});
