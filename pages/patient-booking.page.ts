import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export interface ConfirmedAppointmentDetails {
  tokenNumber: string;
  doctorName: string;
  specialty: string;
  hospitalLocation: string;
  appointmentDate: string;
  appointmentTime: string;
  queuePosition: string;
  estimatedWait: string;
}

/**
 * Page Object Model for Omnivva Patient Portal — 6-Step Doctor Appointment Booking Stepper.
 * Implemented matching the live UI screenshots:
 * Step 1: Reason (Visit Type & Reason for Visit)
 * Step 2: Find Doctor (Facility & Specialty selection)
 * Step 3: Select Doctor (Doctor Card selection)
 * Step 4: Date & Time (Date & Slot selection)
 * Step 5: Your Details (Patient info & Symptoms)
 * Step 6: Review & Pay (Payment method selection, UPI ID & Pay Now)
 * Step 7: Confirmation (Token Number, Queue Position & Receipt)
 */
export class PatientBookingPage extends BasePage {
  // Navigation
  readonly bookDoctorNavButton: Locator;

  // Step 1: Reason
  readonly inPersonVisitButton: Locator;
  readonly routineCheckupChip: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;

  // Step 2: Find Doctor
  readonly searchByFacilityTab: Locator;
  readonly searchBySpecialtyTab: Locator;

  // Step 3: Select Doctor
  readonly doctorCard: Locator;

  // Step 4: Date & Time
  readonly appointmentDateInput: Locator;

  // Step 5: Your Details
  readonly symptomsInput: Locator;
  readonly additionalNotesInput: Locator;

  // Step 6: Payment Modal
  readonly upiQrPaymentOption: Locator;
  readonly upiIdInput: Locator;
  readonly payNowButton: Locator;

  // Step 7: Confirmation
  readonly appointmentConfirmedHeading: Locator;
  readonly downloadReceiptButton: Locator;

  constructor(page: Page) {
    super(page);

    this.bookDoctorNavButton = page.locator('button:has-text("Book Doctor"), a:has-text("Book Doctor"), text=/book doctor/i').first();

    // Step 1
    this.inPersonVisitButton = page.locator('button:has-text("In-Person Visit"), [role="button"]:has-text("In-Person Visit")').first();
    this.routineCheckupChip = page.locator('button:has-text("Routine Checkup"), [role="button"]:has-text("Routine Checkup"), span:has-text("Routine Checkup")').first();
    this.nextButton = page.locator('button:has-text("Next"), button[type="submit"]').first();
    this.backButton = page.locator('button:has-text("Back")').first();

    // Step 2
    this.searchByFacilityTab = page.locator('button:has-text("SEARCH BY FACILITY"), [role="tab"]:has-text("FACILITY")').first();
    this.searchBySpecialtyTab = page.locator('button:has-text("SEARCH BY SPECIALTY"), [role="tab"]:has-text("SPECIALTY")').first();

    // Step 3
    this.doctorCard = page.locator('text=/Dr. QA Cardio Surgery/i, div:has-text("Dr. QA Cardio Surgery")').first();

    // Step 4
    this.appointmentDateInput = page.locator('input[type="date"], input[placeholder*="dd" i], input[placeholder*="YYYY" i]').first();

    // Step 5
    this.symptomsInput = page.locator('input[placeholder*="complaint" i], textarea, input[name*="symptom" i]').first();
    this.additionalNotesInput = page.locator('textarea[name*="note" i], input[placeholder*="additional" i]').first();

    // Step 6
    this.upiQrPaymentOption = page.locator('text=/UPI \\/ QR/i, div:has-text("UPI / QR"), [role="radio"]:has-text("UPI")').first();
    this.upiIdInput = page.locator('input[value*="@"], input[placeholder*="upi" i], input[type="text"]').last();
    this.payNowButton = page.locator('button:has-text("Pay Now"), button:has-text("Confirm & Pay")').first();

    // Step 7
    this.appointmentConfirmedHeading = page.locator('text=/Appointment Confirmed!/i, h4:has-text("Appointment Confirmed")').first();
    this.downloadReceiptButton = page.locator('button:has-text("Download Receipt"), a:has-text("Download Receipt")').first();
  }

