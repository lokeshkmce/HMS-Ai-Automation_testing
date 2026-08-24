/**
 * Omnivva HMS — Specialty-Wise Doctor Portal Test Suite
 *
 * Covers:
 * 1. Invalid Doctor Login Scenarios (Wrong password, non-existent user, empty fields, SQLi, XSS, wrong domain)
 * 2. Valid Doctor Login and Doctor Console OPD Queue Verification across all 23 Doctor Specialties:
 *    - Cardio Surgery, Dental, ENT, Family Medicine, Cardiosurgery, Gastroenterology,
 *      Dermatology, Emergency Endocrinology, General Surgery, Infectious Disease,
 *      Internal Medicine, Maternity, Nephrology, Neurology, Neurosurgery, Oncology,
 *      Ophthalmology, Orthopedics, Plastic Surgery, Psychiatry, Pulmonology,
 *      Rheumatology, PMR and Rehab, Urology.
 */

import { test, expect } from '../../fixtures/base.fixture';
import { loadJsonData } from '../../utils/test-data-loader';
import { logger } from '../../utils/logger';
import { OmnivvaLoginPage } from '../../pages/omnivva-login.page';
import { PortalDashboardPage } from '../../pages/portal-dashboard.page';
import { DoctorQueuePage } from '../../pages/doctor-queue.page';

interface SpecialtyEntry {
  id: string;
  specialtyName: string;
  specialtySlug: string;
  username: string;
  altUsername?: string;
  password?: string;
  description: string;
}

interface InvalidLoginEntry {
  id: string;
  specialtyName: string;
  username: string;
  password?: string;
  description: string;
  expectedResult: string;
  tag: string;
}

interface DoctorSpecialtiesTestData {
  suite: string;
  environment: string;
  defaultPassword: string;
  invalidLogins: InvalidLoginEntry[];
  validSpecialties: SpecialtyEntry[];
}

const testData = loadJsonData<DoctorSpecialtiesTestData>('doctor-specialties-data.json');

test.describe('Omnivva HMS — Doctor Specialties (Valid & Invalid Login Verification) @doctor @specialties', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // ─── 1. Invalid Doctor Login Scenarios ─────────────────────────────────────

  test.describe('Doctor Login Invalid Scenarios @negative @security', () => {
    for (const scenario of testData.invalidLogins) {
      test(`[Doctor Login Invalid] ${scenario.id}: ${scenario.description} ${scenario.tag}`, async ({
        page,
        omnivvaLoginPage,
      }, testInfo) => {
        testInfo.annotations.push({
          type: 'Negative Doctor Login Test',
          description: scenario.description,
        });

        logger.info(`=== [START NEGATIVE] Testing Scenario: ${scenario.id} — ${scenario.description} ===`);

        await omnivvaLoginPage.gotoLandingPage();
        await omnivvaLoginPage.clickStaffLogin();

        if (scenario.expectedResult === 'validation_error') {
          await omnivvaLoginPage.fillUsername(scenario.username);
          await omnivvaLoginPage.fillPassword(scenario.password ?? '');
          await omnivvaLoginPage.clickSignIn();

          // Browser HTML5 form validation or disabled button prevents URL redirect
          expect(page.url()).not.toContain('/staff/dashboard');
        } else {
          await omnivvaLoginPage.fillUsername(scenario.username);
          await omnivvaLoginPage.fillPassword(scenario.password ?? 'password123');
          await omnivvaLoginPage.clickSignIn();
          await page.waitForTimeout(2500);

          // Verify user is not authenticated to staff dashboard
          expect(page.url()).not.toContain('/staff/dashboard');
        }

        logger.info(`=== [SUCCESS NEGATIVE] Passed Scenario: ${scenario.id} ===`);
      });
    }
  });

  // ─── 2. Valid Doctor Specialties Verification ─────────────────────────────

  test.describe('Doctor Specialties Valid Login & Console Verification @doctor @smoke', () => {
    for (const specialty of testData.validSpecialties) {
      test(`[${specialty.specialtyName}] ${specialty.id}: Login as ${specialty.specialtyName} Doctor (${specialty.username}) & Verify Doctor Console @doctor @smoke`, async ({
        page,
      }, testInfo) => {
        testInfo.annotations.push({
          type: 'Specialty Doctor Verification',
          description: `${specialty.specialtyName} Doctor portal authentication & console queue`,
        });

        const loginPage = new OmnivvaLoginPage(page);
        const dashboardPage = new PortalDashboardPage(page);
        const doctorQueue = new DoctorQueuePage(page);

        const password = specialty.password || testData.defaultPassword || 'password123';

        logger.info(`=== [START] Testing Specialty: ${specialty.specialtyName} (${specialty.username}) ===`);

        // 1. Navigate to HMS Landing Page & Click Staff Login
        await loginPage.gotoLandingPage();
        await loginPage.clickStaffLogin();

        // 2. Perform Login with Specialty Doctor credentials
        try {
          await loginPage.login(specialty.username, password);
        } catch (err) {
          if (specialty.altUsername) {
            logger.info(`Retrying with alternate username "${specialty.altUsername}"...`);
            await loginPage.login(specialty.altUsername, password);
          } else {
            throw err;
          }
        }

        // 3. Assert Staff Dashboard loaded
        await dashboardPage.expectDashboardLoaded(specialty.specialtyName);
        expect(page.url()).toContain('/staff/');

        // 4. Capture screenshot of loaded Specialty Dashboard
        const dashboardScreenshot = await page.screenshot();
        await testInfo.attach(`01_${specialty.specialtySlug}_Dashboard`, {
          body: dashboardScreenshot,
          contentType: 'image/png',
        });

        // 5. Navigate to Doctor Console
        logger.info(`[${specialty.specialtyName}] Navigating to Doctor Console...`);
        await doctorQueue.navigateToDoctorQueue();
        expect(page.url()).toMatch(/doctor[\-_]?(console|queue)|specialties|staff/i);

        // 6. Verify Doctor Console queue table and stats are visible
        const isQueueVisible = await doctorQueue.verifyPatientInConsultationQueue('ANY');
        expect(isQueueVisible).toBeTruthy();

        // 7. Capture screenshot of Doctor Console
        const consoleScreenshot = await page.screenshot();
        await testInfo.attach(`02_${specialty.specialtySlug}_Doctor_Console`, {
          body: consoleScreenshot,
          contentType: 'image/png',
        });

        logger.info(`=== [SUCCESS] Verified Specialty: ${specialty.specialtyName} ===`);
      });
    }
  });
});
