const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to landing page...');
  await page.goto('https://dev-hms.srivyn.in/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Clicking Patient Login button...');
  await page.getByRole('button', { name: 'Patient Login' }).first().click({ force: true });
  
  console.log('Waiting for identity page URL...');
  await page.waitForURL(/dev-identity\.srivyn\.in/, { timeout: 30000 });
  console.log('Identity URL:', page.url());

  await page.waitForTimeout(2000);

  // Email step
  const emailInput = page.locator('input[type="email"], input[type="text"]').first();
  await emailInput.fill('patient.test@gmail.com');
  console.log('Filled email: patient.test@gmail.com');

  const continueBtn = page.getByRole('button', { name: /continue/i }).or(page.locator('button[type="submit"]')).first();
  await continueBtn.click();
  console.log('Clicked Continue');

  // OTP step
  await page.waitForTimeout(2000);
  console.log('On OTP step. Filling 0000...');
  const otpInput = page.locator('input[type="text"], input[type="password"]').first();
  await otpInput.fill('0000');

  const verifyBtn = page.getByRole('button', { name: /verify/i }).or(page.locator('button[type="submit"]')).first();
  await verifyBtn.click();
  console.log('Clicked Verify Code. Waiting for redirect to patient portal...');

  await page.waitForURL(/patient/, { timeout: 30000 });
  console.log('Redirected to Patient Portal! URL:', page.url());

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'scratch/patient-portal-dashboard.png' });
  console.log('Captured screenshot to scratch/patient-portal-dashboard.png');

  const title = await page.title();
  console.log('Patient Portal Title:', title);

  const textPreview = await page.innerText('body');
  console.log('Patient Portal body text:\n', textPreview.slice(0, 800));

  await browser.close();
})();
