import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { environment } from '../config/environment';
import { logger } from '../utils/logger';

export class OmnivvaLoginPage extends BasePage {
  // ─── Locators ───────────────────────────────────────────────
  readonly landingStaffLoginButton: Locator;
  readonly landingPatientLoginButton: Locator;

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly sideMenuItems: Locator;

  constructor(page: Page) {
    super(page);
    // Landing page header buttons
    this.landingStaffLoginButton = page.getByRole('button', { name: 'Staff Login' });
    this.landingPatientLoginButton = page.getByRole('button', { name: 'Patient Login' });

    // Identity server login page elements
    this.usernameInput = page.locator(
      'input[placeholder*="Username" i], input[name="username"], input[name="email"]',
    );
    this.passwordInput = page.locator(
      'input[placeholder*="Password" i], input[name="password"]',
    );
    this.signInButton = page
      .getByRole('button', { name: 'Sign In', exact: true })
      .or(page.locator('button[type="submit"]'))
      .first();
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]');
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    this.errorMessage = page.locator(
      '[role="alert"], .MuiAlert-root, .error-message, ' +
        'p:has-text("invalid" i), p:has-text("incorrect" i), ' +
        'p:has-text("required" i), span:has-text("required" i)',
    );
    this.sideMenuItems = page.locator(
      'nav a, nav button, [role="menuitem"], .sidebar-item, .menu-item, ' +
        'ul.nav-list > li, .MuiListItemButton-root, aside a, aside button',
    );
  }

  // ─── Actions ────────────────────────────────────────────────

  async recoverFrom503IfPresent(): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const is503 = await this.page
        .locator('text=/503|service unavailable/i')
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (!is503) break;
      logger.warn(`[503 Detected] Dev identity server returned 503 (attempt ${attempt}) — waiting and reloading...`);
      await this.page.waitForTimeout(2000);
      await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => null);
      await this.page.waitForTimeout(2000);
    }
  }

  async gotoLandingPage(): Promise<void> {
    const url = 'https://dev-hms.srivyn.in';
    logger.info(`Navigating to Omnivva HMS Landing Page: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await this.recoverFrom503IfPresent();
  }

  async gotoLoginPageDirect(): Promise<void> {
    // Initiate NextAuth signin flow on HMS so PKCE and state cookies are set properly
    logger.info('Initiating NextAuth signin on dev-hms.srivyn.in...');
    await this.page.goto('https://dev-hms.srivyn.in/api/auth/signin', { waitUntil: 'domcontentloaded' });
    await this.recoverFrom503IfPresent();
  }

  async clickStaffLogin(): Promise<void> {
    if (this.page.url().includes('dev-identity.srivyn.in') || this.page.url().includes('/staff/dashboard')) {
      await this.recoverFrom503IfPresent();
      return;
    }
    logger.info('Clicking Staff Login button on landing page');
    const btn = this.page
      .getByRole('button', { name: 'Staff Login' })
      .or(this.page.locator('a:has-text("Staff Login"), button:has-text("Staff Login")'))
      .first();

    await btn.waitFor({ state: 'visible', timeout: 20000 });
    await this.page.waitForLoadState('networkidle').catch(() => null);
    await this.page.waitForTimeout(1000);

    for (let attempt = 1; attempt <= 3; attempt++) {
      await btn.click({ force: true }).catch(() => null);
      const navigated = await this.page
        .waitForURL(/dev-identity\.srivyn\.in|dashboard/, { timeout: 6000 })
        .then(() => true)
        .catch(() => false);
      if (navigated || this.page.url().includes('dev-identity.srivyn.in') || this.page.url().includes('dashboard')) {
        await this.recoverFrom503IfPresent();
        return;
      }
      logger.info(`Staff login click attempt ${attempt} did not navigate — retrying after delay...`);
      await this.page.waitForTimeout(1500);
    }

    logger.info('Initiating NextAuth signin fallback...');
    await this.gotoLoginPageDirect();
    await this.page.waitForURL(/dev-identity\.srivyn\.in|dashboard/, { timeout: 25000 });
    await this.recoverFrom503IfPresent();
  }

  async fillUsername(username: string): Promise<void> {
    await this.recoverFrom503IfPresent();
    logger.info(`Filling username: "${username}"`);
    if (username) {
      await this.fill(this.usernameInput, username);
    } else {
      await this.usernameInput.clear();
    }
  }

  async fillPassword(password: string): Promise<void> {
    logger.info('Filling password');
    if (password) {
      await this.fill(this.passwordInput, password);
    } else {
      await this.passwordInput.clear();
    }
  }

  async clickSignIn(): Promise<void> {
    logger.info('Clicking Sign In button');
    await this.click(this.signInButton);
  }

  async login(username: string, password: string): Promise<void> {
    if (this.page.url().includes('/staff/dashboard')) {
      logger.info('Already on staff dashboard, skipping login credentials entry');
      return;
    }
    logger.info(`Performing login with username: "${username}"`);
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickSignIn();
  }

  async loginAndVerifyAuth(
    username: string,
    password: string,
  ): Promise<{ authenticated: boolean; redirectedToPortal: boolean; responseStatus: number }> {
    logger.info(`Performing login and verifying authentication for: "${username}"`);

    const authResponsePromise = this.page
      .waitForResponse(
        (res) =>
          res.url().includes('/api/auth/v1/authenticate') || res.url().includes('/authenticate'),
        { timeout: 20_000 },
      )
      .catch(() => null);

    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickSignIn();

    const response = await authResponsePromise;
    let authStatus = 0;
    let authSuccess = false;

    if (response) {
      authStatus = response.status();
      authSuccess = authStatus >= 200 && authStatus < 300;
      logger.info(`Authentication API returned HTTP ${authStatus}`);
    } else {
      logger.warn('No authentication API response intercepted — checking URL redirect instead');
    }

    const currentUrl = this.page.url();
    const redirectedToPortal =
      currentUrl.includes(new URL(environment.baseURL).hostname) &&
      !currentUrl.includes('/login?client_id=');

    return {
      authenticated: authSuccess || redirectedToPortal,
      redirectedToPortal,
      responseStatus: authStatus,
    };
  }

  async waitForPortalLoad(timeoutMs = 30_000): Promise<void> {
    logger.info('Waiting for OAuth token exchange & full dashboard portal render...');

    // 1. Wait until URL leaves identity server and auth callback
    try {
      await this.page.waitForURL(
        (url) =>
          !url.href.includes('/login?client_id=') &&
          !url.pathname.includes('/api/auth/callback'),
        { timeout: timeoutMs },
      );
    } catch (err) {
      logger.warn(`URL redirect wait timed out: ${(err as Error).message}`);
    }

    // 2. Wait for the authorizing spinner to disappear
    const authorizingSpinner = this.page.locator(
      'text=/Authorizing HMS Staff Client/i, .MuiCircularProgress-root, .spinner',
    );
    try {
      await authorizingSpinner.waitFor({ state: 'detached', timeout: 20_000 });
    } catch {
      // Spinner may not appear on fast connections — not a failure condition
      logger.info('Authorizing spinner not detected (fast load or already gone)');
    }

    // 3. Wait for DOM content and dashboard layout elements
    await this.waitForPageLoad();
    try {
      await this.page
        .locator('nav, aside, header, .sidebar, main, [role="navigation"], .MuiDrawer-root, table')
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 });
    } catch (err) {
      logger.warn(
        `Dashboard layout element not found after portal load: ${(err as Error).message}`,
      );
    }

    logger.info('waitForPortalLoad complete');
  }

  async getSideMenuCount(): Promise<number> {
    try {
      await this.page
        .locator('nav, aside, .sidebar, [role="navigation"]')
        .first()
        .waitFor({ state: 'visible', timeout: 5_000 });
    } catch (err) {
      logger.warn(`Sidebar navigation not found within 5s: ${(err as Error).message}`);
    }
    return this.sideMenuItems.count();
  }

  // ─── Assertions ─────────────────────────────────────────────

  async isErrorVisible(timeoutMs = 3_000): Promise<boolean> {
    return this.isVisible(this.errorMessage, timeoutMs);
  }

  async expectErrorVisible(): Promise<void> {
    await this.expectVisible(this.errorMessage);
  }

  /**
   * Assert that the browser is on the identity server login page.
   * Does NOT navigate — throws a clear assertion error if not on the expected page.
   */
  async expectOnIdentityLoginPage(): Promise<void> {
    const identityHost = new URL(environment.identityBaseURL).hostname;
    await this.expectUrl(identityHost.replace(/\./g, '\\.'));
    await this.expectVisible(this.signInButton);
  }

  /**
   * Assert that the user has been redirected to the HMS portal after login.
   */
  async expectRedirectedToPortal(): Promise<void> {
    const portalHost = new URL(environment.baseURL).hostname;
    await this.expectUrl(portalHost.replace(/\./g, '\\.'));
  }

  /**
   * Assert that the menu item count matches the expected count for a given role.
   */
  async expectMenuCount(expectedCount: number, role: string): Promise<void> {
    const actualCount = await this.getSideMenuCount();
    if (actualCount !== expectedCount) {
      throw new Error(
        `[${role}] Expected ${expectedCount} side-menu items but found ${actualCount}. ` +
          `Role-based menu permissions may have changed.`,
      );
    }
    logger.info(`[${role}] Side menu count verified: ${actualCount} items`);
  }
}
