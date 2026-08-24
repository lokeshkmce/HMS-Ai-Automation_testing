/**
 * Quick Test & Discovery for all 13 roles
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://dev-hms.srivyn.in';
const USERNAME = 'qa@omnivva.com';
const PASSWORD = 'password123';

const rolesData = require('../test-data/portal-dashboard-data.json');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to landing page:', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('2. Clicking Staff Login button...');
    const staffBtn = page.getByRole('button', { name: /staff login/i }).or(page.locator('button:has-text("Staff")')).first();
    await staffBtn.waitFor({ state: 'visible', timeout: 10000 });
    await staffBtn.click();

    console.log('3. Waiting for identity login page...');
    await page.waitForURL(url => url.hostname.includes('identity'), { timeout: 30000 });
    console.log('Identity URL:', page.url());

    console.log('4. Logging in as', USERNAME);
    await page.locator('input[placeholder*="Username" i], input[name="username"], input[name="email"]').fill(USERNAME);
    await page.locator('input[placeholder*="Password" i], input[name="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"], button:has-text("Sign In")').first().click();

    console.log('5. Waiting for redirect to dashboard...');
    await page.waitForURL(url => url.pathname.includes('/staff') || url.pathname.includes('/dashboard'), { timeout: 60000 });
    console.log('Reached URL:', page.url());

    await page.waitForTimeout(3000);

    // Click Role Slider
    console.log('6. Clicking Role Slider tab...');
    const roleSliderBtn = page.locator('button:has-text("Role Slider")').or(page.getByRole('button', { name: 'Role Slider' })).first();
    await roleSliderBtn.waitFor({ state: 'visible', timeout: 10000 });
    await roleSliderBtn.click();
    await page.waitForTimeout(1000);

    // Find all roles in panel
    console.log('7. Listing roles in panel...');
    const panelElements = await page.evaluate(() => {
      const panel = document.querySelector('h3');
      const container = panel ? panel.closest('div') : document.body;
      const buttons = Array.from(document.querySelectorAll('button, li, [role="button"], [role="option"], p, h6, span, div'))
        .filter(el => {
          const t = el.textContent?.trim();
          return t && (
            t === 'Doctor' || t === 'Nurse' || t === 'Admin' || t === 'Receptionist' || 
            t.includes('Billing') || t.includes('Admin') || t.includes('Pharmacy') || 
            t.includes('Lab') || t.includes('Radiology') || t.includes('Group') ||
            t.includes('Medical Records') || t.includes('Inventory')
          );
        })
        .map(el => ({
          tag: el.tagName,
          text: el.textContent.trim(),
          cls: el.className,
          rect: el.getBoundingClientRect()
        }));
      return buttons;
    });

    console.log('Matching role elements in DOM:', JSON.stringify(panelElements, null, 2));

    // Now test clicking each role
    const results = [];
    for (const portal of rolesData.portals) {
      console.log(`\n--- Testing Role: ${portal.role} ---`);
      try {
        // Ensure panel is open
        const isPanelVisible = await page.locator('h3:has-text("Select Role")').isVisible();
        if (!isPanelVisible) {
          console.log('Re-opening Role Slider...');
          await roleSliderBtn.click();
          await page.waitForTimeout(1000);
        }

        // Click role
        console.log(`Clicking role: ${portal.role}`);
        const roleItem = page.locator(`text="${portal.role}"`).or(page.getByRole('button', { name: portal.role })).first();
        await roleItem.click({ timeout: 5000 });

        // Wait for URL / dashboard change
        await page.waitForTimeout(2000);
        console.log(`Current URL after selecting ${portal.role}:`, page.url());
        
        const heading = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
        console.log(`Headings:`, heading.slice(0, 5).join(' | '));
        
        results.push({ role: portal.role, url: page.url(), success: true });
      } catch (e) {
        console.error(`Failed on role ${portal.role}:`, e.message);
        results.push({ role: portal.role, url: page.url(), success: false, error: e.message });
      }
    }

    console.log('\n=== FINAL TEST SUMMARY ===');
    console.table(results);

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    await browser.close();
  }
})();
