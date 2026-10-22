import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDirectory = path.dirname(fileURLToPath(import.meta.url))
const resultsDirectory = path.resolve(configDirectory, '../artifacts/Q01/results')

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { outputFolder: path.join(resultsDirectory, 'html'), open: 'never' }]],
  outputDir: path.join(resultsDirectory, 'test-output'),
  use: {
    baseURL: 'http://127.0.0.1:4200',
    browserName: 'chromium',
    headless: true,
    launchOptions: { channel: 'chrome' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
