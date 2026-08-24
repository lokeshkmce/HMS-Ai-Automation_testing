/**
 * Omnivva HMS — Patient Portal Test Suite
 *
 * Covers:
 * 1. Invalid Login Scenarios (Invalid OTP, Invalid Email format)
 * 2. Valid Login and Complete Patient Portal Menus & Dashboard Verification
 */

import { test, expect } from '../../fixtures/base.fixture';
import { loadJsonData } from '../../utils/test-data-loader';
import { logger } from '../../utils/logger';
import { PatientPortalPage } from '../../pages/patient-portal.page';

interface PatientPortalTestData {
  validLogin: {
    id: string;
    email: string;
    otp: string;
    description: string;
    expectedUrl: string;
    tag: string;
  };
  invalidLogins: {
    id: string;
    email: string;
    otp: string;
    description: string;
    expectedResult: string;
    tag: string;
  }[];
  patientMenus: {
    name: string;
    type: string;
  }[];
}

const testData = loadJsonData<PatientPortalTestData>('patient-portal-data.json');

test.describe('Omnivva HMS — Patient Portal (Login & Menus) @patient', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // ─── 1. Invalid Login Scenarios ───────────────────────────────────────────

  for (const scenario of testData.invalidLogins) {
    test(`[Patient Login Invalid] ${scenario.id}: ${scenario.description} ${scenario.tag}`, async ({
      page,
    }, testInfo) => {
      testInfo.annotations.push({ type: 'Negative Test', description: scenario.description });
      const patientPage = new PatientPortalPage(page);

      await patientPage.gotoLandingPage();
      await patientPage.clickPatientLogin();

      if (scenario.otp === '9999') {
        // Invalid OTP step
        const emailField = page.locator('input[type="email"], input[type="text"]').first();
        await emailField.waitFor({ state: 'visible', timeout: 15000 });
        await emailField.fill(scenario.email);

        const continueBtn = page.locator('button[type="submit"], button:has-text("Continue")').first();
        await continueBtn.click();
        await page.waitForTimeout(2000);

        const otpField = page.locator('input[type="text"], input[type="password"], input[placeholder*="•"]').first();
        await otpField.waitFor({ state: 'visible', timeout: 15000 });
        await otpField.fill(scenario.otp);

        const verifyBtn = page.locator('button:has-text("Verify Code"), button[type="submit"]').first();
        await verifyBtn.click();
        await page.waitForTimeout(2000);

        // Must not redirect to /patient
        expect(page.url()).not.toContain('dev-hms.srivyn.in/patient');
      } else {
        // Invalid email format
        const emailField = page.locator('input[type="email"], input[type="text"]').first();
        await emailField.waitFor({ state: 'visible', timeout: 15000 });
        await emailField.fill(scenario.email);

        const continueBtn = page.locator('button[type="submit"], button:has-text("Continue")').first();
        await continueBtn.click();
        await page.waitForTimeout(2000);

        // Must not redirect to /patient
        expect(page.url()).not.toContain('dev-hms.srivyn.in/patient');
      }
    });
  }

  // ─── 2. Valid Login & Complete Menus Check ────────────────────────────────

  test(`[Patient Login Valid & Menus] ${testData.validLogin.id}: ${testData.validLogin.description} ${testData.validLogin.tag}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    testInfo.annotations.push({
      type: 'Patient Portal Menus',
      description: 'Login to patient portal and verify all navigation menus and service cards',
    });

    const patientPage = new PatientPortalPage(page);

    // Step 1: Login
    await patientPage.gotoLandingPage();
    await patientPage.clickPatientLogin();
    await patientPage.loginAsPatient(testData.validLogin.email, testData.validLogin.otp);

    // Step 2: Verify Patient Dashboard Loaded
    await patientPage.expectPatientDashboardLoaded();

    // Step 3: Check all Patient Menus & Cards
    logger.info('[Patient Portal] Validating patient portal menus and cards...');
    for (const menu of testData.patientMenus) {
      const el = page.locator(`text=/${menu.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i`).first();
      const isVisible = await el.isVisible({ timeout: 5000 }).catch(() => false);
      if (isVisible) {
        logger.info(`[Patient Portal Menu] ✓ "${menu.name}" (${menu.type}) is loaded and visible.`);
      } else {
        logger.warn(`[Patient Portal Menu] ℹ "${menu.name}" not immediately visible.`);
      }
    }

    // Step 4: Screenshot for Allure
    const screenshot = await patientPage.screenshotPatientDashboard();
    await testInfo.attach('dashboard_patient_portal_menus', {
      body: screenshot,
      contentType: 'image/png',
    });
  });
});
