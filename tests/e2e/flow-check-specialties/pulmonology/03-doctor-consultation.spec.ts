import { test } from '../../../../fixtures/base.fixture';
import { consultPatientByDoctor, getSpecialtyConfig } from '../helper';

const SPECIALTY_SLUG = 'pulmonology';
const config = getSpecialtyConfig(SPECIALTY_SLUG);

test.describe(`${config.specialtyName} Flow — 03 Doctor Consultation @${config.specialtySlug} @doctor`, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(`[03-Doctor-Consultation] Complete Consultation for ${config.specialtyName} (${config.doctorName})`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    testInfo.annotations.push({
      type: 'Flow 3: Doctor Consultation',
      description: `${config.specialtyName} Doctor (${config.staffUsername}) completes 3-step consultation wizard`,
    });

    await consultPatientByDoctor(page, SPECIALTY_SLUG, testInfo);
  });
});