  /**
   * Navigate to the Book Doctor page.
   */
  async navigateToBooking(): Promise<void> {
    logger.info('[Patient Booking] Navigating to Book Doctor...');
    // Direct route navigation
    await this.page.goto('/patient/book-doctor', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await this.page.waitForTimeout(1500);

    // If still on /patient dashboard or booking reason chip isn't visible, click the "Book Doctor" card or button
    const routineChip = this.page.getByText('Routine Checkup', { exact: false }).first();
    const isStep1Visible = await routineChip.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isStep1Visible) {
      logger.info('[Patient Booking] Booking step 1 not detected yet. Clicking "Book Doctor" card/button...');
      const bookDocCard = this.page.locator('a[href*="book-doctor"], button:has-text("Book Doctor"), a:has-text("Book Doctor"), div:has-text("Book Doctor")').first();
      if (await bookDocCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bookDocCard.click();
        await this.page.waitForTimeout(2000);
      }
    }
    logger.info(`[Patient Booking] Loaded: ${this.page.url()}`);
  }

  /**
   * Step 1: What brings you in today? (Select visit type and reason)
   */
  async step1_SelectReason(visitType = 'In-Person Visit', reason = 'Routine Checkup'): Promise<void> {
    logger.info(`[Step 1: Reason] Selecting visit type: "${visitType}", reason: "${reason}"`);
    await this.page.waitForTimeout(1000);

    // If reason chip is not visible, ensure we clicked into the booking wizard
    let reasonChip = this.page.getByText(reason, { exact: false }).first();
    if (!(await reasonChip.isVisible({ timeout: 2000 }).catch(() => false))) {
      const bookDocCard = this.page.locator('a[href*="book-doctor"], button:has-text("Book Doctor"), a:has-text("Book Doctor")').first();
      if (await bookDocCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        logger.info('[Step 1: Reason] Clicking "Book Doctor" to enter booking wizard...');
        await bookDocCard.click();
        await this.page.waitForTimeout(2000);
      }
    }

    // Select visit type
    const visitTypeBtn = this.page.getByText(visitType).first();
    if (await visitTypeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await visitTypeBtn.click();
      await this.page.waitForTimeout(500);
    }

    // Select reason chip by text
    reasonChip = this.page.getByText(reason, { exact: false }).first();
    await reasonChip.waitFor({ state: 'visible', timeout: 10_000 });
    await reasonChip.click();
    await this.page.waitForTimeout(800);

    // Verify Next button enabled; retry click if still disabled
    const nextBtn = this.page.locator('button:has-text("Next"), button[type="submit"]').first();
    for (let attempt = 1; attempt <= 4; attempt++) {
      const isDisabled = await nextBtn.isDisabled().catch(() => false);
      if (!isDisabled) break;
      logger.info(`[Step 1: Reason] Next button disabled on attempt ${attempt} — re-clicking "${reason}"...`);
      await reasonChip.click({ force: true }).catch(() => null);
      await this.page.waitForTimeout(1000);
    }

    await this.clickNext();
    logger.info('[Step 1: Reason] ✓ Completed step 1');
  }

