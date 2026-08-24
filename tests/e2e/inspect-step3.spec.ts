import { test } from '../../fixtures/base.fixture';
import { PatientPortalPage } from '../../pages/patient-portal.page';
import { PatientBookingPage } from '../../pages/patient-booking.page';
import testData from '../../test-data/appointment-flow-data.json';

test('Inspect Step 3 Selection', async ({ page }) => {
  test.setTimeout(120_000);
  const patientPortal = new PatientPortalPage(page);
  const patientBooking = new PatientBookingPage(page);

  await patientPortal.gotoLandingPage();
  await patientPortal.clickPatientLogin();
  await patientPortal.loginAsPatient(testData.patient.email, testData.patient.otp);
  await patientPortal.expectPatientDashboardLoaded();

  await patientBooking.navigateToBooking();
  await patientBooking.step1_SelectReason('In-Person Visit', 'Routine Checkup');
  await patientBooking.step2_FindDoctor('MedCare General Hospital', 'Dental');

  console.log('=== ON STEP 3 ===');
  const step3Details = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('main *'));
    return allElements.filter(el => el.textContent && el.textContent.includes('Dr. QA Dental')).map(el => ({
      tagName: el.tagName,
      className: el.className,
      id: el.id,
      role: el.getAttribute('role'),
      tabIndex: el.getAttribute('tabindex'),
      ariaSelected: el.getAttribute('aria-selected'),
      outerHTML: el.outerHTML.slice(0, 200)
    }));
  });

  console.log('DOM Elements matching Dr. QA Dental:', JSON.stringify(step3Details, null, 2));

  const nextBtn = page.locator('main button:has-text("Next"), main button[type="submit"]').first();
  console.log('Next button disabled initially:', await nextBtn.isDisabled());

  // Test what selector actually selects the doctor card!
  console.log('Testing clicking on various elements...');
  
  // Try 1: Click text directly
  console.log('Clicking text="Dr. QA Dental"...');
  await page.locator('text="Dr. QA Dental"').first().click();
  await page.waitForTimeout(1000);
  console.log('Next disabled after text click:', await nextBtn.isDisabled());

  // Try 2: Click all matching elements one by one until next is enabled
  if (await nextBtn.isDisabled()) {
    const allMatching = page.locator('main *').filter({ hasText: 'Dr. QA Dental' });
    const count = await allMatching.count();
    console.log(`Total elements with Dr. QA Dental: ${count}`);
    for (let i = count - 1; i >= 0; i--) {
      const el = allMatching.nth(i);
      const tag = await el.evaluate(e => `${e.tagName}.${e.className}`);
      console.log(`Trying element [${i}]: ${tag}`);
      await el.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      const dis = await nextBtn.isDisabled();
      console.log(`  -> Next disabled: ${dis}`);
      if (!dis) {
        console.log(`🎉 SUCCESS! Element [${i}] enabled Next: ${tag}`);
        console.log('Full element HTML:', await el.evaluate(e => e.outerHTML));
        break;
      }
    }
  }
});
