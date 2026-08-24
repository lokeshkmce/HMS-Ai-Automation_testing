/**
 * DOM Inspector Script — Omnivva HMS Portal
 *
 * Logs in as qa@omnivva.com, waits for the SPA to fully load,
 * then inspects and prints:
 *   1. The final URL after auth
 *   2. All elements matching Role Slider candidates
 *   3. The page title and any visible headings
 *   4. Screenshots of the landing state and after navigation
 *
 * Run: node scripts/inspect-portal-dom.js
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://dev-hms.srivyn.in';
const IDENTITY_URL = 'https://dev-identity.srivyn.in';
const USERNAME = 'qa@omnivva.com';
const PASSWORD = 'password123';

const screenshotDir = path.join(__dirname, '..', 'reports', 'dom-inspect');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // ── Step 1: Navigate to landing page (dev.omnivva.com → dev-hms.srivyn.in) ──
    console.log('\n=== STEP 1: Navigating to landing page ===');
    console.log('https://dev.omnivva.com');
    await page.goto('https://dev.omnivva.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '01-landing.png'), fullPage: true });
    console.log('Landing URL:', page.url());
    console.log('Page title:', await page.title());

    // ── Step 2: Click Staff Login button ─────────────────────────────────────
    console.log('\n=== STEP 2: Clicking Staff Login ===');
    const staffLoginBtn = page.getByRole('button', { name: /staff login/i })
      .or(page.locator('button:has-text("Staff"), a:has-text("Staff Login")'));
    
    try {
      await staffLoginBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await staffLoginBtn.click();
      console.log('Clicked Staff Login button');
    } catch {
      console.log('Staff Login button not found — navigating directly to identity login');
      const loginUrl =
        `${IDENTITY_URL}/login?client_id=OMNIVVA_STAFF_PORTAL` +
        `&redirect_uri=${encodeURIComponent(BASE_URL + '/api/auth/callback')}`;
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    }

    // Wait for identity server login page
    await page.waitForURL(url => url.hostname.includes('identity'), { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: path.join(screenshotDir, '02-identity-login.png'), fullPage: true });
    console.log('Identity URL:', page.url());

    // ── Step 3: Fill credentials ──────────────────────────────────────────────
    console.log('\n=== STEP 3: Filling credentials ===');
    const usernameInput = page.locator('input[placeholder*="Username" i], input[name="username"], input[name="email"]');
    const passwordInput = page.locator('input[placeholder*="Password" i], input[name="password"]');
    const signInBtn = page.locator('button[type="submit"], button:has-text("Sign In")').first();

    await usernameInput.fill(USERNAME);
    await passwordInput.fill(PASSWORD);
    console.log('Credentials filled — clicking Sign In');

    // ── Step 4: Click and capture auth response ───────────────────────────────
    const [authResponse] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/authenticate'), { timeout: 10000 }).catch(() => null),
      signInBtn.click(),
    ]);

    if (authResponse) {
      console.log(`Auth HTTP status: ${authResponse.status()} — ${authResponse.url()}`);
    }

    // ── Step 5: Wait for full redirect to portal — up to 90s ─────────────────
    console.log('\n=== STEP 5: Waiting for redirect to portal (up to 90s) ===');
    try {
      await page.waitForURL(
        url => url.hostname.includes('srivyn.in') && !url.hostname.includes('identity') && url.pathname !== '/',
        { timeout: 90_000 }
      );
      console.log('✓ Redirect complete — URL:', page.url());
    } catch {
      console.log('⚠ Redirect timed out after 90s — current URL:', page.url());
    }

    await page.screenshot({ path: path.join(screenshotDir, '02-after-auth.png'), fullPage: true });
    console.log('Screenshot saved: 02-after-auth.png');
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());

    // ── Step 5: If still on root, try navigating to /staff directly ──────────
    if (page.url().endsWith('/') || page.url() === BASE_URL) {
      console.log('\n=== Trying /staff navigation ===');
      await page.goto(`${BASE_URL}/staff`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(3000);
      console.log('URL after /staff nav:', page.url());
      await page.screenshot({ path: path.join(screenshotDir, '03-after-staff-nav.png'), fullPage: true });
    }

    // ── Step 6: Wait for dashboard layout to appear ───────────────────────────
    console.log('\n=== STEP 4: Waiting for dashboard layout ===');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '04-dashboard-state.png'), fullPage: true });

    // ── Step 7: Dump all elements with "role" in class/text ──────────────────
    console.log('\n=== STEP 5: Inspecting Role Slider candidates ===');
    const roleSliderCandidates = await page.evaluate(() => {
      const results = [];
      // Find all elements that contain "role" in text or class
      document.querySelectorAll('*').forEach(el => {
        const cls = el.className || '';
        const text = (el.textContent || '').trim().substring(0, 100);
        const tag = el.tagName;
        const id = el.id || '';
        if (
          (typeof cls === 'string' && cls.toLowerCase().includes('role')) ||
          text.toUpperCase().includes('ROLE SLIDER') ||
          text === 'Select Role' ||
          (id && id.toLowerCase().includes('role'))
        ) {
          results.push({ tag, id, cls: cls.substring(0, 80), text: text.substring(0, 60) });
        }
      });
      return results.slice(0, 30); // limit to 30
    });

    console.log(`Found ${roleSliderCandidates.length} Role Slider candidates:`);
    roleSliderCandidates.forEach((el, i) => {
      console.log(`  [${i}] <${el.tag}> id="${el.id}" class="${el.cls}" text="${el.text}"`);
    });

    // ── Step 8: Dump page structure summary ──────────────────────────────────
    console.log('\n=== STEP 6: Page structure ===');
    const structure = await page.evaluate(() => {
      const nav = document.querySelector('nav, aside, [role="navigation"]');
      const header = document.querySelector('header, [role="banner"]');
      const main = document.querySelector('main, [role="main"]');
      return {
        hasNav: !!nav,
        navClass: nav?.className?.substring(0, 80) || '',
        hasHeader: !!header,
        headerClass: header?.className?.substring(0, 80) || '',
        hasMain: !!main,
        bodyClasses: document.body.className.substring(0, 100),
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim() || '',
        h2: document.querySelector('h2')?.textContent?.trim() || '',
        h4: document.querySelector('h4')?.textContent?.trim() || '',
        h5: document.querySelector('h5')?.textContent?.trim() || '',
      };
    });
    console.log('Page structure:', JSON.stringify(structure, null, 2));

    // ── Step 9: Get all interactive elements on right side of page ───────────
    console.log('\n=== STEP 7: Elements on right edge of viewport ===');
    const rightEdgeElements = await page.evaluate(() => {
      const vw = window.innerWidth;
      const results = [];
      document.querySelectorAll('button, [role="button"], div[onclick], [tabindex]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > vw * 0.85 && rect.width < 60 && rect.height > 20) {
          const text = (el.textContent || '').trim().substring(0, 80);
          const cls = (el.className || '').substring(0, 80);
          results.push({ tag: el.tagName, cls, text, right: Math.round(rect.right), top: Math.round(rect.top) });
        }
      });
      return results.slice(0, 20);
    });
    console.log(`Right-edge elements (${rightEdgeElements.length}):`);
    rightEdgeElements.forEach(el => {
      console.log(`  <${el.tag}> class="${el.cls}" text="${el.text}" right=${el.right} top=${el.top}`);
    });

    console.log('\n=== Screenshots saved to:', screenshotDir, '===');
    console.log('Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (err) {
    console.error('Script error:', err.message);
    await page.screenshot({ path: path.join(screenshotDir, 'error-state.png'), fullPage: true });
  } finally {
    await browser.close();
    console.log('Done.');
  }
})();
