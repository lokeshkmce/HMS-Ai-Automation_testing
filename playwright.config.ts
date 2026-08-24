import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// ─── Environment bootstrap ───────────────────────────────────────────────────
// Load environment-specific .env first, then allow root .env to override.
const ENV = process.env.TEST_ENV || 'dev';
dotenv.config({ path: path.resolve(__dirname, 'config', 'env', `.env.${ENV}`) });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseURL = process.env.BASE_URL || 'https://dev.omnivva.com';
const STORAGE_STATE = path.resolve(__dirname, '.auth', 'storageState.json');

export default defineConfig({
  testDir: './tests',
  outputDir: './reports/test-results',

  // 4-minute global timeout — allows multi-portal (Patient + Receptionist + Doctor) workflows
  timeout: 240_000,
  expect: { timeout: 10_000 },

  // Run tests within a file in parallel; each test gets its own browser context
  fullyParallel: true,

  // Prevent accidental test.only commits from passing CI
  forbidOnly: !!process.env.CI,

  // Retry flaky tests twice on CI, once on local to absorb transient dev server 503s
  retries: process.env.CI ? 2 : 1,

  // 5 parallel workers default (override with WORKERS=X)
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS) : 5,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'reports/allure-results',
        detail: true,
        suiteTitle: true,
      },
    ],
  ],

  use: {
    baseURL,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    trace: 'on', // Record full trace for all tests
    screenshot: 'on', // Auto-capture screenshot for all tests in Allure & HTML reports
    video: 'on', // Record and attach full video for all tests in Allure & HTML reports
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // NOTE: omnivva-login.spec.ts overrides this with { cookies: [], origins: [] }
    // for per-test isolation. The file is created by global-setup if it doesn't exist.
    storageState: STORAGE_STATE,
  },

  globalSetup: require.resolve('./fixtures/global-setup'),
  globalTeardown: require.resolve('./fixtures/global-teardown'),

  projects: [
    // ── UI Project: Chromium ────────────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testDir: './tests/e2e',
    },

    // ── API Project ─────────────────────────────────────────────────────────
    {
      name: 'api',
      use: {
        baseURL: process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com',
        extraHTTPHeaders: {
          Accept: 'application/json',
        },
        // API tests have no browser session — explicitly clear storageState
        storageState: undefined,
        // Disable browser-only recording — APIRequestContext does not support these
        trace: 'off',
        screenshot: 'off',
        video: 'off',
      },
      testDir: './tests/api',
    },
  ],
});
