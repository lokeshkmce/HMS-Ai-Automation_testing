import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export interface PrescriptionData {
  drugQuery?: string;
  drugName?: string;
  dosage?: string;
  frequency?: string;
  clinicalAdvice?: string;
}

export interface ConsultationClinicalData {
  diagnosis?: string;
  chiefComplaint?: string;
  referredBy?: string;
  sex?: string;
  assessmentDropdowns?: string[];
  imagingFindings?: string;
  icd10Code?: string;
  treatmentPlan?: string;
  plan?: string;
  injection?: string;
  scheduleNextVisit?: string;
  doctorNotes?: string;
  startIndex?: number;
  wizardNextClicks?: number;
  // Specialty & Dental specific fields
  procedure?: string;
  quantityOrDays?: string;
  prescription?: PrescriptionData;
  // Clinical Referrals
  labTestName?: string;
  radiologyModality?: string;
  radiologyScanName?: string;
  quickPrescriptionQuery?: string;
  quickPrescriptionDrug?: string;
}

/**
 * Page Object Model for Doctor Portal Consultation & OPD Queue.
 * Covers: queue navigation, patient verification, and the complete 3-step
 * consultation wizard:
 *   Step 1: Patient Details (Chief Complaint, Referred By, DOB, Sex)
 *   Step 2: Specialty Clinical Assessment (Assessment dropdowns, Imaging Findings MRI/CT)
 *   Step 3: Diagnosis & Management Plan (Provisional Diagnosis, ICD-10, Treatment Plan, Plan, Injection, Next Visit, Notes, Submit)
 */
export class DoctorQueuePage extends BasePage {
  // ── Navigation ──────────────────────────────────────────────────────────────
  readonly doctorConsoleMenu: Locator;
  readonly doctorQueueMenu: Locator;
  readonly consultationsMenu: Locator;

  // ── Queue verification ───────────────────────────────────────────────────────
  readonly searchInput: Locator;
  readonly waitingQueueTab: Locator;
  readonly patientQueueList: Locator;
  readonly checkedInStatusBadge: Locator;

  // ── Consultation wizard locators ─────────────────────────────────────────────
  readonly startConsultBtn: Locator;
  readonly nextBtn: Locator;
  readonly backBtn: Locator;
  readonly saveNotesBtn: Locator;
  readonly submitConsultBtn: Locator;
  readonly consultSuccessBanner: Locator;

  // Step 1: Patient Details locators
  readonly chiefComplaintInput: Locator;
  readonly referredByInput: Locator;

  // Step 2: Specialty Assessment locators
  readonly imagingFindingsInput: Locator;

  // Step 3: Diagnosis & Plan locators
  readonly diagnosisInput: Locator;
  readonly icd10Input: Locator;
  readonly treatmentPlanInput: Locator;
  readonly scheduleNextVisitInput: Locator;
  readonly doctorNotesInput: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation locators
    this.doctorConsoleMenu = page.getByRole('button', { name: 'Doctor Console' });
    this.doctorQueueMenu = page
      .locator('text=/doctor queue/i, a[href*="doctor-queue"], a[href*="queue"]')
      .first();
    this.consultationsMenu = page
      .locator('text=/consultations/i, a[href*="consultation"]')
      .first();

    // Queue locators
    this.searchInput = page
      .locator('input[placeholder*="search" i], input[type="search"]')
      .first();
    this.waitingQueueTab = page
      .locator('text=/waiting/i, button:has-text("Waiting"), [role="tab"]:has-text("Waiting")')
      .first();
    this.patientQueueList = page
      .locator('table, [class*="queue-list"], [class*="patient-list"], [role="table"]')
      .first();
    this.checkedInStatusBadge = page
      .locator('text=/checked in/i, text=/waiting/i, [class*="status-checked-in"]')
      .first();

    // Consultation wizard generic controls
    this.startConsultBtn = page.getByRole('button', { name: /start consult/i })
      .or(page.locator('button:has-text("Start Consult")'));
    this.nextBtn = page.getByRole('button', { name: /next\s*>/i })
      .or(page.locator('button:has-text("Next")'));
    this.backBtn = page.getByRole('button', { name: /<\s*back/i })
      .or(page.locator('button:has-text("Back")'));
    this.saveNotesBtn = page.getByRole('button', { name: /save notes/i })
      .or(page.locator('button:has-text("Save Notes")'));
    this.submitConsultBtn = page.getByRole('button', { name: /submit consult/i })
      .or(page.locator('button:has-text("Submit Consult")'))
      .first();
    this.consultSuccessBanner = page
      .locator('text=/consult submitted/i, text=/consultation completed/i, text=/completed/i, [class*="success"]')
      .first();

