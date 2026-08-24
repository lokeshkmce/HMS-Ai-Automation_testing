import { Page, expect, Locator } from '@playwright/test';
import { logger } from './logger';

/**
 * Wait for an element to be visible with a custom timeout.
 */
export async function waitForVisible(locator: Locator, timeoutMs = 10_000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
}

/**
 * Wait for an element to be hidden / detached.
 */
export async function waitForHidden(locator: Locator, timeoutMs = 10_000): Promise<void> {
  await locator.waitFor({ state: 'hidden', timeout: timeoutMs });
}

/**
 * Wait for network to settle (uses 'load' state — all resources loaded).
 * Note: networkidle is unreliable and banned by eslint-plugin-playwright.
 * Prefer explicit element waits (waitForVisible) where possible.
 */
export async function waitForNetworkIdle(page: Page, timeoutMs = 15_000): Promise<void> {
  await page.waitForLoadState('load', { timeout: timeoutMs });
}

/**
 * Retry an async action up to `maxRetries` times.
 */
export async function retry<T>(
  action: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1_000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Assert response status and optionally return parsed JSON body.
 */
export async function assertApiResponse<T = unknown>(
  response: { status: () => number; json: () => Promise<T> },
  expectedStatus: number,
): Promise<T> {
  expect(response.status()).toBe(expectedStatus);
  return response.json();
}

/**
 * Generate a random string of given length (useful for test data).
 */
export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Take a named screenshot and attach it to the test context.
 */
export async function takeScreenshot(page: Page, name: string): Promise<Buffer> {
  const buffer = await page.screenshot({ fullPage: true });
  logger.info(`Screenshot captured: ${name}`);
  return buffer;
}
