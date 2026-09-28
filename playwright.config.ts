import { defineConfig, devices } from '@playwright/test'

const API = 'http://localhost:5011'

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 120000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  use: {
    baseURL: 'http://localhost:5179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testIgnore: /responsive/,
    },
    {
      name: 'mobile-web',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
      testMatch: /responsive/,
    },
  ],
  webServer: [
    {
      command: 'node e2e/bootstrap.mjs',
      stdout: 'pipe',
      stderr: 'pipe',
      waitForStdout: /QA E2E READY/,
      timeout: 180000,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite --port 5179 --strictPort',
      env: { ...process.env, API_PROXY_TARGET: API },
      url: 'http://localhost:5179',
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite --port 5180 --strictPort',
      cwd: 'administration',
      env: { ...process.env, API_PROXY_TARGET: API },
      url: 'http://localhost:5180',
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite --port 5176 --strictPort',
      cwd: 'moniteur',
      env: { ...process.env, API_PROXY_TARGET: API },
      url: 'http://localhost:5176',
      timeout: 120000,
      reuseExistingServer: false,
    },
  ],
})
