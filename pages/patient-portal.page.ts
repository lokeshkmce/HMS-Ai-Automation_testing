import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

/**
 * Page Object Model for Omnivva Patient Portal.
 * Handles the patient OTP authentication flow and dashboard verification.
 */
export class PatientPortalPage extends BasePage {
  // ─── Landing Page Selectors ───────────────────────────────────────────────
  readonly patientLoginButton: Locator;
  readonly staffLoginButton: Locator;

  // ─── Identity Server / Auth Selectors ─────────────────────────────────────
  readonly emailInput: Locator;
  readonly continueButton: Locator;
  readonly otpInput: Locator;
  readonly verifyCodeButton: Locator;
  readonly resendCodeButton: Locator;
  readonly authErrorMessage: Locator;

  // ─── Patient Portal Dashboard Selectors ───────────────────────────────────
  readonly patientPortalHeader: Locator;
  readonly welcomeHeading: Locator;
  readonly userEmailBadge: Locator;
  readonly patientRoleBadge: Locator;
  readonly goToDashboardButton: Locator;
  readonly bookDoctorCard: Locator;
  readonly bookLabCard: Locator;
  readonly pharmacyCard: Locator;
  readonly sideNavigation: Locator;

  constructor(page: Page) {
    super(page);

    // Landing Page
    this.patientLoginButton = page.getByRole('button', { name: /patient login/i }).first();
    this.staffLoginButton = page.getByRole('button', { name: /staff login/i }).first();

    // Identity Auth
    this.emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[type="text"]').first();
    this.continueButton = page.locator('button[type="submit"], button:has-text("Continue")').first();
    this.otpInput = page.locator('input[type="text"], input[type="password"], input[placeholder*="•"]').first();
    this.verifyCodeButton = page.locator('button:has-text("Verify Code"), button[type="submit"]').first();
    this.resendCodeButton = page.locator('button:has-text("Resend code"), a:has-text("Resend code")').first();
    this.authErrorMessage = page.locator('[role="alert"], [class*="error"], [class*="alert"]');

    // Patient Dashboard
    this.patientPortalHeader = page.locator('text=/patient portal/i, text=/omnivva care/i').first();
    this.welcomeHeading = page.locator('h1, h2, h3, h4').filter({ hasText: /welcome to omnivva patient portal/i }).first();
    this.userEmailBadge = page.locator('text="patient.test@gmail.com"');
    this.patientRoleBadge = page.locator('text="PATIENT"');
    this.goToDashboardButton = page.locator('button:has-text("Go to Dashboard"), a:has-text("Go to Dashboard")').first();
    this.bookDoctorCard = page.locator('text=/book doctor/i').first();
    this.bookLabCard = page.locator('text=/book lab/i').first();
    this.pharmacyCard = page.locator('text=/pharmacy/i').first();
    this.sideNavigation = page.locator('nav, aside, [role="navigation"], [class*="sidebar"], [class*="drawer"]').first();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  async recoverFrom503IfPresent(): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const is503 = await this.page
        .locator('text=/503|service unavailable/i')
        .first()
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (!is503) break;
      logger.warn(`[503 Detected] Dev identity server returned 503 (attempt ${attempt}) — waiting and reloading...`);
      await this.page.waitForTimeout(2000);
      await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => null);
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Navigate to the HMS landing page.
   */
  async gotoLandingPage(): Promise<void> {
    logger.info('Navigating to HMS landing page for Patient Portal...');
    await this.navigate('https://dev-hms.srivyn.in/');
    await this.waitForPageLoad();
    await this.recoverFrom503IfPresent();
    await this.page.waitForTimeout(2000); // Allow React hydration to attach event listeners
  }

  /**
   * Click the Patient Login button on the landing page to start OAuth flow.
   */
  async clickPatientLogin(): Promise<void> {
    logger.info('Clicking "Patient Login" button...');
    if (this.page.url().includes('dev-identity.srivyn.in')) {
      await this.recoverFrom503IfPresent();
      logger.info(`Already on Identity server — URL: ${this.page.url()}`);
      return;
    }

    const btn = this.page.getByRole('button', { name: 'Patient Login' }).first();
    await btn.waitFor({ state: 'visible', timeout: 15_000 });
    await this.page.waitForTimeout(1000);

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (this.page.url().includes('dev-identity.srivyn.in')) break;
      logger.info(`Clicking Patient Login (attempt ${attempt})...`);
      await btn.click({ force: true }).catch(() => null);
      await this.page.waitForURL(/dev-identity\.srivyn\.in/, { timeout: 8000 }).catch(() => null);
      await this.recoverFrom503IfPresent();
    }

