import { test, expect } from '../../fixtures/base.fixture';
import { type Browser, type TestInfo } from '@playwright/test';
import { PatientPortalPage } from '../../pages/patient-portal.page';
import { PatientBookingPage } from '../../pages/patient-booking.page';
import { OmnivvaLoginPage } from '../../pages/omnivva-login.page';
import { PortalDashboardPage } from '../../pages/portal-dashboard.page';
import { RoleSliderPage } from '../../pages/role-slider.page';
import { ReceptionistCheckinPage } from '../../pages/receptionist-checkin.page';
import { DoctorQueuePage } from '../../pages/doctor-queue.page';
import { logger } from '../../utils/logger';
import testData from '../../test-data/appointment-flow-data.json';

const superuserPassword = process.env.SUPERUSER_PASSWORD || 'password123';
const PATIENT_FULL_NAME = `${testData.patient.firstName} ${testData.patient.lastName}`;

export interface SpecialtyWorkflowConfig {
  id: string;
  specialtyName: string;
  specialtySlug: string;
  doctorName: string;
  staffUsername: string;
  facility: string;
  visitType?: string;
  reasonForVisit?: string;
  slotTime?: string;
  symptoms?: string;
  additionalNotes?: string;
  paymentMethod?: string;
  upiId?: string;
  diagnosis?: string;
  chiefComplaint?: string;
  referredBy?: string;
  icd10Code?: string;
  treatmentPlan?: string;
  imagingFindings?: string;
  doctorNotes?: string;
  plan?: string;
  injection?: string;
  scheduleNextVisit?: string;
  procedure?: string;
  quantityOrDays?: string;
  prescription?: {
    drugQuery?: string;
    drugName?: string;
    dosage?: string;
    frequency?: string;
    clinicalAdvice?: string;
  };
  wizardNextClicks?: number;
  tag?: string;
}

/**
 * Reusable End-to-End Specialty Appointment Booking, Receptionist Check-in, and Doctor Consultation Lifecycle.
 *
 * Flow 1 -> Patient Portal: 6-Step Appointment Booking (Reason -> Find Doctor -> Select Doctor -> Date & Time -> Details -> Payment)
 * Flow 2 -> Staff Portal (Matching Specialty Login): Switch to Receptionist -> Check-In Screen -> Check In Patient
 * Flow 3 -> Staff Portal (Matching Specialty Login): Switch to Doctor -> Doctor Console -> Consultation Wizard -> Submit
 */
