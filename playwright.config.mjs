import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  use: { baseURL: 'http://localhost:8099', acceptDownloads: true, locale: 'es-CO' },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', use: { viewport: { width: 1366, height: 900 } } }
  ],
  webServer: { command: 'npx http-server -p 8099 -c-1 -s .', url: 'http://localhost:8099', reuseExistingServer: true }
});