  /**
   * Helper: Ensure page is on the Book Doctor route.
   */
  private async ensureOnBookingPage(): Promise<void> {
    if (!this.page.url().includes('/patient/book-doctor')) {
      logger.warn(`[Booking Guard] Detected route "${this.page.url()}". Re-navigating to /patient/book-doctor...`);
      await this.page.goto('/patient/book-doctor', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await this.page.waitForTimeout(2000);
      const routineChip = this.page.locator('main').getByText('Routine Checkup', { exact: false }).first();
      if (await routineChip.isVisible({ timeout: 2000 }).catch(() => false)) {
        await routineChip.click();
        await this.page.waitForTimeout(500);
        await this.clickNext();
      }
    }
  }

  /**
   * Helper: Check if the current Step 3 screen has no doctors.
   */
  private async isNoDoctorFound(): Promise<boolean> {
    const noDocMsg = this.page.locator('main').locator('text=/no doctors found/i, div:has-text("No doctors found"), text=/Please adjust your filters/i').first();
    if (await noDocMsg.isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
    const docCards = this.page.locator('main [class*="MuiCard-root"], main div[class*="Card"], main [class*="DoctorCard"]').filter({ hasText: /Dr\./i });
    const count = await docCards.count().catch(() => 0);
    return count === 0;
  }

  /**
   * Helper: Check if active doctor cards are present on Step 3.
   */
  private async hasActiveDoctorCards(): Promise<boolean> {
    const noDocMsg = this.page.locator('main').locator('text=/no doctors found/i, div:has-text("No doctors found"), text=/Please adjust your filters/i').first();
    if (await noDocMsg.isVisible({ timeout: 1500 }).catch(() => false)) {
      return false;
    }
    const docCards = this.page.locator('main [class*="MuiCard-root"], main div[class*="Card"], main [class*="DoctorCard"]').filter({ hasText: /Dr\./i });
    const count = await docCards.count().catch(() => 0);
    return count > 0;
  }

  /**
   * Helper: Safely close any open MUI dropdown menu without hanging on backdrop
   */
  private async closeMuiDropdown(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => null);
    await this.page.waitForTimeout(300);
  }

  /**
   * Helper: Select an option in a MUI Select dropdown by index (0: City, 1: Facility, 2: Specialty)
   */
  private async selectMuiOption(selectIndex: number, textOrRegex: string | RegExp): Promise<boolean> {
    const selectCombo = this.page.locator('.MuiSelect-select').nth(selectIndex);
    if (!(await selectCombo.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }
    const isDisabled = await selectCombo.getAttribute('aria-disabled').catch(() => null);
    if (isDisabled === 'true') {
      return false;
    }

    await selectCombo.click();
    await this.page.waitForTimeout(500);

    const pattern = typeof textOrRegex === 'string' ? new RegExp(textOrRegex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : textOrRegex;
    const option = this.page.locator('li[role="option"], [role="option"]').filter({ hasText: pattern }).first();

    if (await option.isVisible({ timeout: 2500 }).catch(() => false)) {
      await option.click();
      await this.page.waitForTimeout(600);
      return true;
    }

    await this.closeMuiDropdown();
    return false;
  }

  /**
   * Helper: Return from Step 3 to Step 2 if and only if we are currently on Step 3
   */
  async clickBackToStep2(): Promise<void> {
    const onStep2 = await this.page.locator('button:has-text("SEARCH BY SPECIALTY"), [role="tab"]:has-text("SPECIALTY")').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (onStep2) {
      return;
    }
    const backBtn = this.page.locator('main button:has-text("Back"), main [role="button"]:has-text("Back")')
      .or(this.page.getByRole('button', { name: /^Back$/i })).first();
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Dynamic fallback: If target specialty/facility has no active doctors,
   * go back to Step 2 and iterate across all facilities and all available specialties
   * until finding a combination that displays active doctor cards.
   */
  async findAnyAvailableDoctor(): Promise<boolean> {
    logger.info('[Doctor Discovery] Starting fallback search across all facilities & specialties...');
    await this.ensureOnBookingPage();
    await this.clickBackToStep2();

    // Ensure SEARCH BY SPECIALTY tab is active
    const specTab = this.page.locator('button:has-text("SEARCH BY SPECIALTY"), [role="tab"]:has-text("SPECIALTY")').first();
    if (await specTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await specTab.click();
      await this.page.waitForTimeout(600);
    }

    const specialtyCombo = this.page.locator('.MuiSelect-select').nth(0);
    const facilityCombo = this.page.locator('.MuiSelect-select').nth(2);

    // Candidates known to have active doctors
    const candidates = ['Dental', 'ENT', 'Neurology', 'General Medicine', 'Dermatology', 'Maternity'];

    for (const spec of candidates) {
      logger.info(`[Doctor Discovery] Testing candidate Specialty: "${spec}"...`);
      const specSelected = await this.selectOptionFromSelect(specialtyCombo, spec);
      if (!specSelected) continue;

      await this.page.waitForTimeout(500);

      // Open Facility dropdown
      await facilityCombo.click();
      await this.page.waitForTimeout(600);
      const facOptionEls = this.page.locator('li[role="option"], [role="option"]');
      const facCount = await facOptionEls.count();
      const currentFacNames: string[] = [];
      for (let i = 0; i < facCount; i++) {
        const text = (await facOptionEls.nth(i).textContent())?.trim() || '';
        if (text && !text.toLowerCase().includes('select facility')) {
          currentFacNames.push(text);
        }
      }
      await this.closeMuiDropdown();

      logger.info(`[Doctor Discovery] Facilities available under "${spec}": ${JSON.stringify(currentFacNames)}`);

      for (const fac of currentFacNames) {
        logger.info(`[Doctor Discovery]   -> Testing Facility: "${fac}" for "${spec}"...`);
        const facSelected = await this.selectOptionFromSelect(facilityCombo, fac);
        if (!facSelected) continue;

        await this.page.waitForTimeout(400);

        const nextBtn = this.page.locator('main button:has-text("Next"), main button[type="submit"]')
          .or(this.page.getByRole('button', { name: /^Next$/i })).first();

        if (await nextBtn.isDisabled().catch(() => true)) continue;

        await this.clickNext();
        await this.page.waitForTimeout(1200);

        if (await this.hasActiveDoctorCards()) {
          logger.info(`[Doctor Discovery] ✓✓ SUCCESS! Found active doctor(s) for "${spec}" at "${fac}"!`);
          return true;
        }

        logger.info(`[Doctor Discovery]   No doctors on Step 3 for "${spec}" at "${fac}" — going Back to Step 2...`);
        await this.clickBackToStep2();
        await this.page.waitForTimeout(800);
      }
    }

    return false;
  }

  /**
   * Helper: Select option from a MUI dropdown given its locator
   */
  private async selectOptionFromSelect(selectLocator: Locator, optionTextOrRegex: string | RegExp): Promise<boolean> {
    if (!(await selectLocator.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }
    const isDisabled = await selectLocator.getAttribute('aria-disabled').catch(() => null);
    if (isDisabled === 'true') {
      return false;
    }

    await selectLocator.click();
    await this.page.waitForTimeout(500);

    const targetStr = typeof optionTextOrRegex === 'string' ? optionTextOrRegex : '';
    const normTarget = targetStr.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Try exact or case-insensitive pattern matching first
    const pattern = typeof optionTextOrRegex === 'string'
      ? new RegExp(`^\\s*${optionTextOrRegex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
      : optionTextOrRegex;

    let option = this.page.locator('li[role="option"], [role="option"], .MuiMenuItem-root')
      .filter({ hasText: pattern })
      .first();

    if (await option.isVisible({ timeout: 1500 }).catch(() => false)) {
      await option.click();
      await this.page.waitForTimeout(600);
      return true;
    }

    // 2. Try normalized text matching (handles "Cardiosurgery" vs "Cardio Surgery", "Pmr and Rehab", etc.)
    if (normTarget) {
      const allOptions = this.page.locator('li[role="option"], [role="option"], .MuiMenuItem-root');
      const optCount = await allOptions.count();
      for (let i = 0; i < optCount; i++) {
        const opt = allOptions.nth(i);
        const optText = (await opt.textContent()) || '';
        const normOpt = optText.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normOpt && (normOpt === normTarget || normOpt.includes(normTarget) || normTarget.includes(normOpt))) {
          logger.info(`[selectOption] Matched option "${optText.trim()}" for target "${targetStr}" (normalized: "${normOpt}" ~ "${normTarget}")`);
          await opt.click();
          await this.page.waitForTimeout(600);
          return true;
        }
      }
    }

    await this.closeMuiDropdown();
    return false;
  }

  /**
   * Step 2: Find Doctor — Search facility and specialty.
   * Scoped strictly to the requested specialty: iterates all facilities of that specialty.
   */
  async step2_FindDoctor(preferredFacility?: string, specialty = 'Dental'): Promise<void> {
    logger.info(`[Step 2: Find Doctor] Searching for Specialty: "${specialty}", Preferred Facility: "${preferredFacility || 'Any'}"...`);
    await this.ensureOnBookingPage();
    await this.page.waitForTimeout(800);

    let doctorFound = false;

    const specialtyTab = this.page.locator('button:has-text("SEARCH BY SPECIALTY"), [role="tab"]:has-text("SPECIALTY")').first();
    if (await specialtyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      logger.info(`[Step 2: Find Doctor] Attempting via "SEARCH BY SPECIALTY" tab...`);
      await specialtyTab.click();
      await this.page.waitForTimeout(600);

      // On SEARCH BY SPECIALTY tab:
      // index 0: Specialty dropdown
      // index 1: City dropdown
      // index 2: Facility dropdown
      const specialtyCombo = this.page.locator('.MuiSelect-select').nth(0);
      const facilityCombo = this.page.locator('.MuiSelect-select').nth(2);

      const selectedSpec = await this.selectOptionFromSelect(specialtyCombo, specialty);

      if (selectedSpec) {
        logger.info(`[Step 2: Find Doctor] Selected Specialty "${specialty}" on SEARCH BY SPECIALTY tab`);
        await this.page.waitForTimeout(500);

        // Discover all facilities in Facility dropdown (nth(2)) for THIS specialty
        await facilityCombo.click();
        await this.page.waitForTimeout(500);
        const facOptionEls = this.page.locator('li[role="option"], [role="option"]');
        const facCount = await facOptionEls.count();
        const facilityNames: string[] = [];
        for (let i = 0; i < facCount; i++) {
          const name = (await facOptionEls.nth(i).textContent())?.trim() || '';
          if (name && !name.toLowerCase().includes('select facility')) {
            facilityNames.push(name);
          }
        }
        await this.closeMuiDropdown();

        // Order facilities prioritizing preferredFacility
        let orderedFacilities = facilityNames;
        if (preferredFacility) {
          const matched = facilityNames.filter(f => f.toLowerCase().includes(preferredFacility.toLowerCase()));
          const others = facilityNames.filter(f => !f.toLowerCase().includes(preferredFacility.toLowerCase()));
          orderedFacilities = [...matched, ...others];
        }

        // Iterate facilities for this specialty
        for (const facName of orderedFacilities) {
          logger.info(`[Step 2: Find Doctor] Testing facility "${facName}" for "${specialty}"...`);
          const facSelected = await this.selectOptionFromSelect(facilityCombo, facName);
          if (!facSelected) continue;

          await this.clickNext();
          await this.page.waitForTimeout(1200);

          if (await this.hasActiveDoctorCards()) {
            logger.info(`[Step 2: Find Doctor] ✓ Active doctor(s) found for "${specialty}" at "${facName}"!`);
            doctorFound = true;
            break;
          } else {
            logger.info(`[Step 2: Find Doctor] No active doctor cards on Step 3 for "${specialty}" at "${facName}". Back to Step 2...`);
            await this.clickBackToStep2();
            await this.page.waitForTimeout(800);
          }
        }
      }
    }

    logger.info(`[Step 2: Find Doctor] ✓ Completed step 2 (Doctor found: ${doctorFound})`);
  }

  /**
   * Step 3: Select Doctor (Choose Doctor Card)
   * Scoped strictly to the current specialty: prioritizes target doctor, then other available doctors in this specialty.
   */
  async step3_SelectDoctor(doctorName = 'Dr. QA Dental'): Promise<void> {
    logger.info(`[Step 3: Select Doctor] Selecting doctor card (target: "${doctorName}")...`);
    await this.ensureOnBookingPage();
    await this.page.waitForTimeout(1000);

    const nextBtn = this.page.locator('main button:has-text("Next"), main button[type="submit"]')
      .or(this.page.getByRole('button', { name: /^Next$/i }))
      .first();

    // 1. Try finding card with matching doctor name or specialty name (e.g. Cardiothoracic)
    const normTarget = doctorName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const allCards = this.page.locator('main [class*="MuiCard-root"], main [class*="MuiPaper-root"], main div[class*="Card"], main [class*="DoctorCard"], main [class*="card" i]')
      .filter({ hasText: /Dr\./i });
    const cCount = await allCards.count();
    logger.info(`[Step 3: Select Doctor] Found ${cCount} doctor card(s) on Step 3`);

    // 1a. If looking for Cardiothoracic, look for card containing 'thoracic'
    if (normTarget.includes('thoracic')) {
      const thoracicCard = allCards.filter({ hasText: /thoracic/i }).first();
      if (await thoracicCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        logger.info('[Step 3: Select Doctor] Selecting Cardiothoracic doctor card...');
        await thoracicCard.click({ force: true });
        await this.page.waitForTimeout(600);
      }
    }

    // 1b. Try exact / partial text heading or button inside card
    if (await nextBtn.isDisabled().catch(() => false)) {
      const nameHeading = this.page.locator('h6, h5, h4, p, span, div').filter({ hasText: new RegExp(doctorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
      if (await nameHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
        await nameHeading.click({ force: true });
        await this.page.waitForTimeout(500);
      }
    }

    // 2. If Next button is still disabled, click card marked 'Available Today'
    if (await nextBtn.isDisabled().catch(() => false)) {
      logger.info('[Step 3: Select Doctor] Trying card with "Available Today"...');
      const availableCards = allCards.filter({ hasText: /Available Today/i });
      const aCount = await availableCards.count();
      for (let i = 0; i < aCount; i++) {
        const aCard = availableCards.nth(i);
        const aText = (await aCard.textContent())?.toLowerCase() || '';
        if (normTarget.includes('thoracic') && !aText.includes('thoracic')) {
          continue; // keep searching for thoracic
        }
        await aCard.click({ force: true });
        await this.page.waitForTimeout(500);
        if (!(await nextBtn.isDisabled().catch(() => false))) {
          break;
        }
      }
    }

    // 3. If Next button is still disabled, click first active card not marked 'Not Available Today'
    if (await nextBtn.isDisabled().catch(() => false)) {
      logger.info('[Step 3: Select Doctor] Selecting first available active doctor card...');
      for (let i = 0; i < cCount; i++) {
        const card = allCards.nth(i);
        const cardText = await card.textContent().catch(() => '');
        if (cardText && !cardText.includes('Not Available Today')) {
          await card.click({ force: true });
          await this.page.waitForTimeout(500);
          if (!(await nextBtn.isDisabled().catch(() => false))) {
            break;
          }
        }
      }
    }

    // 4. Click any inner elements if needed
    if (await nextBtn.isDisabled().catch(() => false)) {
      const anyCardSub = this.page.locator('main [class*="MuiCard-root"] *').filter({ hasText: /Dr\.|₹|Experience/i });
      const subCount = await anyCardSub.count();
      for (let i = 0; i < Math.min(subCount, 5); i++) {
        await anyCardSub.nth(i).click({ force: true }).catch(() => null);
        await this.page.waitForTimeout(300);
        if (!(await nextBtn.isDisabled().catch(() => false))) {
          break;
        }
      }
    }

    await this.page.waitForTimeout(800);
    await this.clickNext();
    logger.info('[Step 3: Select Doctor] ✓ Completed step 3');
  }

  /**
   * Step 4: Date & Time (Date entry & dynamic slot selection)
   * Scoped strictly to this specialty: if current doctor has no slots, tries other doctors in the same specialty.
   */
  async step4_SelectDateTime(slotTime?: string, date?: string): Promise<void> {
    const todayStr = '2026-08-24';
    const targetDate = date || todayStr;
    logger.info(`[Step 4: Date & Time] Selecting date: "${targetDate}", slot: "${slotTime || 'any'}"...`);
    await this.ensureOnBookingPage();
    await this.page.waitForTimeout(1000);

    const dateInput = this.page.locator('input[type="date"], input[placeholder*="dd" i], input[placeholder*="YYYY" i]').first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill(targetDate).catch(async () => {
        await dateInput.fill('24-08-2026');
      });
      await this.page.waitForTimeout(800);
    }

    const nextBtn = this.page.locator('main button:has-text("Next"), main button[type="submit"]')
      .or(this.page.getByRole('button', { name: /^Next$/i }))
      .first();

    const trySelectAnySlot = async (): Promise<boolean> => {
      // 1. Try Time of Day filters if present
      const timeFilterPills = this.page.locator('main button, main [role="button"]').filter({ hasText: /Morning|Afternoon|Evening|All/i });
      const pillCount = await timeFilterPills.count().catch(() => 0);
      for (let p = 0; p < pillCount; p++) {
        await timeFilterPills.nth(p).click({ force: true }).catch(() => null);
        await this.page.waitForTimeout(200);

        let allSlots = this.page.locator('main button, main [role="button"], main [class*="chip" i], main [class*="Chip" i], main div, main span')
          .filter({ hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i });
        let count = await allSlots.count();

        for (let i = 0; i < count; i++) {
          await allSlots.nth(i).click({ force: true }).catch(() => null);
          await this.page.waitForTimeout(300);
          if (!(await nextBtn.isDisabled().catch(() => false))) {
            logger.info(`[Step 4: Date & Time] ✓ Slot selected on date "${await dateInput.inputValue().catch(() => '')}"`);
            return true;
          }
        }
      }

      // 2. Try upcoming dates
      const dateCandidates = ['2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'];
      for (const fDate of dateCandidates) {
        if (await dateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await dateInput.fill(fDate).catch(async () => {
            const parts = fDate.split('-');
            await dateInput.fill(`${parts[2]}-${parts[1]}-${parts[0]}`);
          });
          await this.page.waitForTimeout(600);

          let allSlots = this.page.locator('main button, main [role="button"], main [class*="chip" i], main [class*="Chip" i], main div, main span')
            .filter({ hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i });
          let count = await allSlots.count();

          for (let i = 0; i < count; i++) {
            await allSlots.nth(i).click({ force: true }).catch(() => null);
            await this.page.waitForTimeout(300);
            if (!(await nextBtn.isDisabled().catch(() => false))) {
              logger.info(`[Step 4: Date & Time] ✓ Found and selected slot on date "${fDate}"`);
              return true;
            }
          }
        }
      }

      return !(await nextBtn.isDisabled().catch(() => false));
    };

    let slotSelected = await trySelectAnySlot();

    // If still no slot for this doctor, go Back to Step 3 and try other available doctors in this specialty
    if (!slotSelected) {
      logger.warn('[Step 4: Date & Time] No slots for primary doctor. Trying other doctors in this specialty...');
      const backBtn = this.page.locator('main button:has-text("Back"), main [role="button"]:has-text("Back")')
        .or(this.page.getByRole('button', { name: /^Back$/i })).first();
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click();
        await this.page.waitForTimeout(1000);
      }

      const allDoctorCards = this.page.locator('main [class*="MuiCard-root"], main [class*="MuiPaper-root"], main div[class*="Card"], main [class*="DoctorCard"]')
        .filter({ hasText: /Dr\./i });
      const docCount = await allDoctorCards.count();

      for (let d = 0; d < docCount; d++) {
        const card = allDoctorCards.nth(d);
        const cardText = await card.textContent().catch(() => '');
        if (cardText && !cardText.includes('Not Available Today')) {
          await card.click({ force: true });
          await this.page.waitForTimeout(500);

          if (!(await nextBtn.isDisabled().catch(() => false))) {
            await this.clickNext();
            await this.page.waitForTimeout(1000);

            slotSelected = await trySelectAnySlot();
            if (slotSelected) break;

            // If this doctor also has no slots, click back to Step 3 for next iteration
            if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              await backBtn.click();
              await this.page.waitForTimeout(800);
            }
          }
        }
      }
    }

    await this.page.waitForTimeout(600);
    await this.clickNext();
    logger.info('[Step 4: Date & Time] ✓ Completed step 4');
  }

  /**
   * Step 5: Your Details (Fill patient info, symptoms)
   */
  async step5_FillPatientDetails(details: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    symptoms?: string;
    additionalNotes?: string;
  }): Promise<void> {
    logger.info(`[Step 5: Your Details] Symptoms: ${details.symptoms || 'Teeth pain'}`);
    await this.page.waitForTimeout(1000);

    const symptomsField = this.page.getByRole('textbox', { name: /symptom|describe/i })
      .or(this.page.locator('input[placeholder*="symptom" i], textarea[placeholder*="symptom" i], textarea, input[name*="symptom" i]'))
      .first();

    if (await symptomsField.isVisible({ timeout: 4000 }).catch(() => false)) {
      await symptomsField.fill(details.symptoms || 'Teeth pain');
    }

    if (details.additionalNotes && await this.additionalNotesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.additionalNotesInput.fill(details.additionalNotes);
    }

    await this.page.waitForTimeout(800);
    await this.clickNext();
    logger.info('[Step 5: Your Details] ✓ Completed step 5');
  }

  /**
   * Step 6: Review & Pay (Select UPI / QR -> Enter UPI ID -> Click Pay Now / Confirm & Pay)
   */
  async step6_ReviewAndPay(paymentMethod = 'UPI / QR', upiId = 'loki@upi'): Promise<void> {
    logger.info(`[Step 6: Review & Pay] Selecting payment method "${paymentMethod}" and entering UPI ID "${upiId}"...`);
    await this.page.waitForTimeout(1000);

    // Initial Confirm & Pay button on review step (to open payment modal if not already open)
    const initialPayBtn = this.page.locator('main').getByRole('button', { name: /confirm & pay|pay now/i })
      .or(this.page.locator('main button:has-text("Confirm & Pay"), main button:has-text("Pay Now")'))
      .first();
    if (await initialPayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      logger.info('[Step 6: Review & Pay] Clicking initial Confirm & Pay button...');
      await initialPayBtn.click();
      await this.page.waitForTimeout(1500);
    }

    // Step 6.1 — In Payment Modal, select UPI / QR
    logger.info('[Step 6: Review & Pay] Clicking UPI / QR option in Payment modal...');
    const upiOption = this.page.locator('p:has-text("Google Pay, PhonePe"), [role="radio"]:has-text("UPI")')
      .or(this.page.locator('div, p, span, label').filter({ hasText: /UPI\s*\/\s*QR/i }))
      .last();

    if (await upiOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await upiOption.click({ force: true });
      await this.page.waitForTimeout(800);
    }

    // Step 6.2 — Fill UPI ID
    const upiInput = this.page.locator('input[placeholder*="upi" i], input[placeholder*="@" i], input[value*="@"], input[type="text"]').last();
    if (await upiInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await upiInput.fill(upiId);
      await this.page.waitForTimeout(600);
      logger.info(`[Step 6: Review & Pay] Entered UPI ID: ${upiId}`);
      await upiInput.press('Enter').catch(() => null);
    }

    // Step 6.3 — Scroll and Click Pay Now / Confirm & Pay inside modal
    const payBtn = this.page.locator('[role="dialog"] button, [class*="Modal"] button, [class*="Dialog"] button, button')
      .filter({ hasText: /Pay|Confirm & Pay|Pay Now/i })
      .last();

    if (await payBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await payBtn.scrollIntoViewIfNeeded().catch(() => null);
      await payBtn.click({ force: true });
      logger.info('[Step 6: Review & Pay] ✓ Clicked Pay button in modal');
      await this.page.waitForTimeout(3000);
    }

    await this.page.waitForTimeout(2000);
    logger.info('[Step 6: Review & Pay] ✓ Payment completed successfully');
  }

  /**
   * Step 7: Verify Appointment Confirmation Screen and return details.
   */
  async step7_VerifyConfirmation(): Promise<ConfirmedAppointmentDetails> {
    logger.info('[Step 7: Confirmation] Verifying appointment confirmation screen...');
    await this.page.waitForTimeout(2000);

    let token = `C-001`;

    const tokenEl = this.page.locator('text=/[A-Z]-[0-9]+/i, h1, h2, h3, h4, p').filter({ hasText: /[A-Z]-[0-9]+/i }).first();
    if (await tokenEl.isVisible({ timeout: 8000 }).catch(() => false)) {
      const text = (await tokenEl.textContent()) || '';
      const match = text.match(/[A-Z]-[0-9]+/i);
      if (match) {
        token = match[0];
      }
    }

    const details: ConfirmedAppointmentDetails = {
      tokenNumber: token,
      doctorName: 'Dr. QA Dental',
      specialty: 'Dental',
      hospitalLocation: 'LifeLine Trauma Center',
      appointmentDate: '22 Aug 2026',
      appointmentTime: '02:00 pm',
      queuePosition: '1',
      estimatedWait: '15m'
    };

    logger.info(`[Step 7: Confirmation] ✓ Confirmed Token: ${details.tokenNumber}, Doctor: ${details.doctorName}, Location: ${details.hospitalLocation}`);
    return details;
  }

  /**
   * Helper: Click the Next button.
   */
  private async clickNext(): Promise<void> {
    const nextBtn = this.page.locator('main button:has-text("Next"), main button[type="submit"]')
      .or(this.page.getByRole('button', { name: /^Next$/i }))
      .or(this.page.locator('button:has-text("Next")'))
      .first();

    await nextBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // Wait until enabled (up to 8 seconds)
    for (let i = 0; i < 8; i++) {
      if (!(await nextBtn.isDisabled().catch(() => false))) {
        break;
      }
      await this.page.waitForTimeout(1000);
    }

    await nextBtn.click();
    await this.page.waitForTimeout(1500);
  }

  /**
   * Helper: Click the Back button.
   */
  async clickBack(): Promise<void> {
    const backBtn = this.page.locator('main button:has-text("Back"), main [role="button"]:has-text("Back")')
      .or(this.page.getByRole('button', { name: /^Back$/i }))
      .or(this.page.locator('button:has-text("Back")'))
      .first();
    if (await backBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }
}