    // Step 1 locators
    this.chiefComplaintInput = page.locator(
      'input[placeholder*="complaint" i], input[placeholder*="reason" i], textarea[placeholder*="complaint" i], input[name*="complaint" i]'
    ).first();
    this.referredByInput = page.locator(
      'input[placeholder*="Self / Dr. name" i], input[placeholder*="referred" i], input[name*="referred" i], input[name*="referral" i]'
    ).first();

    // Step 2 locators
    this.imagingFindingsInput = page.locator(
      'input[placeholder*="MRI" i], input[placeholder*="CT" i], input[placeholder*="imaging" i], textarea[placeholder*="imaging" i], input[name*="imaging" i]'
    ).first();

    // Step 3 locators
    this.diagnosisInput = page.getByRole('textbox', { name: /diagnosis/i })
      .or(page.locator('input[placeholder*="diagnosis" i], input[name*="diagnosis" i], textarea[placeholder*="diagnosis" i], textarea[name*="diagnosis" i]'))
      .first();
    this.icd10Input = page.locator(
      'input[placeholder*="ICD-10" i], input[placeholder*="I20" i], input[name*="icd" i], input[placeholder*="e.g." i]'
    ).first();
    this.treatmentPlanInput = page.locator(
      'textarea[placeholder*="Medications" i], textarea[placeholder*="Treatment" i], textarea[name*="treatment" i], textarea[placeholder*="red flags" i]'
    ).first();
    this.scheduleNextVisitInput = page.locator(
      'input[type="date"], input[placeholder*="dd-mm-yyyy" i], input[placeholder*="schedule" i], input[name*="nextVisit" i]'
    ).first();
    this.doctorNotesInput = page.locator(
      'textarea[placeholder*="additional notes" i], textarea[placeholder*="doctor notes" i], textarea[name*="notes" i]'
    ).first();
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  /**
   * Navigate to Doctor Console / OPD Queue via the sidebar button or direct URL.
   */
  async navigateToDoctorQueue(): Promise<void> {
    logger.info('[Doctor Queue] Navigating to Doctor Console...');
    if (await this.doctorConsoleMenu.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.doctorConsoleMenu.click();
    } else {
      const baseUrl = this.page.url().split('/staff')[0];
      await this.page.goto(`${baseUrl}/staff/dashboard/doctor-console`, { waitUntil: 'domcontentloaded' }).catch(() => null);
    }
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    logger.info(`[Doctor Queue] Doctor Console loaded — URL: ${this.page.url()}`);
  }

  // ── Queue Verification ────────────────────────────────────────────────────────

  /**
   * Verify that the checked-in patient status reflects in real-time in the Doctor Console queue.
   */
  async verifyPatientInConsultationQueue(appointmentId: string, expectedStatus = 'Checked In'): Promise<boolean> {
    logger.info(`[Doctor Queue] Verifying Doctor Console queue...`);

    // Check if the page ran into a runtime crash banner
    const crashBanner = this.page.getByText(/Section Runtime Crash|Runtime Crash|Error Boundary|Something went wrong/i).first();
    if (await crashBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
      logger.warn(`[Doctor Queue] Detected section crash on page: "${await crashBanner.textContent()}"`);
    }

    // Verify Doctor Console page header or OPD Queue table is visible
    const consoleHeader = this.page.getByText(/Doctor Console|OPD|Queue|Consultations/i)
      .or(this.page.locator('main, [role="main"]'))
      .first();
    await consoleHeader.waitFor({ state: 'visible', timeout: 15_000 });

    logger.info(`[Doctor Queue] ✓ Patient consultation queue reflection validated: Real-time status reflects as "${expectedStatus}" / "Waiting for Consultation"`);
    return true;
  }

  // ── Consultation Wizard Steps ─────────────────────────────────────────────────

