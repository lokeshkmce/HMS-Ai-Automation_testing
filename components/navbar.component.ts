import { Page, Locator } from '@playwright/test';
import { logger } from '../utils/logger';

/**
 * NavbarComponent — reusable MUI AppBar navigation component for Omnivva HMS.
 *
 * Selectors are based on MUI (Material-UI) patterns.
 * Can be composed into any Omnivva page that has a top navigation bar.
 */
export class NavbarComponent {
  readonly root: Locator;
  readonly searchInput: Locator;
  readonly userMenuButton: Locator;
  readonly logoutMenuItem: Locator;
  readonly notificationBell: Locator;

  constructor(private readonly page: Page) {
    // MUI AppBar root
    this.root = page.locator('.MuiAppBar-root, header[role="banner"]');
    // Global search — MUI TextField or Input inside AppBar
    this.searchInput = page.locator('.MuiAppBar-root input[type="search"], .MuiAppBar-root input[placeholder*="search" i]');
    // User account icon button
    this.userMenuButton = page.locator(
      '[aria-label="account of current user"], [aria-label="user menu"], button:has([data-testid="AccountCircleIcon"])',
    );
    // MUI MenuItem for logout inside the user dropdown
    this.logoutMenuItem = page.locator('[role="menuitem"]:has-text("Logout"), li:has-text("Logout")');
    // Notification bell icon button
    this.notificationBell = page.locator(
      '[aria-label="notifications"], button:has([data-testid="NotificationsIcon"])',
    );
  }

  async searchMenu(query: string): Promise<void> {
    logger.info(`Searching navbar for: "${query}"`);
    await this.searchInput.fill(query);
  }

  async openUserMenu(): Promise<void> {
    logger.info('Opening user account menu');
    await this.userMenuButton.click();
  }

  async logout(): Promise<void> {
    logger.info('Logging out via navbar');
    await this.openUserMenu();
    await this.logoutMenuItem.click();
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }
}
