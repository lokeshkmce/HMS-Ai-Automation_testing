import { test } from '../../../../fixtures/base.fixture';
import { checkInPatientAtReception, getSpecialtyConfig } from '../helper';

const SPECIALTY_SLUG = 'generalsurgery';
const config = getSpecialtyConfig(SPECIALTY_SLUG);

test.describe(`${config.specialtyName} Flow — 02 Receptionist Triage & Check-in @${config.specialtySlug} @reception`, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(`[02-Receptionist-Triage] Check-In Patient for ${config.specialtyName}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    testInfo.annotations.push({
      type: 'Flow 2: Receptionist Check-In',
      description: `Receptionist checks in patient for ${config.specialtyName} under ${config.staffUsername}`,
    });

    await checkInPatientAtReception(page, SPECIALTY_SLUG, testInfo);
  });
});
