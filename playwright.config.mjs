import YAML from 'yaml';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const root = path.dirname(fileURLToPath(import.meta.url));
const platform = process.env.PLATFORM_PATH || path.join(root, 'workspace/platform');
const web = process.env.WEB_PATH || path.join(root, 'workspace/web');
const admin = process.env.ADMIN_PATH || path.join(root, 'workspace/admin');

export default defineConfig({
  outputDir: '.tools/playwright.config-results',
  testDir: './tests/e2e',
  timeout: 30_000,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: { trace: 'off', screenshot: 'only-on-failure' },
  projects: Object.keys(YAML.parse(fs.readFileSync(path.join(root, 'architecture/locales.yaml'), 'utf8')).languages).flatMap(locale => [
    { name: `desktop-${locale}`, metadata: { locale }, use: { ...devices['Desktop Chrome'] } },
    { name: `mobile-${locale}`, metadata: { locale }, use: { ...devices['Pixel 7'] } },
  ]),
  webServer: [
    {
      command: './bin/stuhelper-platform', cwd: platform,
      env: { STUHELPER_LISTEN: '127.0.0.1:18780', STUHELPER_MODULES: 'platform' },
      url: 'http://127.0.0.1:18780/readyz', reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    },
    {
      command: 'pnpm run preview --port 18781', cwd: web,
      env: { STUHELPER_API_TARGET: 'http://127.0.0.1:18780' },
      url: 'http://127.0.0.1:18781', reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    },
    {
      command: 'make preview', cwd: admin,
      env: { STUHELPER_API_TARGET: 'http://127.0.0.1:18780', STUHELPER_PREVIEW_PORT: '18782' },
      url: 'http://127.0.0.1:18782', reuseExistingServer: false,
      timeout: 60_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    },
  ],
});
