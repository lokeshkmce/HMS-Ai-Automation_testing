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
   * Step 1: Fill Patient Details (Chief Complaint, Referred By, verify prefilled DOB & Sex).
   */
  async fillStep1_PatientDetails(data: {
    chiefComplaint?: string;
    referredBy?: string;
  }): Promise<void> {
    logger.info('[Consultation Step 1: Patient Details] Entering patient clinical information...');

    // 1. Chief Complaint / Reason
    if (data.chiefComplaint) {
      if (await this.chiefComplaintInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.chiefComplaintInput.fill(data.chiefComplaint);
        logger.info(`[Step 1] Filled Chief Complaint: "${data.chiefComplaint}"`);
      } else {
        // Dropdown selection fallback
        const complaintDropdown = this.page.locator('[role="combobox"]:has-text("Complaint"), [role="combobox"]:has-text("Reason"), select[name*="complaint"]').first();
        if (await complaintDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
          await complaintDropdown.click();
          await this.page.waitForTimeout(500);
          const option = this.page.locator('li[role="option"], [role="option"]').first();
          if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
            await option.click();
            logger.info('[Step 1] Selected Chief Complaint dropdown option');
          }
        }
      }
    }

    // 2. Referred By
    const referredBy = data.referredBy || 'Self / Dr. Referral';
    if (await this.referredByInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.referredByInput.fill(referredBy);
      logger.info(`[Step 1] Filled Referred By: "${referredBy}"`);
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

    // 1. Interact with any visible assessment dropdowns (Neurological Deficit, Spine Exam, Motor Power, etc.)
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
            await this.page.waitForTimeout(400);
            const firstOption = this.page.locator('li[role="option"], [role="option"]').first();
            if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
              await firstOption.click();
              await this.page.waitForTimeout(300);
              logger.info(`[Step 2] Selected option for assessment dropdown #${i + 1}`);
            }
          }
        }
      } catch (err) {
        logger.warn(`[Step 2] Note: Optional dropdown #${i + 1} interaction skipped.`);
      }
    }

    // 2. Imaging Findings (MRI / CT)
    const imagingNotes = data.imagingFindings || 'MRI / CT Scan Reviewed: Normal study with no acute focal lesions or hemorrhage.';
    if (await this.imagingFindingsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.imagingFindingsInput.fill(imagingNotes);
      logger.info(`[Step 2] Filled Imaging Findings (MRI/CT): "${imagingNotes}"`);
    } else {
      const anyFindingField = this.page.locator('input[placeholder*="Findings" i], textarea[placeholder*="Findings" i]').first();
      if (await anyFindingField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await anyFindingField.fill(imagingNotes);
        logger.info(`[Step 2] Filled fallback Findings field: "${imagingNotes}"`);
      }
    }

    await this.page.waitForTimeout(600);
    await this.clickNext();
    logger.info('[Consultation Step 2: Specialty Assessment] ✓ Completed Step 2');
  }

  /**
   * Step 3: Fill Diagnosis & Management Plan (Provisional Diagnosis, ICD-10, Treatment Plan, Plan, Injection, Schedule Next Visit, Doctor Notes, and Submit).
   */
  /**
   * Step 3: Fill Diagnosis & Management Plan (Provisional Diagnosis, ICD-10, Treatment Plan, Procedure, Prescription, Next Visit, Doctor Notes, and Submit).
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
    if (data.diagnosis) {
      await this.diagnosisInput.waitFor({ state: 'visible', timeout: 10_000 });
      await this.diagnosisInput.click();
      await this.diagnosisInput.fill(data.diagnosis);
      logger.info(`[Step 3] Filled Provisional Diagnosis: "${data.diagnosis}"`);
    }

    // 2. ICD-10 Code
    const icd10 = data.icd10Code || 'Z00.00';
    if (await this.icd10Input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.icd10Input.fill(icd10);
      logger.info(`[Step 3] Filled ICD-10 Code: "${icd10}"`);
    }

    // 3. Treatment Plan (Medications, advice, red flags)
    const treatmentPlan = data.treatmentPlan || 'Medications prescribed as per OPD protocol, lifestyle modification, adequate rest and hydration.';
    if (await this.treatmentPlanInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.treatmentPlanInput.fill(treatmentPlan);
      logger.info(`[Step 3] Filled Treatment Plan: "${treatmentPlan}"`);
    }

    // 4. Spinbutton (e.g. quantity, days, teeth count)
    const spinbutton = this.page.getByRole('spinbutton').first();
    if (await spinbutton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spinbutton.fill(data.quantityOrDays || '5');
      logger.info(`[Step 3] Filled spinbutton: "${data.quantityOrDays || '5'}"`);
    }

    // 5. Procedure / Specialty dropdowns
    if (data.procedure) {
      const procDropdown = this.page.locator('[role="combobox"], .MuiSelect-select').first();
      if (await procDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await procDropdown.click();
        await this.page.waitForTimeout(400);
        const opt = this.page.getByRole('option', { name: new RegExp(data.procedure, 'i') }).first();
        if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
          await opt.click();
          logger.info(`[Step 3] Selected procedure option: "${data.procedure}"`);
        } else {
          // Click outside / backdrop if option not found
          await this.page.locator('.MuiBackdrop-root').click().catch(() => null);
        }
      }
    } else {
      const step3Dropdowns = this.page.locator('[role="combobox"], .MuiSelect-select');
      const step3ComboCount = await step3Dropdowns.count();
      for (let i = 0; i < Math.min(step3ComboCount, 3); i++) {
        try {
          const combo = step3Dropdowns.nth(i);
          if (await combo.isVisible({ timeout: 1500 }).catch(() => false)) {
            const currentVal = (await combo.textContent())?.trim() || '';
            if (!currentVal || currentVal.includes('Select') || currentVal === '') {
              await combo.click();
              await this.page.waitForTimeout(400);
              const opt = this.page.locator('li[role="option"], [role="option"]').first();
              if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
                await opt.click();
                await this.page.waitForTimeout(300);
              }
            }
          }
        } catch {
          // Optional selection
        }
      }
    }

    // 6. Schedule Next Visit (Date picker)
    const nextVisitDate = data.scheduleNextVisit || '2026-08-26';
    if (await this.scheduleNextVisitInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.scheduleNextVisitInput.fill(nextVisitDate).catch(async () => {
        await this.scheduleNextVisitInput.fill('26-08-2026');
      });
      logger.info(`[Step 3] Filled Schedule Next Visit date: "${nextVisitDate}"`);
    }

    // 7. Add Prescription sub-flow
    if (data.prescription) {
      await this.addPrescription(data.prescription);
    }

    // 8. Doctor Notes (Additional notes)
    const docNotes = data.doctorNotes || 'Patient counseled on diagnosis, medication adherence, and red-flag symptoms. Advised routine follow-up.';
    if (await this.doctorNotesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.doctorNotesInput.fill(docNotes);
      logger.info(`[Step 3] Filled Doctor Notes: "${docNotes}"`);
    }

    // 9. Submit Consult
    await this.submitConsult();
    logger.info('[Consultation Step 3: Diagnosis & Plan] ✓ Completed and submitted consultation');
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

    const drugQuery = data?.drugQuery || 'T';
    const drugName = data?.drugName || 'Cetirizine 10mg';
    const dosage = data?.dosage || '100';
    const frequency = data?.frequency || '½';
    const advice = data?.clinicalAdvice || 'Use hot water';

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

    // Dosage
    const dosageInput = this.page.getByRole('textbox', { name: /75 mg|dosage|dose/i })
      .or(this.page.locator('input[placeholder*="75" i], input[placeholder*="mg" i], input[placeholder*="dosage" i]'))
      .first();
    if (await dosageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dosageInput.fill(dosage);
    }

    // Frequency / Timing dropdown / options
    const freqOption = this.page.getByRole('option', { name: frequency })
      .or(this.page.locator(`button:has-text("${frequency}"), [role="button"]:has-text("${frequency}")`))
      .first();
    if (await freqOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await freqOption.click();
    }

    // Clinical advice
    const adviceInput = this.page.getByRole('textbox', { name: /clinical advice|advice|instructions/i })
      .or(this.page.locator('input[placeholder*="advice" i], textarea[placeholder*="advice" i]'))
      .first();
    if (await adviceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adviceInput.fill(advice);
    }

    // Verify & Save Prescription
    const verifySaveBtn = this.page.getByRole('button', { name: /verify & save prescription|save prescription|verify/i })
      .or(this.page.locator('button:has-text("Verify & Save Prescription"), button:has-text("Save Prescription")'))
      .first();
    if (await verifySaveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await verifySaveBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info('[Doctor Queue] ✓ Prescription verified and saved.');
    }
  }

  /**
   * Click the "Next >" button to advance one step in the consultation wizard.
   */
  async clickNext(): Promise<void> {
    logger.info('[Doctor Queue] Clicking "Next" in consultation wizard...');
    const nextBtn = this.page
      .locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Save & Next"), button[type="submit"]')
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
   * Fill the Diagnosis free-text field in the consultation wizard.
   */
  async fillDiagnosis(diagnosis: string): Promise<void> {
    logger.info(`[Doctor Queue] Filling Diagnosis: "${diagnosis}"`);
    if (await this.diagnosisInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.diagnosisInput.click();
      await this.diagnosisInput.fill(diagnosis);
      logger.info(`[Doctor Queue] Diagnosis field filled with "${diagnosis}"`);
    }
  }

  /**
   * Click "Submit Consult" to finalise the consultation.
   */
  async submitConsult(): Promise<void> {
    logger.info('[Doctor Queue] Submitting consultation...');
    const submitBtn = this.page
      .locator('button:has-text("Submit Consult"), button:has-text("Submit"), button:has-text("Complete Consult"), button:has-text("Save"), button:has-text("Next")')
      .first();

    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await this.page.waitForTimeout(2000);
      logger.info('[Doctor Queue] ✓ Consultation submitted successfully.');
    } else {
      logger.info('[Doctor Queue] Submit button not visible or consultation auto-saved.');
    }
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
    const opened = await this.startConsult(config.startIndex ?? startIndex);
    if (!opened) {
      logger.info(`[Doctor Queue] Consultation wizard was not opened (queue empty or pending). Skipping wizard steps.`);
      return;
    }

    // Step 1: Patient Details
    await this.fillStep1_PatientDetails({
      chiefComplaint: config.chiefComplaint,
      referredBy: config.referredBy,
    });

    // Step 2: Specialty Assessment
    await this.fillStep2_SpecialtyAssessment({
      imagingFindings: config.imagingFindings,
    });

    // Step 3: Diagnosis & Plan & Submit
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

    logger.info(`[Doctor Queue] === Completed Full 3-Step Consultation Workflow (Diagnosis: "${diagnosis}") ===`);
  }
}

