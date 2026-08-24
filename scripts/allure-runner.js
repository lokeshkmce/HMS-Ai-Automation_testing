'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ─── Portable JRE (optional) ──────────────────────────────────────────────────
// If a portable JRE is bundled in jdk17/, configure JAVA_HOME and PATH.
// Uses the correct path separator for the current OS (';' on Windows, ':' on Unix).
const javaHome = path.resolve(__dirname, '..', 'jdk17', 'jdk-17.0.10+7-jre');
const javaBin = path.join(javaHome, 'bin');
const pathSeparator = os.platform() === 'win32' ? ';' : ':';

if (fs.existsSync(javaBin)) {
  process.env.JAVA_HOME = javaHome;
  process.env.PATH = `${javaBin}${pathSeparator}${process.env.PATH}`;
  console.log(`[INFO] Portable JRE configured: ${javaHome}`);
}

// ─── Directories ─────────────────────────────────────────────────────────────
const resultsDir = path.resolve(__dirname, '..', 'reports', 'allure-results');
const reportDir = path.resolve(__dirname, '..', 'reports', 'allure-report');

// ─── Action dispatch ─────────────────────────────────────────────────────────
const action = process.argv[2] || 'generate';

switch (action) {
  case 'clean': {
    if (fs.existsSync(resultsDir)) {
      fs.rmSync(resultsDir, { recursive: true, force: true });
      console.log('[INFO] Cleaned reports/allure-results — ready for a fresh run');
    } else {
      console.log('[INFO] reports/allure-results does not exist — nothing to clean');
    }
    break;
  }

  case 'generate': {
    if (!fs.existsSync(resultsDir)) {
      console.error(
        '[ERROR] reports/allure-results not found. Run tests first to generate results.',
      );
      process.exit(1);
    }
    console.log('[INFO] Generating Allure HTML report...');
    execSync(
      `npx allure generate "${resultsDir}" -o "${reportDir}" --clean`,
      { stdio: 'inherit', env: process.env },
    );
    console.log(`[SUCCESS] Allure report generated in reports/allure-report`);
    break;
  }

  case 'open': {
    if (!fs.existsSync(reportDir)) {
      console.error(
        '[ERROR] reports/allure-report not found. Run "node scripts/allure-runner.js generate" first.',
      );
      process.exit(1);
    }
    console.log('[INFO] Opening Allure HTML report...');
    execSync(`npx allure open "${reportDir}"`, { stdio: 'inherit', env: process.env });
    break;
  }

  default: {
    console.error(`[ERROR] Unknown action: "${action}". Valid actions: clean | generate | open`);
    process.exit(1);
  }
}