    await this.page.waitForURL(/dev-identity\.srivyn\.in/, { timeout: 20_000 });
    await this.recoverFrom503IfPresent();
    logger.info(`On Identity server — URL: ${this.page.url()}`);
  }

  /**
   * Complete the Patient login flow (supports both password login and OTP on Identity server).
   */
  async loginAsPatient(email: string, otp = '0000', password = 'password123'): Promise<void> {
    logger.info(`[Patient Login] Logging in with email: "${email}"...`);
    await this.recoverFrom503IfPresent();
    await this.page.waitForTimeout(1500);

    const emailField = this.page.locator('input[type="email"], input[name*="user" i], input[placeholder*="email" i], input[type="text"]').first();
    await emailField.waitFor({ state: 'visible', timeout: 20000 });
    await emailField.fill(email);

    const isPatientPortal = this.page.url().includes('OMNIVVA_PATIENT_PORTAL') || 
      (await this.page.locator('text=/Patient Portal/i, button:has-text("Continue with OTP")').first().isVisible({ timeout: 2000 }).catch(() => false));

    if (isPatientPortal) {
      // OTP-based login screen for Patient Portal
      const continueBtn = this.page.getByRole('button', { name: /continue/i })
        .or(this.page.locator('button:has-text("Continue with OTP"), button:has-text("Continue"), button[type="submit"]'))
        .first();

      await continueBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await continueBtn.click();
      await this.page.waitForTimeout(1000);

      logger.info(`[Patient Login] Entering OTP "${otp}"...`);
      const otpField = this.page.locator('input[placeholder*="•"], input[name*="otp" i], input[type="password"]').first();

      for (let attempt = 1; attempt <= 3; attempt++) {
        if (await otpField.isVisible({ timeout: 2000 }).catch(() => false)) break;
        logger.info(`OTP field not visible yet (attempt ${attempt}) — re-clicking Continue...`);
        await continueBtn.click({ force: true }).catch(() => null);
        await this.page.waitForTimeout(1500);
      }

      await otpField.waitFor({ state: 'visible', timeout: 20_000 });
      await otpField.fill(otp);

      const verifyBtn = this.page.getByRole('button', { name: /verify|submit|continue/i })
        .or(this.page.locator('button[type="submit"], button:has-text("Verify")'))
        .first();
      await verifyBtn.click();
    } else {
      // Standard password login screen
      logger.info('[Patient Login] Identity server displays password login — entering password...');
      const passwordField = this.page.locator('input[type="password"]').first();
      await passwordField.waitFor({ state: 'visible', timeout: 5000 });
      await passwordField.fill(password);

      const signInBtn = this.page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Continue")').first();
      await signInBtn.click();
    }

    logger.info('[Patient Login] Waiting for redirect to patient portal...');
    await this.page.waitForURL(
      url => url.hostname.includes('dev-hms') && url.pathname.includes('/patient'),
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );
    logger.info(`[Patient Login] ✓ Successfully redirected to: ${this.page.url()}`);
  }

  /**
   * Assert the Patient Portal Dashboard has loaded with expected elements.
   */
  async expectPatientDashboardLoaded(): Promise<void> {
    logger.info('[Patient Portal] Asserting Patient Dashboard loaded...');

    // 1. URL must be on dev-hms and contain '/patient'
    await this.page.waitForURL(
      url => url.hostname.includes('dev-hms') && url.pathname.includes('/patient'),
      { timeout: 30000 }
    );
    logger.info(`[Patient Portal] ✓ URL contains "/patient" — current: ${this.page.url()}`);

    // 2. Wait for Welcome banner
    const welcomeText = this.page.locator('text=/welcome to omnivva patient portal/i').first();
    await welcomeText.waitFor({ state: 'visible', timeout: 15000 });
    logger.info('[Patient Portal] ✓ Welcome heading visible');

    // 3. Quick Access service card
    const bookDoctor = this.page.locator('text=/book doctor/i').first();
    await bookDoctor.waitFor({ state: 'visible', timeout: 10000 });
    logger.info('[Patient Portal] ✓ Service "Book Doctor" visible');

    logger.info(`[Patient Portal] ✓ Patient Dashboard validated successfully — URL: ${this.page.url()}`);
  }

  /**
   * Take screenshot of the Patient Portal Dashboard.
   */
  async screenshotPatientDashboard(): Promise<Buffer> {
    logger.info('[Patient Portal] Taking screenshot: dashboard_patient_portal');
    return this.screenshot('dashboard_patient_portal');
  }
}
