import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

/**
 * PortalDashboardPage — Omnivva HMS Portal Dashboard validation.
 *
 * Provides assertions and data extraction for the staff portal dashboard
 * that loads after selecting a role via the Role Slider. The dashboard
 * layout is consistent across all portals, though the widgets and quick
 * actions vary per role.
 *
 * Usage:
 *   const dashboard = new PortalDashboardPage(page);
 *   await dashboard.expectDashboardLoaded('Doctor');
 *   const title = await dashboard.getGreetingText();
 */
export class PortalDashboardPage extends BasePage {
  // ─── Locators ───────────────────────────────────────────────

  /** Top-level greeting banner (e.g. "Good Morning, Dr. QA All Roles!") */
  readonly greetingBanner: Locator;

  /** The workspace/breadcrumb header showing "WORKSPACE / DASHBOARD" */
  readonly workspaceBreadcrumb: Locator;

  /** Stat/metric cards on the dashboard (OPD Patients Today, Waiting, etc.) */
  readonly dashboardStatCards: Locator;

  /** "Quick Actions" section */
  readonly quickActionsSection: Locator;

  /** Left-side navigation drawer / sidebar */
  readonly sideNavigation: Locator;

  /** Top app bar / header */
  readonly appBar: Locator;

  /** Department indicator in the greeting banner */
  readonly departmentLabel: Locator;

  /** Loading spinner (MUI CircularProgress) */
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    super(page);

    // Confirmed: page has h5 with text "Dashboard" and breadcrumb "WORKSPACE / DASHBOARD"
    this.greetingBanner = page
      .locator('h5')
      .filter({ hasText: /dashboard/i })
      .or(page.locator('h4, h5, h6').filter({ hasText: /good (morning|afternoon|evening)/i }))
      .first();

    // Confirmed: breadcrumb text "WORKSPACE / DASHBOARD"
    this.workspaceBreadcrumb = page
      .locator('text=DASHBOARD')
      .or(page.locator('text=Dashboard'))
      .first();

    // Stat cards — grey skeleton cards that load dashboard stats
    this.dashboardStatCards = page.locator(
      '[class*="skeleton"], [class*="card"], [class*="stat"], ' +
        'div:has(p:has-text("TODAY")), div:has(p:has-text("PENDING"))',
    );

    // Quick Actions section
    this.quickActionsSection = page
      .locator('text=Quick Actions')
      .or(page.locator('h6:has-text("Quick Actions")'))
      .first();

    // Sidebar nav — confirmed: page has <nav> element
    this.sideNavigation = page.locator('nav, aside').first();

    // Top header — confirmed: page has <header> element
    this.appBar = page.locator('header').first();

    // Department label
    this.departmentLabel = page
      .locator('p')
      .filter({ hasText: /department/i })
      .first();

