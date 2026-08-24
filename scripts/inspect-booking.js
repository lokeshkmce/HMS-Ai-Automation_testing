const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to landing page...');
    await page.goto('https://dev-hms.srivyn.in/');
    
    console.log('Clicking Patient Login...');
    await page.getByRole('button', { name: 'Patient Login' }).click();
    await page.waitForTimeout(2000);

    console.log('Filling patient login...');
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"], input[name="email"]').first();
    await emailInput.fill('patient.test@gmail.com');
    await page.getByRole('button', { name: /continue|login|submit/i }).first().click();
    await page.waitForTimeout(2000);

    const otpInput = page.locator('input[placeholder*="otp" i], input[maxlength="1"], input[type="password"], input[type="tel"]').first();
    if (await otpInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await otpInput.fill('0000');
      await page.getByRole('button', { name: /verify|submit|continue/i }).first().click();
    }
    await page.waitForURL(url => url.pathname.includes('/patient'), { timeout: 30000 });
    console.log('Logged in as patient, URL:', page.url());

    console.log('Navigating to /patient/book-doctor...');
    await page.goto('https://dev-hms.srivyn.in/patient/book-doctor');
    await page.waitForTimeout(2000);

    // Step 1
    console.log('Step 1: Selecting Reason...');
    await page.getByText('In-Person Visit').first().click();
    await page.getByText('Routine Checkup').first().click();
    await page.locator('button:has-text("Next")').first().click();
    await page.waitForTimeout(1500);
    console.log('Step 2 loaded. URL:', page.url());

    // Check SEARCH BY SPECIALTY tab
    const specialtyTab = page.locator('button:has-text("SEARCH BY SPECIALTY"), [role="tab"]:has-text("SPECIALTY")').first();
    if (await specialtyTab.isVisible()) {
      console.log('Found SEARCH BY SPECIALTY tab, clicking it...');
      await specialtyTab.click();
      await page.waitForTimeout(1000);
      const cardsOrButtons = await page.locator('.MuiCard-root, [role="button"], button').allInnerTexts();
      console.log('Under SEARCH BY SPECIALTY:', cardsOrButtons.filter(t => t.includes('Dental') || t.includes('Doctor') || (t.length < 50 && t.length > 2)).slice(0, 30));
    }

    // Check SEARCH BY FACILITY tab
    const facilityTab = page.locator('button:has-text("SEARCH BY FACILITY"), [role="tab"]:has-text("FACILITY")').first();
    if (await facilityTab.isVisible()) {
      console.log('Found SEARCH BY FACILITY tab, clicking it...');
      await facilityTab.click();
      await page.waitForTimeout(1000);
      
      const combos = page.locator('.MuiSelect-select, [role="combobox"]');
      const count = await combos.count();
      console.log(`Combobox count: ${count}`);
      for (let i = 0; i < count; i++) {
        console.log(`Combo ${i}:`, await combos.nth(i).innerText());
      }

      // Open second combo (specialty)
      if (count >= 2) {
        await combos.nth(1).click();
        await page.waitForTimeout(1000);
        const options = await page.locator('li[role="option"]').allInnerTexts();
        console.log('Options in specialty dropdown:', options);
      }
    }

  } catch (err) {
    console.error('Error during inspect:', err);
  } finally {
    await browser.close();
  }
})();