async function runSpecialtyAppointmentLifecycle(
  browser: Browser,
  testInfo: TestInfo,
  config: SpecialtyWorkflowConfig
): Promise<void> {
  testInfo.annotations.push({
    type: 'Specialty E2E Workflow',
    description:
      `Patient books appointment for ${config.specialtyName} (${config.doctorName}) at ${config.facility}. ` +
      `Staff Portal logs in as ${config.staffUsername}, Receptionist checks in patient, and ${config.specialtyName} Doctor completes consultation.`,
  });

  let confirmedToken = 'C-001';
  const rootVideos: { name: string; path: string }[] = [];
  const rootScreenshots: { name: string; buffer: Buffer }[] = [];

  // ──────────────────────────────────────────────────────────────────────────
  // FLOW 1 — PATIENT PORTAL: 6-Step Appointment Booking
  // ──────────────────────────────────────────────────────────────────────────
  await test.step(
    `Flow 1: Patient Portal — 6-Step Appointment Booking for ${config.specialtyName} (${config.doctorName})`,
    async () => {
      logger.info(`=== [FLOW 1 START] Patient Booking for ${config.specialtyName} (${config.doctorName}) ===`);

      const patientContext = await browser.newContext({
        recordVideo: { dir: './reports/test-results/videos/' },
        viewport: { width: 1280, height: 720 },
      });
      const patientPage = await patientContext.newPage();

      try {
        const patientPortal = new PatientPortalPage(patientPage);
        const patientBooking = new PatientBookingPage(patientPage);

        // 1.1 — Login to Patient Portal
        await patientPortal.gotoLandingPage();
        await patientPortal.clickPatientLogin();
        await patientPortal.loginAsPatient(testData.patient.email, testData.patient.otp);
        await patientPortal.expectPatientDashboardLoaded();

        // 1.2 — Navigate to Book Doctor
        await patientBooking.navigateToBooking();

        // Step 1: Reason
        await patientBooking.step1_SelectReason(
          config.visitType || testData.booking.visitType,
          config.reasonForVisit || testData.booking.reasonForVisit
        );
        rootScreenshots.push({
          name: `01_${config.specialtySlug}_Step1_Reason`,
          buffer: await patientPage.screenshot(),
        });

        // Step 2: Find Doctor (Facility & Specialty)
        await patientBooking.step2_FindDoctor(config.facility, config.specialtyName);
        rootScreenshots.push({
          name: `02_${config.specialtySlug}_Step2_Find_Doctor`,
          buffer: await patientPage.screenshot(),
        });

        // Step 3: Select Doctor
        await patientBooking.step3_SelectDoctor(config.doctorName);
        rootScreenshots.push({
          name: `03_${config.specialtySlug}_Step3_Select_Doctor`,
          buffer: await patientPage.screenshot(),
        });

        // Step 4: Date & Time
        await patientBooking.step4_SelectDateTime(config.slotTime || testData.booking.slotTime);
        rootScreenshots.push({
          name: `04_${config.specialtySlug}_Step4_Date_Time`,
          buffer: await patientPage.screenshot(),
        });

        // Step 5: Patient Details & Symptoms
        await patientBooking.step5_FillPatientDetails({
          firstName: testData.patient.firstName,
          lastName: testData.patient.lastName,
          phone: testData.patient.phone,
          symptoms: config.symptoms || testData.booking.symptoms,
          additionalNotes: config.additionalNotes || testData.booking.additionalNotes,
        });
        rootScreenshots.push({
          name: `05_${config.specialtySlug}_Step5_Patient_Details`,
          buffer: await patientPage.screenshot(),
        });

        // Step 6: Review & Pay (UPI / QR)
        await patientBooking.step6_ReviewAndPay(
          config.paymentMethod || testData.booking.paymentMethod,
          config.upiId || testData.booking.upiId
        );
        rootScreenshots.push({
          name: `06_${config.specialtySlug}_Step6_Payment_UPI_QR`,
          buffer: await patientPage.screenshot(),
        });

        // Step 7: Confirmation — capture token number
        const details = await patientBooking.step7_VerifyConfirmation();
        confirmedToken = details.tokenNumber;
        rootScreenshots.push({
          name: `07_${config.specialtySlug}_Step7_Token_${confirmedToken}`,
          buffer: await patientPage.screenshot(),
        });

        logger.info(
          `=== [FLOW 1 SUCCESS] Confirmed Token: ${confirmedToken} for ${config.specialtyName} Doctor (${config.doctorName}) ===`
        );
      } finally {
        const video = patientPage.video();
        await patientContext.close();
        const videoPath = await video?.path().catch(() => null);
        if (videoPath) {
          rootVideos.push({
            name: `🎥 Flow 1: Patient Booking — ${config.specialtyName}`,
            path: videoPath,
          });
        }
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // FLOW 2 & 3 — STAFF PORTAL: Receptionist Check-In & Doctor Consultation
  // ──────────────────────────────────────────────────────────────────────────
  await test.step(
    `Flow 2 & 3: Staff Portal (${config.staffUsername}) — Receptionist Check-In & ${config.specialtyName} Doctor Consultation`,
    async () => {
      logger.info(
        `=== [FLOW 2 & 3 START] Staff Portal (${config.staffUsername}) for Token: ${confirmedToken} ===`
      );

      const staffContext = await browser.newContext({
        recordVideo: { dir: './reports/test-results/videos/' },
        viewport: { width: 1280, height: 720 },
      });
      const staffPage = await staffContext.newPage();

      try {
        const loginPage        = new OmnivvaLoginPage(staffPage);
        const dashboardPage    = new PortalDashboardPage(staffPage);
        const roleSlider       = new RoleSliderPage(staffPage);
        const receptionistPage = new ReceptionistCheckinPage(staffPage);
        const doctorQueue      = new DoctorQueuePage(staffPage);

        // 2.1 — Login as specialty-specific Staff account (e.g. qa.dental@omnivva.com)
        const staffUsername = config.staffUsername || testData.staff?.username || 'qa@omnivva.com';
        const staffPassword = testData.staff?.password || superuserPassword || 'password123';
        await loginPage.gotoLandingPage();
        await loginPage.clickStaffLogin();
        await loginPage.login(staffUsername, staffPassword);
        await dashboardPage.expectDashboardLoaded('Staff');

        // 2.2 — Switch to Receptionist role
        logger.info(`--- Switching to Receptionist role under ${staffUsername} ---`);
        await roleSlider.switchToRole(testData.staff.roles.receptionist);
        await dashboardPage.expectDashboardLoaded(testData.staff.roles.receptionist);
        rootScreenshots.push({
          name: `08_${config.specialtySlug}_Receptionist_Dashboard`,
          buffer: await staffPage.screenshot(),
        });

        // 2.3 — Navigate to Check-In Screen
        await receptionistPage.navigateToCheckInQueue();
        rootScreenshots.push({
          name: `09_${config.specialtySlug}_Receptionist_CheckIn_Screen`,
          buffer: await staffPage.screenshot(),
        });

        // 2.4 — Check in the patient booked in Flow 1
        await receptionistPage.checkInPatientByName(PATIENT_FULL_NAME, confirmedToken);
        rootScreenshots.push({
          name: `10_${config.specialtySlug}_Receptionist_Patient_CheckedIn`,
          buffer: await staffPage.screenshot(),
        });
        logger.info(
          `=== [FLOW 2 SUCCESS] Patient "${PATIENT_FULL_NAME}" checked in — Token: ${confirmedToken} ===`
        );

        // 3.1 — Switch to Doctor role directly via Role Slider
        logger.info(`--- Switching to ${config.specialtyName} Doctor role for Consultation ---`);
        await roleSlider.switchToRole(testData.staff.roles.doctor);

        // 3.2 — Navigate to Doctor Console
        await doctorQueue.navigateToDoctorQueue();

        // 3.3 — Verify patient shows in Doctor Console OPD queue
        const isInQueue = await doctorQueue.verifyPatientInConsultationQueue(
          confirmedToken,
          testData.statuses.checkedIn
        );
        expect(isInQueue).toBeTruthy();
        rootScreenshots.push({
          name: `11_${config.specialtySlug}_Doctor_Console_Queue`,
          buffer: await staffPage.screenshot(),
        });

        // 3.4 — Full 3-step consultation wizard:
        //        Step 1: Patient Details (Chief Complaint, Referred By)
        //        Step 2: Specialty Assessment (Assessment Dropdowns, Imaging MRI/CT Findings)
        //        Step 3: Diagnosis & Plan (Provisional Diagnosis, ICD-10, Treatment Plan, Procedure, Prescription, Next Visit, Notes, Submit)
        const diagnosis = config.diagnosis || testData.consultation?.diagnosis || 'General Consultation Completed';
        await doctorQueue.performFullConsultation({
          diagnosis,
          chiefComplaint: config.symptoms || config.reasonForVisit || testData.booking.symptoms,
          referredBy: config.referredBy || testData.consultation?.referredBy || 'Self / Dr. Referral',
          icd10Code: config.icd10Code || testData.consultation?.icd10Code || 'Z00.00',
          treatmentPlan: config.treatmentPlan || testData.consultation?.treatmentPlan || 'Standard OPD medications prescribed, lifestyle modifications, adequate hydration.',
          procedure: config.procedure,
          quantityOrDays: config.quantityOrDays,
          prescription: config.prescription,
          imagingFindings: config.imagingFindings || testData.consultation?.imagingFindings || 'MRI / CT study reviewed: Normal scan with no acute focal abnormalities.',
          plan: config.plan || testData.consultation?.plan || 'Conservative Medical Management',
          injection: config.injection || testData.consultation?.injection || 'None',
          scheduleNextVisit: config.scheduleNextVisit || testData.consultation?.scheduleNextVisit || '2026-08-26',
          doctorNotes: config.doctorNotes || testData.consultation?.doctorNotes || 'Patient counseled on clinical findings, medication adherence, and follow-up.',
          startIndex: 0,
          wizardNextClicks: config.wizardNextClicks || 2,
        });

        rootScreenshots.push({
          name: `12_${config.specialtySlug}_Doctor_Consultation_Completed`,
          buffer: await staffPage.screenshot(),
        });
        logger.info(
          `=== [FLOW 3 SUCCESS] ${config.specialtyName} Complete 3-Step Consultation completed — Diagnosis: "${diagnosis}" — Token: ${confirmedToken} ===`
        );
      } finally {
        const video = staffPage.video();
        await staffContext.close();
        const videoPath = await video?.path().catch(() => null);
        if (videoPath) {
          rootVideos.push({
            name: `🎥 Flows 2 & 3: Receptionist & Doctor — ${config.specialtyName}`,
            path: videoPath,
          });
        }
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // ATTACH ALL MEDIA TO ALLURE ROOT REPORT
  // ──────────────────────────────────────────────────────────────────────────
  for (const sc of rootScreenshots) {
    await testInfo.attach(sc.name, { body: sc.buffer, contentType: 'image/png' });
  }
  for (const v of rootVideos) {
    await testInfo.attach(v.name, { path: v.path, contentType: 'video/webm' });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Specialty-Driven Appointment Booking & Consultation Workflows
// Iterates across all 23 Doctor Specialties in the Omnivva HMS System
// ═════════════════════════════════════════════════════════════════════════════
test.describe('Omnivva HMS — All 23 Specialties End-to-End Appointment Booking & Consultation @e2e @specialties', () => {

  for (const specialty of testData.specialties) {
    test(
      `[${specialty.specialtyName}] ${specialty.id}: Complete Lifecycle ` +
      `(Patient Booking → Receptionist Check-In → ${specialty.specialtyName} Doctor Consultation) ${specialty.tag || ''}`,
      async ({ browser }, testInfo) => {
        test.setTimeout(300_000); // 5 minutes per full E2E workflow

        await runSpecialtyAppointmentLifecycle(browser, testInfo, specialty as SpecialtyWorkflowConfig);
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TC_SEC_TENANT_01 — Multi-Tenant Isolation Security Test
  // ═══════════════════════════════════════════════════════════════════════════
  test(
    'TC_SEC_TENANT_01: Multi-Tenant Security Isolation — ' +
    'Hospital records isolated from alternate branches @security @multi-tenant',
    async ({ omnivvaLoginPage, portalDashboardPage, roleSliderPage, page }, testInfo) => {
      test.setTimeout(90_000);

      testInfo.annotations.push({
        type: 'Security / Multi-Tenant Isolation',
        description:
          'Cross-tenant boundary test: Appointments cannot be queried or updated by other hospital branches.',
      });

      const receptionistPage = new ReceptionistCheckinPage(page);
      const mockToken = `C-${Math.floor(100 + Math.random() * 900)}`;

      await omnivvaLoginPage.gotoLandingPage();
      await omnivvaLoginPage.clickStaffLogin();
      await omnivvaLoginPage.login(testData.staff.username, superuserPassword);
      await portalDashboardPage.expectDashboardLoaded('Admin');

      await roleSliderPage.switchToRole('Receptionist');
      await portalDashboardPage.expectDashboardLoaded('Receptionist');

      await receptionistPage.navigateToCheckInQueue();

      const isIsolated = await receptionistPage.verifyTenantIsolation(
        testData.alternateHospital,
        mockToken
      );
      expect(isIsolated).toBe(true);

      const screenshotBuf = await page.screenshot({ fullPage: false });
      await testInfo.attach('security-multi-tenant-isolation', {
        body: screenshotBuf,
        contentType: 'image/png',
      });
    }
  );
});
