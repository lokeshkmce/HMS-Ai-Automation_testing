import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

/**
 * RoleSliderPage — Omnivva HMS Role Switcher drawer component.
 */
export class RoleSliderPage extends BasePage {
  readonly roleSliderTab: Locator;

  constructor(page: Page) {
    super(page);
    this.roleSliderTab = page.locator('button:has-text("Role Slider"), [aria-label*="Role Slider" i], [title*="Role Slider" i], button:has-text("Role")').first();
  }

  /**
   * Open the Role Slider drawer panel (via profile Switch Role or right tab).
   */
  async openPanel(): Promise<void> {
    logger.info('Opening Role Slider drawer...');

    // 1. Check if Switch Role button is already visible in open dropdown
    const switchRoleBtn = this.page.getByRole('button', { name: /switch role/i });
    if (await switchRoleBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await switchRoleBtn.click();
      await this.page.waitForTimeout(600);
      logger.info('Role Slider drawer opened via Switch Role button.');
      return;
    }

    // 2. Try header profile button (e.g. "QA neurosurgery STAFF QN", "QA cardiosurgery", etc.) to click "Switch Role"
    const profileBtn = this.page.locator('header button, header [role="button"]').filter({ hasText: /QA|STAFF|Receptionist|Doctor|Roles|Admin/i }).first();
    if (await profileBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileBtn.click();
      await this.page.waitForTimeout(500);
      const switchRoleMenu = this.page.locator('button:has-text("Switch Role"), [role="menuitem"]:has-text("Switch Role"), [role="button"]:has-text("Switch Role")').first();
      if (await switchRoleMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
        await switchRoleMenu.click();
        await this.page.waitForTimeout(600);
        logger.info('Role Slider drawer opened via Profile -> Switch Role.');
        return;
      }
    }

    // 3. Right-side Role Slider vertical tab
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const isVisible = await this.roleSliderTab.isVisible().catch(() => false);
        if (!isVisible) {
          await this.roleSliderTab.waitFor({ state: 'attached', timeout: 4000 });
        }
        await this.roleSliderTab.click({ force: true });
        await this.page.waitForTimeout(600);
        logger.info('Role Slider drawer opened via Role Slider tab.');
        return;
      } catch {
        logger.info(`Role Slider tab not ready on attempt ${attempt} — refreshing page...`);
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(1500);
      }
    }

    // Final fallback click
    await this.roleSliderTab.click({ force: true });
    await this.page.waitForTimeout(600);
    logger.info('Role Slider drawer opened.');
  }

  /**
   * Select a role by clicking its button in the open drawer.
   */
  async selectRole(roleName: string): Promise<void> {
    logger.info(`Selecting role: "${roleName}"`);
    await this.openPanel();

    const roleBtn = this.page.locator('button').filter({ hasText: new RegExp(`^\\s*${roleName}\\s*$`, 'i') }).first();
    await roleBtn.waitFor({ state: 'attached', timeout: 10000 });
    await roleBtn.scrollIntoViewIfNeeded().catch(() => null);
    try {
      await roleBtn.click({ force: true, timeout: 3000 });
    } catch {
      logger.info(`Clicking role "${roleName}" via DOM dispatch fallback...`);
      await roleBtn.evaluate((el: any) => el.click());
    }
    logger.info(`Clicked role "${roleName}"`);
  }

  /**
   * Switch to a role and wait for the new dashboard to load.
   */
  async switchToRole(roleName: string): Promise<string> {
    await this.selectRole(roleName);

    // Wait for the new role dashboard to stabilize
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);

    const currentUrl = this.page.url();
    logger.info(`Switched to [${roleName}] — URL: ${currentUrl}`);
    return currentUrl;
  }
}