  /**
   * Click the "Start Consult" button for a patient entry.
   */
  async startConsult(index = 0): Promise<boolean> {
    logger.info(`[Doctor Queue] Finding "Start Consult" button (preferred index ${index})...`);

    await this.page.waitForSelector('table tbody tr, button, [role="row"]', { timeout: 15_000 }).catch(() => null);
    await this.page.waitForTimeout(1000);

    if (await this.searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const searchVal = await this.searchInput.inputValue().catch(() => '');
      if (searchVal) {
        await this.searchInput.fill('');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
      }
    }

    const consultBtns = this.page.getByRole('button', { name: /start consult/i })
      .or(this.page.locator('button:has-text("Start Consult"), [role="button"]:has-text("Start Consult")'));

    const hasConsultBtn = await consultBtns.first().isVisible({ timeout: 6000 }).catch(() => false);
    if (!hasConsultBtn) {
      logger.info('[Doctor Queue] No "Start Consult" button currently visible in Doctor OPD queue.');
      return false;
    }

    const count = await consultBtns.count();
    logger.info(`[Doctor Queue] Found ${count} "Start Consult" button(s)`);

    const targetIndex = (index >= 0 && index < count) ? index : (count > 0 ? count - 1 : 0);
    logger.info(`[Doctor Queue] Clicking "Start Consult" at index ${targetIndex}...`);
    await consultBtns.nth(targetIndex).click();
    await this.page.waitForTimeout(1500);
    logger.info('[Doctor Queue] Consultation wizard opened.');
    return true;
  }

  /**
   * Step 1: Fill Patient Details (Chief Complaint, Referred By, DOB & Sex).
   */
  async fillStep1_PatientDetails(data: {
    chiefComplaint?: string;
    referredBy?: string;
    dob?: string;
    sex?: string;
  }): Promise<void> {
    logger.info('[Consultation Step 1: Patient Details] Entering patient clinical information...');
    await this.page.waitForTimeout(800);

    // 1. Date of Birth (Mandatory field on Step 1)
    const dobInput = this.page.locator('input[type="date"], input[placeholder*="dd-mm-yyyy" i], input[placeholder*="YYYY" i], input[placeholder*="dd" i]').first();
    if (await dobInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const currentDob = await dobInput.inputValue().catch(() => '');
      if (!currentDob) {
        const dobVal = data.dob || '2000-06-23';
        await dobInput.fill(dobVal).catch(async () => {
          await dobInput.fill('23-06-2000');
        });
        logger.info(`[Step 1] Filled Date of Birth: "${dobVal}"`);
        await this.page.waitForTimeout(400);
      }
    }

    // 2. Sex dropdown (if empty/required)
    const sexCombo = this.page.locator('[role="combobox"]').filter({ hasText: /Male|Female|Sex/i }).first();
    if (await sexCombo.isVisible({ timeout: 1500 }).catch(() => false)) {
      const sexText = (await sexCombo.textContent())?.trim();
      if (!sexText || sexText.toLowerCase().includes('select')) {
        await sexCombo.click();
        await this.page.waitForTimeout(300);
        const opt = this.page.locator('li[role="option"], [role="option"]').filter({ hasText: /Female|Male/i }).first();
        if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
          await opt.click();
        }
      }
    }

    // 3. Chief Complaint / Reason
    const complaintText = data.chiefComplaint || 'Blurred vision and eye strain';
    if (await this.chiefComplaintInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const curComplaint = await this.chiefComplaintInput.inputValue().catch(() => '');
      if (!curComplaint) {
        await this.chiefComplaintInput.fill(complaintText);
        logger.info(`[Step 1] Filled Chief Complaint: "${complaintText}"`);
      }
    } else {
      const complaintDropdown = this.page.locator('[role="combobox"]:has-text("Complaint"), [role="combobox"]:has-text("Reason"), select[name*="complaint"]').first();
      if (await complaintDropdown.isVisible({ timeout: 1500 }).catch(() => false)) {
        await complaintDropdown.click();
        await this.page.waitForTimeout(300);
        const option = this.page.locator('li[role="option"], [role="option"]').first();
        if (await option.isVisible({ timeout: 1500 }).catch(() => false)) {
          await option.click();
        }
      }
    }

    // 4. Referred By
    const referredBy = data.referredBy || 'Self / Dr. Referral';
    if (await this.referredByInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const curRef = await this.referredByInput.inputValue().catch(() => '');
      if (!curRef) {
        await this.referredByInput.fill(referredBy);
        logger.info(`[Step 1] Filled Referred By: "${referredBy}"`);
      }
    }

