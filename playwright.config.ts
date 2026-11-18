import { defineConfig } from '@playwright/test'

// End-to-end tests run against the production build. Locally they use installed Chrome (WebGPU);
// CI uses Playwright's Chromium, which falls back to WebGL2 — both paths get exercised.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4175',
    // CI renders in software (no GPU): a smaller canvas keeps it near real time.
    viewport: process.env.CI ? { width: 960, height: 600 } : { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    channel: process.env.CI ? undefined : 'chrome',
    launchOptions: { args: ['--enable-unsafe-webgpu'] },
  },
  webServer: {
    command: 'npx vite preview --port 4175 --strictPort',
    url: 'http://localhost:4175',
    reuseExistingServer: !process.env.CI,
  },
})
