import { FullConfig } from '@playwright/test';
import { environment } from '../config/environment';
import { logger } from '../utils/logger';
import { ensureDir } from '../utils/file-utils';
import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.resolve(__dirname, '..', '.auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');

async function globalSetup(_config: FullConfig): Promise<void> {
  logger.info(`Global setup started — environment: ${environment.env}`);
  logger.info(`  baseURL:         ${environment.baseURL}`);
  logger.info(`  identityBaseURL: ${environment.identityBaseURL}`);
  logger.info(`  apiBaseURL:      ${environment.apiBaseURL}`);

  // Ensure required output directories exist
  ensureDir(AUTH_DIR);
  ensureDir(path.resolve(__dirname, '..', 'reports', 'logs'));
  ensureDir(path.resolve(__dirname, '..', 'reports', 'html'));
  ensureDir(path.resolve(__dirname, '..', 'reports', 'allure-results'));

  // Always (re-)write an empty storage state so that:
  //   1. playwright.config.ts storageState reference is always valid
  //   2. Stale cookies from previous runs never contaminate a new run
  // Individual tests that need authentication manage their own session
  // via test.use({ storageState: { cookies: [], origins: [] } }).
  fs.writeFileSync(
    STORAGE_STATE_PATH,
    JSON.stringify({ cookies: [], origins: [] }, null, 2),
    'utf-8',
  );
  logger.info('Written fresh empty storageState.json — tests handle auth per-test');

  logger.info('Global setup completed');
}

export default globalSetup;
