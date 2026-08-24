import { Page, Locator, expect } from '@playwright/test';
import { logger } from '../utils/logger';

export class BasePage {
  constructor(public readonly page: Page) {}

  // ─── Navigation ─────────────────────────────────────────────
  async navigate(path: string): Promise<void> {
    logger.info(`Navigating to: ${path}`);
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  // ─── Element interactions ───────────────────────────────────
  async click(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    logger.info(`Clicking element`);
    await locator.click();
  }

  async fill(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    logger.info(`Filling input with value`);
    await locator.fill(value);
  }

  async selectOption(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    logger.info(`Selecting option: ${value}`);
    await locator.selectOption(value);
  }

  async getText(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible' });
    return (await locator.textContent()) ?? '';
  }

  async isVisible(locator: Locator, timeoutMs = 5_000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Waits ──────────────────────────────────────────────────
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for the page's network activity to settle.
   * Uses 'load' state (all resources loaded) instead of the unreliable
   * `networkidle` state (which eslint-plugin-playwright prohibits).
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('load');
  }

  async waitForSelector(selector: string, timeoutMs = 10_000): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    return locator;
  }

  // ─── Assertions ─────────────────────────────────────────────
  async expectUrl(urlPart: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(urlPart));
  }

  async expectTitle(title: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(title);
  }

  async expectVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }

  async expectText(locator: Locator, text: string | RegExp): Promise<void> {
    await expect(locator).toHaveText(text);
  }

  // ─── Utilities ──────────────────────────────────────────────

  /**
   * Take a full-page screenshot and return the buffer.
   * The `name` is used for logging only — Playwright's built-in
   * screenshot attachment (configured via playwright.config.ts) handles
   * report attachment automatically.
   */
  async screenshot(name: string): Promise<Buffer> {
    logger.info(`Taking screenshot: ${name}`);
    const buffer = await this.page.screenshot({ fullPage: true, path: undefined });
    return buffer;
  }
}
