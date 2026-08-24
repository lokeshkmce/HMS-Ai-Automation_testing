const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

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

  console.log('Step 2 loaded. Discovering facilities and specialties...');
  const facilityCombo = page.locator('.MuiSelect-select').nth(1);
  await facilityCombo.click();
  await page.waitForTimeout(800);

  const facOptions = page.locator('li[role="option"], [role="option"]');
  const facCount = await facOptions.count();
  const facilities = [];
  for (let i = 0; i < facCount; i++) {
    const t = (await facOptions.nth(i).textContent()) || '';
    if (t && !t.toLowerCase().includes('select facility')) {
      facilities.push(t.trim());
    }
  }
  console.log('Discovered Facilities:', facilities);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const results = [];

  for (const fac of facilities) {
    console.log(`\n========================================`);
    console.log(`Checking Facility: ${fac}`);
    console.log(`========================================`);
    await facilityCombo.click();
    await page.waitForTimeout(600);
    const opt = page.locator('li[role="option"], [role="option"]').filter({ hasText: new RegExp(fac, 'i') }).first();
    await opt.click();
    await page.waitForTimeout(800);

    const specCombo = page.locator('.MuiSelect-select').nth(2);
    await specCombo.click();
    await page.waitForTimeout(600);
    const specOptions = page.locator('li[role="option"], [role="option"]');
    const sCount = await specOptions.count();
    const specialties = [];
    for (let j = 0; j < sCount; j++) {
      const st = (await specOptions.nth(j).textContent()) || '';
      if (st && !st.toLowerCase().includes('select specialty')) {
        specialties.push(st.trim());
      }
    }
    console.log(`Specialties under "${fac}":`, specialties);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    for (const spec of specialties) {
      const sCombo = page.locator('.MuiSelect-select').nth(2);
      await sCombo.click();
      await page.waitForTimeout(600);
      const sOpt = page.locator('li[role="option"], [role="option"]').filter({ hasText: new RegExp(`^\\s*${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }).first();
      await sOpt.click();
      await page.waitForTimeout(600);

      // Advance to Step 3
      await page.getByRole('button', { name: /^Next$/i }).first().click();
      await page.waitForTimeout(1500);

      const noDocMsg = page.locator('text=/no doctors found/i, div:has-text("No doctors found")').first();
      const hasNoDoc = await noDocMsg.isVisible({ timeout: 1500 }).catch(() => false);
      const docCards = page.locator('main [class*="MuiCard-root"], main div[class*="Card"], main [class*="DoctorCard"], main text=/Dr\\./i');
      const docCount = await docCards.count().catch(() => 0);

      if (hasNoDoc || docCount === 0) {
        console.log(`  ❌ [${fac}] -> [${spec}]: NO DOCTORS FOUND`);
        results.push({ facility: fac, specialty: spec, available: false, doctors: 0 });
      } else {
        const cardText = (await docCards.first().textContent()) || '';
        console.log(`  ✓✓ [${fac}] -> [${spec}]: DOCTORS FOUND! (${cardText.slice(0, 50).replace(/\n/g, ' ')})`);
        results.push({ facility: fac, specialty: spec, available: true, doctors: docCount, sample: cardText.slice(0, 50) });
      }

      // Click Back to return to Step 2
      const backBtn = page.getByRole('button', { name: /^Back$/i }).first();
      await backBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  console.log('\n\n================ SUMMARY OF ALL AVAILABLE DOCTORS ================');
  console.log(JSON.stringify(results.filter(r => r.available), null, 2));

  await browser.close();
})();
