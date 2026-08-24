import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

/**
 * LoginPage — generic OAuth/identity server login page.
 *
 * This is kept as a utility base for future identity provider pages.
 * For Omnivva-specific login flows, use OmnivvaLoginPage instead.
 */
export class LoginPage extends BasePage {
  // ─── Locators ───────────────────────────────────────────────
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    // Generic identity-server compatible selectors
    this.usernameInput = page.locator(
      'input[name="username"], input[name="email"], input[type="email"]',
    );
    this.passwordInput = page.locator('input[name="password"], input[type="password"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator(
      '[role="alert"], .error-message, [class*="error"], [class*="alert"]',
    );
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
  }

  // ─── Actions ────────────────────────────────────────────────

  async login(username: string, password: string): Promise<void> {
    logger.info(`Logging in as: "${username}"`);
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
    await this.waitForPageLoad();
  }

  // ─── Assertions ─────────────────────────────────────────────

  async expectErrorVisible(): Promise<void> {
    await this.expectVisible(this.errorMessage);
  }

  async expectOnLoginPage(): Promise<void> {
    await this.expectVisible(this.loginButton);
  }
}
