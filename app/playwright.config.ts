import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
const directory = resolve('/private/tmp', `aber-e2e-${process.pid}`);
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/private/tmp/aber-playwright';
export default defineConfig({
  testDir: './e2e', outputDir: './test-results/runs', fullyParallel: false, workers: 1,
  timeout: 45000, expect: { timeout: 12000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5190', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 820 } } },
    { name: 'webkit-phone', testMatch: /phone\.spec\.ts/, use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run seed && npx concurrently -k "tsx server/src/index.ts" "vite --host 127.0.0.1 --port 5190 --strictPort"',
    url: 'http://127.0.0.1:5190', timeout: 120000, reuseExistingServer: false,
    env: { AGENT_MODE: 'fake', ABER_DATA_DIR: directory, PORT: '3010', ABER_API_TARGET: 'http://127.0.0.1:3010' },
  },
});
