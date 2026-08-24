const fs = require('fs');
const path = require('path');

const testDataPath = path.resolve(__dirname, '../test-data/appointment-flow-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

const targetBaseDir = path.resolve(__dirname, '../tests/e2e/flow-check-specialties');

if (!fs.existsSync(targetBaseDir)) {
  fs.mkdirSync(targetBaseDir, { recursive: true });
}

// Map specialty slug to clean directory name matching user convention
const slugToFolder = {
  'cardio-surgery': 'cardio-surgery',
  'dental': 'dental',
  'ent': 'ent',
  'family-medicine': 'family-medicine',
  'gastro': 'gastroenterology',
  'derma': 'dermatology',
  'emergency-endo': 'emergency-endocrinology',
  'generalsurgery': 'general-surgery',
  'infectious-disease': 'infectious-disease',
  'internal-medicine': 'internal-medicine',
  'maternity': 'maternity',
  'nephrology': 'nephrology',
  'neurology': 'neurology',
  'neurosurgery': 'neurosurgery',
  'oncology': 'oncology',
  'opthalmology': 'ophthalmology',
  'orthopedics': 'orthopedics',
  'plastic-surgery': 'plastic-surgery',
  'psychiatry': 'psychiatry',
  'pulmonology': 'pulmonology',
  'rheumatology': 'rheumatology',
  'pmr-rehab': 'pmr-and-rehab',
  'urology': 'urology'
};

testData.specialties.forEach((specialty) => {
  const folderName = slugToFolder[specialty.specialtySlug] || specialty.specialtySlug;
  const specDir = path.join(targetBaseDir, folderName);

  if (!fs.existsSync(specDir)) {
    fs.mkdirSync(specDir, { recursive: true });
  }

  // 1. 01-patient-booking.spec.ts
  const bookingContent = `import { test } from '../../../../fixtures/base.fixture';
import { bookPatientAppointment, getSpecialtyConfig } from '../helper';

const SPECIALTY_SLUG = '${specialty.specialtySlug}';
const config = getSpecialtyConfig(SPECIALTY_SLUG);

test.describe(\`\${config.specialtyName} Flow — 01 Patient Booking @\${config.specialtySlug} @booking\`, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(\`[01-Patient-Booking] Book Appointment for \${config.specialtyName} (\${config.doctorName})\`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    testInfo.annotations.push({
      type: 'Flow 1: Patient Booking',
      description: \`Patient booking for \${config.specialtyName} (\${config.doctorName}) at \${config.facility}\`,
    });

    await bookPatientAppointment(page, SPECIALTY_SLUG, testInfo);
  });
});
`;

  // 2. 02-receptionist-triage.spec.ts
  const receptionContent = `import { test } from '../../../../fixtures/base.fixture';
import { checkInPatientAtReception, getSpecialtyConfig } from '../helper';

const SPECIALTY_SLUG = '${specialty.specialtySlug}';
const config = getSpecialtyConfig(SPECIALTY_SLUG);

test.describe(\`\${config.specialtyName} Flow — 02 Receptionist Triage & Check-in @\${config.specialtySlug} @reception\`, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(\`[02-Receptionist-Triage] Check-In Patient for \${config.specialtyName}\`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    testInfo.annotations.push({
      type: 'Flow 2: Receptionist Check-In',
      description: \`Receptionist checks in patient for \${config.specialtyName} under \${config.staffUsername}\`,
    });

    await checkInPatientAtReception(page, SPECIALTY_SLUG, testInfo);
  });
});
`;

  // 3. 03-doctor-consultation.spec.ts
  const consultationContent = `import { test } from '../../../../fixtures/base.fixture';
import { consultPatientByDoctor, getSpecialtyConfig } from '../helper';

const SPECIALTY_SLUG = '${specialty.specialtySlug}';
const config = getSpecialtyConfig(SPECIALTY_SLUG);

test.describe(\`\${config.specialtyName} Flow — 03 Doctor Consultation @\${config.specialtySlug} @doctor\`, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(\`[03-Doctor-Consultation] Complete Consultation for \${config.specialtyName} (\${config.doctorName})\`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    testInfo.annotations.push({
      type: 'Flow 3: Doctor Consultation',
      description: \`\${config.specialtyName} Doctor (\${config.staffUsername}) completes 3-step consultation wizard\`,
    });

    await consultPatientByDoctor(page, SPECIALTY_SLUG, testInfo);
  });
});
`;

  fs.writeFileSync(path.join(specDir, '01-patient-booking.spec.ts'), bookingContent, 'utf8');
  fs.writeFileSync(path.join(specDir, '02-receptionist-triage.spec.ts'), receptionContent, 'utf8');
  fs.writeFileSync(path.join(specDir, '03-doctor-consultation.spec.ts'), consultationContent, 'utf8');

  console.log(`Generated specialty tests for: ${folderName} (${specialty.specialtyName})`);
});

console.log(`Successfully generated all 23 specialty test directories!`);
