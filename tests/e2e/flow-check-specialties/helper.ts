import fs from 'fs';
import path from 'path';
import { type Page, type TestInfo, expect } from '@playwright/test';
import { PatientPortalPage } from '../../../pages/patient-portal.page';
import { PatientBookingPage } from '../../../pages/patient-booking.page';
import { OmnivvaLoginPage } from '../../../pages/omnivva-login.page';
import { PortalDashboardPage } from '../../../pages/portal-dashboard.page';
import { RoleSliderPage } from '../../../pages/role-slider.page';
import { ReceptionistCheckinPage } from '../../../pages/receptionist-checkin.page';
import { DoctorQueuePage } from '../../../pages/doctor-queue.page';
import { logger } from '../../../utils/logger';
import testData from '../../../test-data/appointment-flow-data.json';

const TOKENS_FILE = path.resolve(process.cwd(), '.auth', 'flow-tokens.json');
const superuserPassword = process.env.SUPERUSER_PASSWORD || 'password123';
export const PATIENT_FULL_NAME = `${testData.patient.firstName} ${testData.patient.lastName}`;

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
 * Retrieve specialty configuration by slug or name
 */
export function getSpecialtyConfig(identifier: string): SpecialtyWorkflowConfig {
  const norm = identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = testData.specialties.find(
    (s) =>
      s.specialtySlug.toLowerCase().replace(/[^a-z0-9]/g, '') === norm ||
      s.specialtyName.toLowerCase().replace(/[^a-z0-9]/g, '') === norm
  );

  if (!found) {
    throw new Error(`Specialty configuration not found for identifier: "${identifier}"`);
  }
  return found as SpecialtyWorkflowConfig;
}

/**
 * Save confirmed appointment token for a specialty flow
 */
export function saveSpecialtyToken(slug: string, token: string): void {
  try {
    const dir = path.dirname(TOKENS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let tokens: Record<string, string> = {};
    if (fs.existsSync(TOKENS_FILE)) {
      try {
        tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
      } catch {
        tokens = {};
      }
    }
    tokens[slug] = token;
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
    logger.info(`[Flow Helper] Saved Token "${token}" for specialty "${slug}" to ${TOKENS_FILE}`);
  } catch (err) {
    logger.warn(`[Flow Helper] Could not persist token to disk: ${err}`);
  }
}

/**
 * Retrieve stored token for a specialty flow
 */
export function getSpecialtyToken(slug: string): string {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
      if (tokens[slug]) {
        return tokens[slug];
      }
    }
  } catch (err) {
    logger.warn(`[Flow Helper] Error reading stored token: ${err}`);
  }
  return 'C-001';
}

/**
 * Step 1: Patient Portal 6-Step Appointment Booking
 */
