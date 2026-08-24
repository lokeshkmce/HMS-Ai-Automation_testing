import { test } from '../../../../fixtures/base.fixture';
import { bookPatientAppointment, getSpecialtyConfig } from '../helper';

const SPECIALTY_SLUG = 'internal-medicine';
const config = getSpecialtyConfig(SPECIALTY_SLUG);

test.describe(`${config.specialtyName} Flow — 01 Patient Booking @${config.specialtySlug} @booking`, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test(`[01-Patient-Booking] Book Appointment for ${config.specialtyName} (${config.doctorName})`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    testInfo.annotations.push({
      type: 'Flow 1: Patient Booking',
      description: `Patient booking for ${config.specialtyName} (${config.doctorName}) at ${config.facility}`,
    });

    await bookPatientAppointment(page, SPECIALTY_SLUG, testInfo);
  });
});