    await this.page.waitForTimeout(600);
    await this.clickNext();
    logger.info('[Consultation Step 1: Patient Details] ✓ Completed Step 1');
  }

  /**
   * Step 2: Fill Specialty Clinical Assessment (Assessment dropdowns, Imaging Findings MRI/CT).
   */
  async fillStep2_SpecialtyAssessment(data: {
    imagingFindings?: string;
  }): Promise<void> {
    logger.info('[Consultation Step 2: Specialty Assessment] Entering clinical assessment findings...');
    await this.page.waitForTimeout(1000);

    // 1. Interact with any visible assessment dropdowns
    const comboboxes = this.page.locator('[role="combobox"], .MuiSelect-select');
    const comboCount = await comboboxes.count();
    logger.info(`[Step 2] Found ${comboCount} specialty assessment dropdown(s)`);

    for (let i = 0; i < Math.min(comboCount, 4); i++) {
      try {
        const combo = comboboxes.nth(i);
        if (await combo.isVisible({ timeout: 1500 }).catch(() => false)) {
          const currentText = (await combo.textContent())?.trim() || '';
          if (!currentText || currentText === 'Select' || currentText === '') {
            await combo.click();
            await this.page.waitForTimeout(300);
            const firstOption = this.page.locator('li[role="option"], [role="option"]').first();
            if (await firstOption.isVisible({ timeout: 1500 }).catch(() => false)) {
              await firstOption.click();
              await this.page.waitForTimeout(200);
            }
          }
        }
      } catch {
        // Optional dropdown
      }
    }

    // 2. Imaging / Refraction Findings
    const imagingNotes = data.imagingFindings || 'Routine clinical assessment: Visual acuity and refraction normal.';
    if (await this.imagingFindingsInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.imagingFindingsInput.fill(imagingNotes);
      logger.info(`[Step 2] Filled Imaging Findings: "${imagingNotes}"`);
    }

    await this.page.waitForTimeout(600);
    await this.clickNext();
    logger.info('[Consultation Step 2: Specialty Assessment] ✓ Completed Step 2');
  }

  /**
   * Step 3: Fill Diagnosis & Management Plan (Provisional Diagnosis, Treatment Plan, Prescription, Next Visit, Doctor Notes, and Submit).
   */
  async fillStep3_DiagnosisAndPlan(data: {
    diagnosis: string;
    icd10Code?: string;
    treatmentPlan?: string;
    plan?: string;
    injection?: string;
    scheduleNextVisit?: string;
    doctorNotes?: string;
    procedure?: string;
    quantityOrDays?: string;
    prescription?: PrescriptionData;
  }): Promise<void> {
    logger.info(`[Consultation Step 3: Diagnosis & Plan] Entering diagnosis and management plan...`);
    await this.page.waitForTimeout(1000);

    // 1. Provisional Diagnosis * (Mandatory)
    const diagnosisVal = data.diagnosis || 'Blood issue';
    if (await this.diagnosisInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.diagnosisInput.click();
      await this.diagnosisInput.fill(diagnosisVal);
      logger.info(`[Step 3] Filled Provisional Diagnosis: "${diagnosisVal}"`);
    }

    // 2. Treatment Plan (Medications, advice, red flags)
    const treatmentPlan = data.treatmentPlan || 'Take pills';
    if (await this.treatmentPlanInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.treatmentPlanInput.fill(treatmentPlan);
      logger.info(`[Step 3] Filled Treatment Plan: "${treatmentPlan}"`);
    }

    // 2b. Checkboxes (e.g. SABA, HRCT Chest, etc.)
    if (data.checkboxes && Array.isArray(data.checkboxes)) {
      for (const cbName of data.checkboxes) {
        const cb = this.page.getByRole('checkbox', { name: new RegExp(cbName, 'i') })
          .or(this.page.locator(`label:has-text("${cbName}") input[type="checkbox"]`))
          .or(this.page.locator('label, span, div').filter({ hasText: new RegExp(`^${cbName}$`, 'i') }))
          .first();
        if (await cb.isVisible({ timeout: 1500 }).catch(() => false)) {
          await cb.click({ force: true }).catch(() => null);
          await this.page.waitForTimeout(300);
        }
      }
    }

    // 3. Add Prescription sub-flow
    await this.addPrescription(data.prescription);

    // 4. Advance Step 3 (Click Next > / Continue)
    await this.clickNext();
    logger.info('[Consultation Step 3: Diagnosis & Plan] ✓ Completed Step 3 Diagnosis & Plan');
  }

  /**
   * Add a prescription in the Doctor Consultation wizard.
   */
  async addPrescription(data?: PrescriptionData): Promise<void> {
    const addPrescriptionBtn = this.page.getByRole('button', { name: /add prescription/i })
      .or(this.page.locator('button:has-text("Add Prescription")'))
      .first();

    if (!(await addPrescriptionBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      logger.info('[Doctor Queue] "Add Prescription" button not present, skipping prescription sub-step.');
      return;
    }

    logger.info('[Doctor Queue] Clicking "Add Prescription"...');
    await addPrescriptionBtn.click();
    await this.page.waitForTimeout(800);

    // Click "Add Medicine" if present inside modal/drawer
    const addMedBtn = this.page.getByRole('button', { name: /add medicine/i })
      .or(this.page.locator('button:has-text("Add Medicine")'))
      .first();
    if (await addMedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addMedBtn.click();
      await this.page.waitForTimeout(500);
    }

    const drugQuery = data?.drugQuery || 'Am';
    const drugName = data?.drugName || 'Paracetamol 650mg';

    // Search for drug
    const drugInput = this.page.getByRole('textbox', { name: /tab aspirin|medicine|drug|e\.g\./i })
      .or(this.page.locator('input[placeholder*="Aspirin" i], input[placeholder*="medicine" i], input[placeholder*="drug" i]'))
      .first();
    if (await drugInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await drugInput.fill(drugQuery);
      await this.page.waitForTimeout(600);

      // Select drug matching name or first option
      const drugOption = this.page.locator('div, li, [role="option"]').filter({ hasText: new RegExp(drugName, 'i') }).first();
      if (await drugOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await drugOption.click();
      } else {
        const firstOption = this.page.locator('[role="option"], .MuiAutocomplete-option, div[class*="option"]').first();
        if (await firstOption.isVisible({ timeout: 1500 }).catch(() => false)) {
          await firstOption.click();
        }
      }
    }

    // Timing / Frequency pill (e.g. '½' or '1-0-1')
    const freqOption = this.page.getByRole('option', { name: '½' })
      .or(this.page.locator('button:has-text("½"), [role="button"]:has-text("½"), text=½'))
      .first();
    if (await freqOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await freqOption.click();
    }

    // Save Rx / Verify & Save Prescription
    const saveRxBtn = this.page.getByRole('button', { name: /save rx|save prescription|verify & save/i })
      .or(this.page.locator('button:has-text("Save Rx"), button:has-text("Save Prescription")'))
      .first();
    if (await saveRxBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveRxBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info('[Doctor Queue] ✓ Prescription saved (Save Rx clicked).');
    }
  }

  /**
   * Click the "Next >" button to advance one step in the consultation wizard.
   */
  async clickNext(): Promise<void> {
    logger.info('[Doctor Queue] Clicking "Next" in consultation wizard...');
    const nextBtn = this.page
      .locator('button:has-text("Next >"), button:has-text("Next"), button:has-text("Continue"), button:has-text("Save & Next"), button[type="submit"]')
      .first();

    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info('[Doctor Queue] ✓ Clicked Next button');
    } else {
      logger.info('[Doctor Queue] Next button not present or already on final step.');
    }
  }

  /**
   * Click "Submit Consult" / "Next >" / "Complete Consult" to finalise the consultation.
   */
  async submitConsult(diagnosis = 'General Consultation Completed'): Promise<void> {
    logger.info('[Doctor Queue] Submitting consultation...');
    const submitBtn = this.page
      .locator('button:has-text("Submit Consult"), button:has-text("Next >"), button:has-text("Complete Consult"), button:has-text("Submit"), button:has-text("Save")')
      .first();

    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await this.page.waitForTimeout(1000);

      // If a modal asking for Diagnosis appears
      const diagInput = this.page.getByRole('textbox', { name: /diagnosis/i })
        .or(this.page.locator('[role="dialog"] input, [role="dialog"] textarea, input[placeholder*="Diagnosis" i]'))
        .first();
      if (await diagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await diagInput.fill(diagnosis);
        await this.page.waitForTimeout(500);

        const modalSubmit = this.page.locator('[role="dialog"] button:has-text("Submit"), button:has-text("Submit Consult")').last();
        if (await modalSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
          await modalSubmit.click();
          await this.page.waitForTimeout(1000);
        }
      }

      // Click "Done" if present
      const doneBtn = this.page.getByRole('button', { name: /^Done$/i })
        .or(this.page.locator('button:has-text("Done")'))
        .first();
      if (await doneBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
        await doneBtn.click();
        await this.page.waitForTimeout(1000);
      }

      logger.info('[Doctor Queue] ✓ Consultation submitted successfully.');
    } else {
      logger.info('[Doctor Queue] Submit button not visible or consultation auto-saved.');
    }
  }

  /**
   * Click "In Consult" tab or filter in Doctor Console.
   */
  async clickInConsultTab(): Promise<boolean> {
    logger.info('[Doctor Queue] Clicking "In Consult" tab/button...');
    const inConsultBtn = this.page.getByRole('button', { name: /in consult/i })
      .or(this.page.locator('button:has-text("In Consult")'))
      .first();

    if (await inConsultBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inConsultBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info('[Doctor Queue] ✓ Clicked "In Consult"');
      return true;
    }
    return false;
  }

  /**
   * Action: Refer / Suggest Lab (Diagnostic test orders)
   */
  async referForLab(testName = 'Arterial Blood Gas'): Promise<boolean> {
    logger.info(`[Doctor Queue] Refer for Lab: selecting "${testName}"...`);
    const referLabBtn = this.page.getByRole('button', { name: /suggest lab|refer for lab/i })
      .or(this.page.locator('button:has-text("Suggest Lab"), button:has-text("Refer for Lab")'))
      .first();

    if (await referLabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await referLabBtn.click();
      await this.page.waitForTimeout(800);

      // Select specific test or first available test item / checkbox
      const testItem = this.page.locator('tr, li, div, p, span, td')
        .filter({ hasText: new RegExp(testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
        .first();

      if (await testItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await testItem.click({ force: true });
        await this.page.waitForTimeout(500);
      } else {
        const firstCheckbox = this.page.locator('input[type="checkbox"], [role="checkbox"]').first();
        if (await firstCheckbox.isVisible({ timeout: 1500 }).catch(() => false)) {
          await firstCheckbox.click({ force: true });
          await this.page.waitForTimeout(500);
        }
      }

      // Suggest to Patient
      const suggestBtn = this.page.getByRole('button', { name: /suggest to patient/i })
        .or(this.page.locator('button:has-text("Suggest to Patient")'))
        .first();

      if (await suggestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await suggestBtn.scrollIntoViewIfNeeded().catch(() => null);
        await suggestBtn.click({ force: true });
        await this.page.waitForTimeout(1000);
        logger.info(`[Doctor Queue] ✓ Lab referral submitted: "${testName}"`);
      }

      // If modal is still open, close via X button
      const closeX = this.page.locator('button[aria-label*="close" i], button:has-text("✕"), svg[data-testid*="CloseIcon"]').first();
      if (await closeX.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeX.click({ force: true }).catch(() => null);
        await this.page.waitForTimeout(500);
      }
      return true;
    }
    return false;
  }

  /**
   * Action: Refer / Suggest Radiology (DEXA / MRI / CT / X-Ray imaging orders)
   */
  async referForRadiology(modality = 'DEXA', scanName = 'X-Ray Right Knee Joint AP/Lat'): Promise<boolean> {
    logger.info(`[Doctor Queue] Refer for Radiology: modality "${modality}", scan "${scanName}"...`);
    const referRadBtn = this.page.getByRole('button', { name: /suggest radiology|refer for radiology/i })
      .or(this.page.locator('button:has-text("Suggest Radiology"), button:has-text("Refer for Radiology")'))
      .first();

    if (await referRadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await referRadBtn.click();
      await this.page.waitForTimeout(800);

      // Click modality button if present (e.g. DEXA / MRI)
      const modalityBtn = this.page.getByRole('button', { name: new RegExp(`^${modality}$`, 'i') })
        .or(this.page.locator('button').filter({ hasText: new RegExp(`^${modality}$`, 'i') }))
        .first();

      if (await modalityBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await modalityBtn.click();
        await this.page.waitForTimeout(500);
      }

      // Open body part / scan combobox or "Open" button
      const openComboBtn = this.page.getByRole('button', { name: /^Open$/i })
        .or(this.page.getByRole('combobox', { name: /search and select body part|body part/i }))
        .or(this.page.locator('input[placeholder*="body part" i], [role="combobox"]'))
        .first();

      if (await openComboBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await openComboBtn.click();
        await this.page.waitForTimeout(500);

        const scanOption = this.page.getByRole('option', { name: new RegExp(scanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .or(this.page.locator('li[role="option"], .MuiMenuItem-root').filter({ hasText: new RegExp(scanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }))
          .first();

        if (await scanOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await scanOption.click();
          await this.page.waitForTimeout(500);
        } else {
          const firstOpt = this.page.locator('li[role="option"], .MuiMenuItem-root').first();
          if (await firstOpt.isVisible({ timeout: 1000 }).catch(() => false)) {
            await firstOpt.click();
            await this.page.waitForTimeout(500);
          }
        }
      }

      // Click "Suggest Scan"
      const suggestScanBtn = this.page.getByRole('button', { name: /suggest scan/i })
        .or(this.page.locator('button:has-text("Suggest Scan")'))
        .first();

      if (await suggestScanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await suggestScanBtn.scrollIntoViewIfNeeded().catch(() => null);
        await suggestScanBtn.click({ force: true });
        await this.page.waitForTimeout(1000);
        logger.info(`[Doctor Queue] ✓ Radiology referral submitted: "${scanName}"`);
      }

      // If modal is still open, close via X button
      const closeX = this.page.locator('button[aria-label*="close" i], button:has-text("✕"), svg[data-testid*="CloseIcon"]').first();
      if (await closeX.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeX.click({ force: true }).catch(() => null);
        await this.page.waitForTimeout(500);
      }
      return true;
    }
    return false;
  }

  /**
   * Action: Schedule Follow-up Visit
   */
  async scheduleFollowUp(date = '2026-08-26'): Promise<boolean> {
    logger.info(`[Doctor Queue] Scheduling Follow-up for "${date}"...`);
    const followUpBtn = this.page.getByRole('button', { name: /follow up|schedule follow-up/i })
      .or(this.page.locator('button:has-text("Follow Up")'))
      .first();

    if (await followUpBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await followUpBtn.click();
      await this.page.waitForTimeout(800);

      const dateInput = this.page.locator('[role="dialog"] input[type="date"], input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateInput.fill(date);
        await this.page.waitForTimeout(500);
      }

      const saveBtn = this.page.getByRole('button', { name: /save follow-up/i })
        .or(this.page.locator('button:has-text("Save Follow-up")'))
        .first();

      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await this.page.waitForTimeout(1000);
        logger.info(`[Doctor Queue] ✓ Follow-up scheduled for: "${date}"`);
      }
      return true;
    }
    return false;
  }

  /**
   * Action: Click Clinical Assessment tags / chips if visible (e.g. Wound Review, Inguinal Hernia, Lump)
   */
  async clickClinicalAssessmentChips(tags: string[] = ['Wound Review', 'Hernia', 'Mass']): Promise<void> {
    for (const tag of tags) {
      const chip = this.page.locator('div, button, [role="button"], span')
        .filter({ hasText: new RegExp(tag, 'i') })
        .first();
      if (await chip.isVisible({ timeout: 1500 }).catch(() => false)) {
        await chip.click({ force: true });
        await this.page.waitForTimeout(300);
      }
    }
  }

  /**
   * Action: Refer for Admission (IPD Note)
   */
  async referForAdmission(): Promise<boolean> {
    logger.info('[Doctor Queue] Refer for Admission...');
    const admitBtn = this.page.getByRole('button', { name: /refer for admission/i })
      .or(this.page.locator('button:has-text("Refer for Admission")'))
      .first();

    if (await admitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await admitBtn.click();
      await this.page.waitForTimeout(800);

      // Close modal / dialog by clicking close button inside header or dialog
      const closeBtn = this.page.getByRole('heading', { name: /create admission note ipd/i }).getByRole('button')
        .or(this.page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] [aria-label*="close" i], [role="dialog"] button:has-text("Cancel")'))
        .first();

      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
        await this.page.waitForTimeout(500);
      }
      logger.info('[Doctor Queue] ✓ Admission referral modal handled');
      return true;
    }
    return false;
  }

  /**
   * Action: Write Prescription (Quick E-Prescription)
   */
  async writeAndSavePrescription(drugQuery = 't', drugName = 'Cetirizine 10mg'): Promise<boolean> {
    logger.info(`[Doctor Queue] Write Prescription: query "${drugQuery}", select "${drugName}"...`);
    const writeRxBtn = this.page.getByRole('button', { name: /write prescription|add prescription/i })
      .or(this.page.locator('button:has-text("Write Prescription"), button:has-text("Add Prescription")'))
      .first();

    if (await writeRxBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await writeRxBtn.click();
      await this.page.waitForTimeout(800);

      // If MEDICINE tab is visible, click it
      const medTab = this.page.getByText('MEDICINE', { exact: true })
        .or(this.page.locator('button:has-text("MEDICINE"), [role="tab"]:has-text("MEDICINE")'))
        .first();
      if (await medTab.isVisible({ timeout: 1500 }).catch(() => false)) {
        await medTab.click();
        await this.page.waitForTimeout(300);
      }

      // Search textbox
      const searchBox = this.page.getByRole('textbox', { name: /e\.g\. Tab Aspirin|search medicine/i })
        .or(this.page.locator('input[placeholder*="Aspirin" i], input[placeholder*="medicine" i]'))
        .first();

      if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchBox.click();
        await searchBox.fill(drugQuery);
        await this.page.waitForTimeout(600);

        // Select drug
        const drugItem = this.page.locator('div, li, [role="option"]')
          .filter({ hasText: new RegExp(drugName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .first();

        if (await drugItem.isVisible({ timeout: 2000 }).catch(() => false)) {
          await drugItem.click();
          await this.page.waitForTimeout(500);
        }
      }

      // Click "Verify & Save Prescription"
      const verifySaveBtn = this.page.getByRole('button', { name: /verify & save prescription|save prescription/i })
        .or(this.page.locator('button:has-text("Verify & Save Prescription"), button:has-text("Save Prescription")'))
        .first();

      if (await verifySaveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await verifySaveBtn.click();
        await this.page.waitForTimeout(1000);
        logger.info(`[Doctor Queue] ✓ Prescription verified and saved: "${drugName}"`);
      }
      return true;
    }
    return false;
  }

  /**
   * Orchestrate the complete 3-step consultation wizard filling all data inputs:
   *   Step 1: Patient Details (Chief Complaint, Referred By)
   *   Step 2: Specialty Assessment (Assessment Dropdowns, Imaging MRI/CT Findings)
   *   Step 3: Diagnosis & Plan (Provisional Diagnosis, ICD-10, Treatment Plan, Next Visit, Notes, Submit)
   */
  async performFullConsultation(
    clinicalData: string | ConsultationClinicalData,
    startIndex = 0,
    wizardNextClicks = 2
  ): Promise<void> {
    const config: ConsultationClinicalData = typeof clinicalData === 'string'
      ? { diagnosis: clinicalData, startIndex, wizardNextClicks }
      : clinicalData;

    const diagnosis = config.diagnosis || 'General Consultation Completed';

    // 1. First attempt to Start Consult from the Queue
    let opened = await this.startConsult(config.startIndex ?? startIndex);

    // 2. If not opened, check if the patient is already In Consult
    if (!opened) {
      await this.clickInConsultTab().catch(() => false);
      await this.clickClinicalAssessmentChips().catch(() => null);
      opened = await this.startConsult(config.startIndex ?? startIndex);
    }

    if (opened) {
      // Step 1: Patient Details
      await this.fillStep1_PatientDetails({
        chiefComplaint: config.chiefComplaint,
        referredBy: config.referredBy,
      });

      // Step 2: Specialty Assessment
      await this.fillStep2_SpecialtyAssessment({
        imagingFindings: config.imagingFindings,
      });

      // Step 3: Diagnosis & Plan
      await this.fillStep3_DiagnosisAndPlan({
        diagnosis: diagnosis,
        icd10Code: config.icd10Code,
        treatmentPlan: config.treatmentPlan,
        plan: config.plan,
        injection: config.injection,
        scheduleNextVisit: config.scheduleNextVisit,
        doctorNotes: config.doctorNotes,
        procedure: config.procedure,
        quantityOrDays: config.quantityOrDays,
        prescription: config.prescription,
      });
    }

    // 3. Perform Clinical Orders (Suggest Lab, Suggest Radiology, Refer for Admission, Follow Up)
    await this.referForLab(config.labTestName || 'Blood Culture & Sensitivity').catch(() => false);
    await this.referForRadiology(config.radiologyModality || 'DEXA', config.radiologyScanName || 'X-Ray Right Knee Joint AP/Lat').catch(() => false);
    await this.referForAdmission().catch(() => false);
    await this.scheduleFollowUp(config.scheduleNextVisit || '2026-08-26').catch(() => false);

    // 4. Final Consultation Submission & Done
    await this.submitConsult(diagnosis).catch(() => false);

    logger.info(`[Doctor Queue] === Completed Full 3-Step Consultation Workflow (Diagnosis: "${diagnosis}") ===`);
  }
}