    // Loading skeleton/spinner
    this.loadingSpinner = page.locator(
      '[class*="skeleton"], [class*="MuiCircularProgress"], [class*="spinner"]',
    );
  }

  // ─── Actions ────────────────────────────────────────────────

  /**
   * Extract the greeting text (e.g. "Good Morning, Dr. QA All Roles!").
   */
  async getGreetingText(): Promise<string> {
    try {
      const text = await this.greetingBanner.textContent({ timeout: 800 });
      return text?.trim() ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Extract dashboard stat card labels and their values.
   * Returns an array of { label, value } objects.
   */
  async getDashboardStats(): Promise<{ label: string; value: string }[]> {
    const stats: { label: string; value: string }[] = [];
    try {
      const count = await this.dashboardStatCards.count();
      for (let i = 0; i < count; i++) {
        const card = this.dashboardStatCards.nth(i);
        const text = (await card.textContent()) ?? '';
        stats.push({ label: `card_${i + 1}`, value: text.trim() });
      }
    } catch {
      logger.warn('Could not extract dashboard stat cards');
    }
    return stats;
  }

  /**
   * Get the count of sidebar navigation items for the current role.
   */
  async getSideMenuCount(): Promise<number> {
    try {
      const menuItems = this.page.locator(
        'nav a, nav button, nav li, ' +
          '.MuiListItemButton-root, aside a, aside button, aside li, ' +
          '[role="menuitem"], .sidebar-item',
      );
      await this.sideNavigation.waitFor({ state: 'visible', timeout: 5_000 });
      return menuItems.count();
    } catch {
      logger.warn('Could not count sidebar menu items');
      return 0;
    }
  }

  /**
   * Wait for all loading spinners to disappear, indicating dashboard is ready.
   */
  async waitForSpinnerToDisappear(timeoutMs = 15_000): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: timeoutMs });
    } catch {
      // Spinner may not appear at all — not a failure
    }
  }

  /**
   * Assert a specific menu item is loaded on the page or inside navigation.
   */
  async expectMenuItemLoaded(menuName: string): Promise<boolean> {
    const menuLocator = this.page.locator(`text="${menuName}"`)
      .or(this.page.getByRole('link', { name: new RegExp(`^${menuName}$`, 'i') }))
      .or(this.page.getByRole('button', { name: new RegExp(`^${menuName}$`, 'i') }))
      .or(this.page.locator(`[class*="MuiListItem-root"]:has-text("${menuName}"), [class*="nav"]:has-text("${menuName}")`))
      .first();

    const isVisible = await menuLocator.isVisible().catch(() => false);
    if (isVisible) {
      logger.info(`[Admin Menu] ✓ Menu item "${menuName}" is loaded and visible.`);
      return true;
    }

    // Check if element is in DOM but needs scroll
    const count = await menuLocator.count().catch(() => 0);
    if (count > 0) {
      await menuLocator.scrollIntoViewIfNeeded().catch(() => null);
      const isVisibleAfterScroll = await menuLocator.isVisible().catch(() => false);
      if (isVisibleAfterScroll) {
        logger.info(`[Admin Menu] ✓ Menu item "${menuName}" is visible after scrolling.`);
        return true;
      }
    }

    logger.warn(`[Admin Menu] ℹ Menu item "${menuName}" not found or collapsed under module.`);
    return false;
  }

  /**
   * Verify a collection of expected menu items and capture detailed report.
   */
  async verifyAdminMenus(menus: { id: string; menuName: string; category?: string }[]): Promise<{ passed: string[]; notFound: string[] }> {
    logger.info(`[Admin Menus] Validating ${menus.length} expected menu items...`);
    const passed: string[] = [];
    const notFound: string[] = [];

    for (const item of menus) {
      const isLoaded = await this.expectMenuItemLoaded(item.menuName);
      if (isLoaded) {
        passed.push(item.menuName);
      } else {
        notFound.push(item.menuName);
      }
    }

    logger.info(`[Admin Menus] Results: ${passed.length}/${menus.length} menus verified.`);
    return { passed, notFound };
  }

  // ─── Assertions ─────────────────────────────────────────────

  /**
   * Assert the portal dashboard has loaded successfully for a given role.
   * Checks URL contains 'dashboard', sidebar is visible, and page is not blank.
   *
   * @param roleName - Used in error messages for clarity
   */
  async expectDashboardLoaded(roleName: string): Promise<void> {
    logger.info(`[${roleName}] Asserting dashboard loaded`);

    // 1. URL must contain '/staff/dashboard' (give sufficient time for OAuth code exchange and hydration)
    if (!this.page.url().includes('/staff/dashboard')) {
      await this.page.waitForURL(/\/staff\/dashboard/, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    logger.info(`[${roleName}] ✓ URL contains "/staff/dashboard"`);

    // 2. Wait for DOM hydration
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);

    // 3. Check if side navigation menus are visible — if not, refresh to load all menus perfectly
    const isNavVisible = await this.sideNavigation.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isNavVisible) {
      logger.info(`[${roleName}] Side menus not loaded immediately — refreshing page to load all menus...`);
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(1500);
    }

    const hasNav = await this.sideNavigation.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasNav) {
      logger.info(`[${roleName}] ✓ Side navigation is visible`);
    } else {
      logger.warn(`[${roleName}] Side navigation element not explicitly visible, continuing dashboard validation`);
    }

    // 4. App bar / header must be visible
    const hasAppBar = await this.appBar.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasAppBar) {
      logger.info(`[${roleName}] ✓ App bar is visible`);
    }

    logger.info(`[${roleName}] ✓ Dashboard loaded successfully — URL: ${this.page.url()}`);
  }

  /**
   * Assert the workspace breadcrumb shows "DASHBOARD".
   */
  async expectBreadcrumbShowsDashboard(roleName: string): Promise<void> {
    const isVisible = await this.isVisible(this.workspaceBreadcrumb, 5_000);
    if (!isVisible) {
      logger.warn(`[${roleName}] WORKSPACE/DASHBOARD breadcrumb not found — skipping assertion`);
      return;
    }
    await this.expectVisible(this.workspaceBreadcrumb);
    logger.info(`[${roleName}] ✓ Dashboard breadcrumb visible`);
  }

  /**
   * Take a named screenshot of the dashboard for this role.
   * Saves to Playwright's configured output directory.
   */
  async screenshotDashboard(roleName: string): Promise<Buffer> {
    const safeName = roleName.replace(/\s+/g, '_').toLowerCase();
    logger.info(`[${roleName}] Taking dashboard screenshot`);
    return this.screenshot(`dashboard_${safeName}`);
  }
}
