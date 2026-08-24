import { test } from '../fixtures/base.fixture';
import { PatientPortalPage } from '../pages/patient-portal.page';
import { PatientBookingPage } from '../pages/patient-booking.page';
import testData from '../test-data/appointment-flow-data.json';

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

  // Let's inspect step 3 in detail!
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
      style: el.getAttribute('style'),
      outerHTML: el.outerHTML.slice(0, 200)
    }));
  });

  console.log('DOM Elements matching Dr. QA Dental:', JSON.stringify(step3Details, null, 2));

  // Check next button
  const nextBtn = page.locator('main button:has-text("Next"), main button[type="submit"]').first();
  console.log('Next button disabled initially:', await nextBtn.isDisabled());

  // Test what selector actually selects the doctor
  console.log('Testing clicking on various elements...');
  
  // Try 1: Click text directly
  console.log('Clicking h6 / text Dr. QA Dental...');
  await page.locator('text="Dr. QA Dental"').first().click();
  await page.waitForTimeout(1000);
  console.log('Next disabled after text click:', await nextBtn.isDisabled());

  // Try 2: Click card container (div with border / MuiPaper / MuiCard / etc)
  if (await nextBtn.isDisabled()) {
    console.log('Clicking card by cursor:pointer or Card class or parent container...');
    const cardEl = page.locator('div[class*="Card"], div[class*="MuiPaper"], div[class*="MuiBox"]').filter({ hasText: 'Dr. QA Dental' }).last();
    console.log('Card last element html:', await cardEl.evaluate(e => e.outerHTML.slice(0, 150)));
    await cardEl.click({ force: true });
    await page.waitForTimeout(1000);
    console.log('Next disabled after cardEl click:', await nextBtn.isDisabled());
  }

  // Try 3: Check all clickable elements inside the card
  if (await nextBtn.isDisabled()) {
    const allDivs = page.locator('main div').filter({ hasText: 'Dr. QA Dental' });
    const count = await allDivs.count();
    console.log(`There are ${count} divs with "Dr. QA Dental"`);
    for (let i = 0; i < count; i++) {
      await allDivs.nth(i).click({ force: true }).catch(() => {});
      const dis = await nextBtn.isDisabled();
      console.log(`Div ${i} click -> Next disabled: ${dis}`);
      if (!dis) {
        console.log(`SUCCESS with Div ${i}! Tag:`, await allDivs.nth(i).evaluate(e => e.outerHTML.slice(0, 150)));
        break;
      }
    }
  }
});
