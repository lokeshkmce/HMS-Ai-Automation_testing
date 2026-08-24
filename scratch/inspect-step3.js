const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to landing page...');
    await page.goto('https://dev-hms.srivyn.in/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('Clicking Patient Login...');
    await page.getByRole('button', { name: 'Patient Login' }).first().click({ force: true });
    await page.waitForURL(/dev-identity\.srivyn\.in/, { timeout: 30000 });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[type="text"]').first();
    await emailInput.fill('patient.test@gmail.com');
    const continueBtn = page.getByRole('button', { name: /continue/i }).or(page.locator('button[type="submit"]')).first();
    await continueBtn.click();
    await page.waitForTimeout(2000);

    const otpInput = page.locator('input[type="text"], input[type="password"]').first();
    await otpInput.fill('0000');
    const verifyBtn = page.getByRole('button', { name: /verify/i }).or(page.locator('button[type="submit"]')).first();
    await verifyBtn.click();

    await page.waitForURL(/patient/, { timeout: 30000 });
    console.log('Logged in successfully to Patient Portal!');

    await page.goto('https://dev-hms.srivyn.in/patient/book-doctor', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Step 1: Reason
    console.log('Step 1: Selecting Routine Checkup...');
    const routineChip = page.getByText('Routine Checkup', { exact: false }).first();
    await routineChip.waitFor({ state: 'visible', timeout: 10000 });
    await routineChip.click();
    await page.waitForTimeout(500);
    const nextBtn = page.getByRole('button', { name: /^Next$/i }).first();
    await nextBtn.click();
    await page.waitForTimeout(1500);

    // Step 2: Select Facility & Dental
    console.log('Step 2: Selecting Facility & Dental...');
    const facilityCombo = page.locator('main .MuiSelect-select').nth(1);
    await facilityCombo.click();
    await page.waitForTimeout(800);
    
    // Select MedCare General Hospital or LifeLine
    const facOpt = page.locator('li[role="option"]').filter({ hasText: /MedCare General Hospital/i }).first();
    if (await facOpt.isVisible()) {
      await facOpt.click();
    } else {
      await page.locator('li[role="option"]').nth(0).click();
    }
    await page.waitForTimeout(1000);

    const specCombo = page.locator('main .MuiSelect-select').nth(2);
    await specCombo.click();
    await page.waitForTimeout(800);
    const dentalOpt = page.locator('li[role="option"]').filter({ hasText: /Dental/i }).first();
    await dentalOpt.click();
    await page.waitForTimeout(800);

    // Click Next to go to Step 3
    await page.getByRole('button', { name: /^Next$/i }).first().click();
    await page.waitForTimeout(2000);

    console.log('Arrived on Step 3: Select Doctor!');
    
    // Inspect DOM on Step 3
    const step3Info = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('main div, main button, main card'))
        .filter(el => el.innerText && el.innerText.includes('Dr. QA Dental'));
      
      return cards.map(c => ({
        tagName: c.tagName,
        className: c.className,
        role: c.getAttribute('role'),
        textSummary: c.innerText.slice(0, 80).replace(/\n/g, ' '),
        childrenCount: c.children.length,
        hasOnClick: typeof c.onclick === 'function' || c.getAttribute('onclick') !== null
      }));
    });

    console.log('Elements with text "Dr. QA Dental":', JSON.stringify(step3Info, null, 2));

    // Check Next button state before click
    const nextBtnDisabledBefore = await page.getByRole('button', { name: /^Next$/i }).first().isDisabled();
    console.log('Next button disabled BEFORE clicking card:', nextBtnDisabledBefore);

    // Try clicking doctor card via different selectors:
    // 1. Text containing "Dr. QA Dental"
    const heading = page.locator('text=Dr. QA Dental').first();
    console.log('Clicking "text=Dr. QA Dental"...');
    await heading.click();
    await page.waitForTimeout(1000);

    const nextBtnDisabledAfter1 = await page.getByRole('button', { name: /^Next$/i }).first().isDisabled();
    console.log('Next button disabled AFTER clicking text=Dr. QA Dental:', nextBtnDisabledAfter1);

    // If still disabled, check all clickable elements around the card
    const cardEl = page.locator('div').filter({ hasText: /Dr\. QA Dental/ }).filter({ hasText: /yrs exp/ }).first();
    console.log('Clicking card container with "yrs exp"...');
    await cardEl.click();
    await page.waitForTimeout(1000);

    const nextBtnDisabledAfter2 = await page.getByRole('button', { name: /^Next$/i }).first().isDisabled();
    console.log('Next button disabled AFTER clicking card container:', nextBtnDisabledAfter2);

  } catch (err) {
    console.error('Inspect error:', err);
  } finally {
    await browser.close();
  }
})();
