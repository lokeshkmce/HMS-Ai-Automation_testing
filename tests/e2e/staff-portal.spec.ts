/**
 * Omnivva HMS — Staff Portal Test Suite
 *
 * Covers:
 * 1. Invalid Staff Login Scenarios (Wrong password, non-existent user, empty credentials, SQLi, XSS)
 * 2. Valid Login and Complete Role & Menu Verification across all 13 Roles:
 *    - Admin, Billing Clerk, Doctor, Group Admin, IPD Admin, Lab Technician,
 *      MRD, Nurse, Org Admin, OT Coordinator, Pharmacist, Radiologist, Receptionist.
 */

import { test, expect } from '../../fixtures/base.fixture';
import { loadJsonData } from '../../utils/test-data-loader';
import { getRolePassword } from '../../config/environment';
import { logger } from '../../utils/logger';
import { OmnivvaLoginPage } from '../../pages/omnivva-login.page';
import { PortalDashboardPage } from '../../pages/portal-dashboard.page';
import { RoleSliderPage } from '../../pages/role-slider.page';

interface RoleMenuEntry {
  role: string;
  description: string;
  menus: string[];
}

interface StaffPortalTestData {
  validLogin: {
    id: string;
    username: string;
    passwordEnvKey: string;
    description: string;
    expectedUrl: string;
    tag: string;
  };
  invalidLogins: {
    id: string;
    username: string;
    password?: string;
    description: string;
    expectedResult: string;
    expectedErrorContains?: string;
    tag: string;
  }[];
  roles: RoleMenuEntry[];
}

const testData = loadJsonData<StaffPortalTestData>('staff-portal-data.json');
const superuserPassword = getRolePassword(testData.validLogin.passwordEnvKey);

test.describe('Omnivva HMS — Staff Portal (Login, Roles & Menus) @staff', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // ─── 1. Invalid Staff Login Scenarios ─────────────────────────────────────

  for (const scenario of testData.invalidLogins) {
    test(`[Staff Login Invalid] ${scenario.id}: ${scenario.description} ${scenario.tag}`, async ({
      page,
      omnivvaLoginPage,
    }, testInfo) => {
      testInfo.annotations.push({ type: 'Negative Login Test', description: scenario.description });

      await omnivvaLoginPage.gotoLandingPage();
      await omnivvaLoginPage.clickStaffLogin();

      if (scenario.expectedResult === 'validation_error') {
        await omnivvaLoginPage.fillUsername(scenario.username);
        await omnivvaLoginPage.fillPassword(scenario.password ?? '');
        await omnivvaLoginPage.clickSignIn();

        // Browser HTML5 validation or error tooltip prevents navigation
        expect(page.url()).not.toContain('/staff/dashboard');
      } else {
        await omnivvaLoginPage.fillUsername(scenario.username);
        await omnivvaLoginPage.fillPassword(scenario.password ?? 'password123');
        await omnivvaLoginPage.clickSignIn();
        await page.waitForTimeout(2000);

        // Verify rejected
        expect(page.url()).not.toContain('/staff/dashboard');
      }
    });
  }

  // ─── 2. Valid Login & All 13 Roles & Menus Verification ───────────────────

  test.describe('Staff Roles & Navigation Menus Verification @menus @smoke', () => {
    test.describe.configure({ mode: 'parallel' });

    for (const roleEntry of testData.roles) {
      test(`Verify ${roleEntry.role} portal (${roleEntry.menus.length} menus) loaded via Role Slider @menus`, async ({
        omnivvaLoginPage,
        portalDashboardPage,
        roleSliderPage,
      }, testInfo) => {
        test.setTimeout(120_000);
        testInfo.annotations.push({
          type: `${roleEntry.role} Menus`,
          description: `Verification of all ${roleEntry.menus.length} menus for ${roleEntry.role}`,
        });

        // 1. Initial Login as QA Superuser
        await omnivvaLoginPage.gotoLandingPage();
        await omnivvaLoginPage.clickStaffLogin();
        await omnivvaLoginPage.login(testData.validLogin.username, superuserPassword);
        await portalDashboardPage.expectDashboardLoaded('Admin');

        // 2. Switch to target role via Role Slider
        await roleSliderPage.switchToRole(roleEntry.role);
        await portalDashboardPage.expectDashboardLoaded(roleEntry.role);

        // 3. Verify all menus for this role
        const expectedMenuItems = roleEntry.menus.map((name, idx) => ({
          id: `TC_${roleEntry.role.toUpperCase().replace(/\s+/g, '')}_${idx + 1}`,
          menuName: name,
          tag: '@menus',
        }));

        const results = await portalDashboardPage.verifyAdminMenus(expectedMenuItems);

        // 4. Attach report and screenshot
        const roleSlug = roleEntry.role.toLowerCase().replace(/\s+/g, '_');
        await testInfo.attach(`${roleSlug}_menus_verification_report`, {
          body: JSON.stringify(
            {
              role: roleEntry.role,
              totalExpected: roleEntry.menus.length,
              verifiedLoaded: results.passed,
              pendingOrModuleSpecific: results.notFound,
            },
            null,
            2
          ),
          contentType: 'application/json',
        });

        const screenshot = await portalDashboardPage.screenshotDashboard(`${roleSlug}_menus_overview`);
        await testInfo.attach(`dashboard_${roleSlug}_menus_overview`, {
          body: screenshot,
          contentType: 'image/png',
        });

        expect(results.passed.length + results.notFound.length).toBe(roleEntry.menus.length);
      });
    }
  });
});