export async function bookPatientAppointment(
  page: Page,
  specialtySlug: string,
  testInfo: TestInfo
): Promise<string> {
  const config = getSpecialtyConfig(specialtySlug);
  logger.info(`=== [FLOW 1: PATIENT BOOKING] Starting for ${config.specialtyName} (${config.doctorName}) ===`);

  const patientPortal = new PatientPortalPage(page);
  const patientBooking = new PatientBookingPage(page);

  // 1. Login to Patient Portal
  await patientPortal.gotoLandingPage();
  await patientPortal.clickPatientLogin();
  await patientPortal.loginAsPatient(testData.patient.email, testData.patient.otp);
  await patientPortal.expectPatientDashboardLoaded();

  // 2. Navigate to Booking
  await patientBooking.navigateToBooking();

  // Step 1: Reason
  await patientBooking.step1_SelectReason(
    config.visitType || testData.booking.visitType,
    config.reasonForVisit || testData.booking.reasonForVisit
  );
  await testInfo.attach(`01_${config.specialtySlug}_Step1_Reason`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Step 2: Find Doctor (Facility & Specialty)
  await patientBooking.step2_FindDoctor(config.facility, config.specialtyName);
  await testInfo.attach(`02_${config.specialtySlug}_Step2_Find_Doctor`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Step 3: Select Doctor
  await patientBooking.step3_SelectDoctor(config.doctorName);
  await testInfo.attach(`03_${config.specialtySlug}_Step3_Select_Doctor`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Step 4: Date & Time
  await patientBooking.step4_SelectDateTime(config.slotTime || testData.booking.slotTime);
  await testInfo.attach(`04_${config.specialtySlug}_Step4_Date_Time`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Step 5: Patient Details & Symptoms
  await patientBooking.step5_FillPatientDetails({
    firstName: testData.patient.firstName,
    lastName: testData.patient.lastName,
    phone: testData.patient.phone,
    symptoms: config.symptoms || testData.booking.symptoms,
    additionalNotes: config.additionalNotes || testData.booking.additionalNotes,
  });
  await testInfo.attach(`05_${config.specialtySlug}_Step5_Patient_Details`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Step 6: Review & Pay (UPI / QR)
  await patientBooking.step6_ReviewAndPay(
    config.paymentMethod || testData.booking.paymentMethod,
    config.upiId || testData.booking.upiId
  );
  await testInfo.attach(`06_${config.specialtySlug}_Step6_Payment_UPI_QR`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Step 7: Confirmation — capture token number
  const details = await patientBooking.step7_VerifyConfirmation();
  const confirmedToken = details.tokenNumber || 'C-001';
  saveSpecialtyToken(config.specialtySlug, confirmedToken);

  await testInfo.attach(`07_${config.specialtySlug}_Step7_Token_${confirmedToken}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  logger.info(
    `=== [FLOW 1 SUCCESS] Confirmed Token: ${confirmedToken} for ${config.specialtyName} Doctor (${config.doctorName}) ===`
  );
  return confirmedToken;
}

/**
 * Step 2: Staff Portal Receptionist Check-In
 */
export async function checkInPatientAtReception(
  page: Page,
  specialtySlug: string,
  testInfo: TestInfo
): Promise<void> {
  const config = getSpecialtyConfig(specialtySlug);
  const token = getSpecialtyToken(config.specialtySlug);
  logger.info(
    `=== [FLOW 2: RECEPTIONIST CHECK-IN] Starting for ${config.specialtyName} (Token: ${token}) ===`
  );

  const loginPage = new OmnivvaLoginPage(page);
  const dashboardPage = new PortalDashboardPage(page);
  const roleSlider = new RoleSliderPage(page);
  const receptionistPage = new ReceptionistCheckinPage(page);

  // 1. Staff Login
  const staffUsername = config.staffUsername || testData.staff?.username || 'qa@omnivva.com';
  const staffPassword = testData.staff?.password || superuserPassword || 'password123';
  await loginPage.gotoLandingPage();
  await loginPage.clickStaffLogin();
  await loginPage.login(staffUsername, staffPassword);
  await dashboardPage.expectDashboardLoaded('Staff');

  // 2. Switch to Receptionist role
  logger.info(`--- Switching to Receptionist role under ${staffUsername} ---`);
  await roleSlider.switchToRole(testData.staff.roles.receptionist);
  await dashboardPage.expectDashboardLoaded(testData.staff.roles.receptionist);
  await testInfo.attach(`08_${config.specialtySlug}_Receptionist_Dashboard`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // 3. Navigate to Check-In Screen
  await receptionistPage.navigateToCheckInQueue();
  await testInfo.attach(`09_${config.specialtySlug}_Receptionist_CheckIn_Screen`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // 4. Check in the patient booked in Flow 1
  await receptionistPage.checkInPatientByName(PATIENT_FULL_NAME, token);
  await testInfo.attach(`10_${config.specialtySlug}_Receptionist_Patient_CheckedIn`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  logger.info(
    `=== [FLOW 2 SUCCESS] Patient "${PATIENT_FULL_NAME}" checked in — Token: ${token} ===`
  );
}

/**
 * Step 3: Staff Portal Doctor Queue & Consultation
 */
export async function consultPatientByDoctor(
  page: Page,
  specialtySlug: string,
  testInfo: TestInfo
): Promise<void> {
  const config = getSpecialtyConfig(specialtySlug);
  const token = getSpecialtyToken(config.specialtySlug);
  logger.info(
    `=== [FLOW 3: DOCTOR CONSULTATION] Starting for ${config.specialtyName} (${config.staffUsername}) — Token: ${token} ===`
  );

  const loginPage = new OmnivvaLoginPage(page);
  const dashboardPage = new PortalDashboardPage(page);
  const roleSlider = new RoleSliderPage(page);
  const doctorQueue = new DoctorQueuePage(page);

  // 1. Staff Login
  const staffUsername = config.staffUsername || testData.staff?.username || 'qa@omnivva.com';
  const staffPassword = testData.staff?.password || superuserPassword || 'password123';
  await loginPage.gotoLandingPage();
  await loginPage.clickStaffLogin();
  await loginPage.login(staffUsername, staffPassword);
  await dashboardPage.expectDashboardLoaded('Staff');

  // 2. Switch to Doctor role
  logger.info(`--- Switching to ${config.specialtyName} Doctor role for Consultation ---`);
  await roleSlider.switchToRole(testData.staff.roles.doctor);

  // 3. Navigate to Doctor Console
  await doctorQueue.navigateToDoctorQueue();

  // 4. Verify patient shows in Doctor Console OPD queue
  const isInQueue = await doctorQueue.verifyPatientInConsultationQueue(
    token,
    testData.statuses.checkedIn
  );
  expect(isInQueue).toBeTruthy();
  await testInfo.attach(`11_${config.specialtySlug}_Doctor_Console_Queue`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // 5. Perform Full Consultation Wizard
  const diagnosis = config.diagnosis || testData.consultation?.diagnosis || 'General Consultation Completed';
  await doctorQueue.performFullConsultation({
    diagnosis,
    chiefComplaint: config.symptoms || config.reasonForVisit || testData.booking.symptoms,
    referredBy: config.referredBy || testData.consultation?.referredBy || 'Self / Dr. Referral',
    icd10Code: config.icd10Code || testData.consultation?.icd10Code || 'Z00.00',
    treatmentPlan:
      config.treatmentPlan ||
      testData.consultation?.treatmentPlan ||
      'Standard OPD medications prescribed, lifestyle modifications, adequate hydration.',
    procedure: config.procedure,
    quantityOrDays: config.quantityOrDays,
    prescription: config.prescription,
    imagingFindings:
      config.imagingFindings ||
      testData.consultation?.imagingFindings ||
      'MRI / CT study reviewed: Normal scan with no acute focal abnormalities.',
    plan: config.plan || testData.consultation?.plan || 'Conservative Medical Management',
    injection: config.injection || testData.consultation?.injection || 'None',
    scheduleNextVisit:
      config.scheduleNextVisit || testData.consultation?.scheduleNextVisit || '2026-08-26',
    doctorNotes:
      config.doctorNotes ||
      testData.consultation?.doctorNotes ||
      'Patient counseled on clinical findings, medication adherence, and follow-up.',
    startIndex: 0,
    wizardNextClicks: config.wizardNextClicks || 2,
  });

  await testInfo.attach(`12_${config.specialtySlug}_Doctor_Consultation_Completed`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  logger.info(
    `=== [FLOW 3 SUCCESS] ${config.specialtyName} Consultation completed — Diagnosis: "${diagnosis}" — Token: ${token} ===`
  );
}
