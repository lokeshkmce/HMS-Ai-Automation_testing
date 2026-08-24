import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

/**
 * DashboardPage — Omnivva HMS Staff Portal dashboard.
 *
 * Selectors use MUI (Material-UI) patterns which Omnivva is built on.
 * Extend this class as more dashboard features are automated.
 */
export class DashboardPage extends BasePage {
  // ─── Locators ───────────────────────────────────────────────
  readonly pageHeading: Locator;
  readonly sideDrawer: Locator;
  readonly userMenuButton: Locator;
  readonly logoutMenuItem: Locator;

  constructor(page: Page) {
    super(page);
    // MUI AppBar / Toolbar heading
    this.pageHeading = page.locator('.MuiTypography-root[variant="h6"], header h6, header h5');
    // MUI Drawer (sidebar navigation)
    this.sideDrawer = page.locator('.MuiDrawer-root, aside[aria-label="sidebar"]');
    // MUI IconButton or Button for the user account menu
    this.userMenuButton = page.locator(
      '[aria-label="account of current user"], [aria-label="user menu"], button:has([data-testid="AccountCircleIcon"])',
    );
    // MUI MenuItem for logout
    this.logoutMenuItem = page.locator('[role="menuitem"]:has-text("Logout"), li:has-text("Logout")');
  }

  // ─── Actions ────────────────────────────────────────────────

  async logout(): Promise<void> {
    logger.info('Logging out of Omnivva HMS portal');
    await this.click(this.userMenuButton);
    await this.click(this.logoutMenuItem);
    await this.waitForPageLoad();
  }

  async getHeadingText(): Promise<string> {
    return this.getText(this.pageHeading);
  }

  // ─── Assertions ─────────────────────────────────────────────

  async expectOnDashboard(): Promise<void> {
    await this.expectUrl('dashboard');
    await this.expectVisible(this.sideDrawer);
  }
}
