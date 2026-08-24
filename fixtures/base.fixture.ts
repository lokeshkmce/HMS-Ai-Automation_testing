import { test as base, TestInfo } from '@playwright/test';
import { OmnivvaLoginPage } from '../pages/omnivva-login.page';
import { RoleSliderPage } from '../pages/role-slider.page';
import { PortalDashboardPage } from '../pages/portal-dashboard.page';
import { PatientPortalPage } from '../pages/patient-portal.page';
import { ApiClient } from '../utils/api-client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extended test fixtures that provide page objects and utilities
 * to every test automatically.
 */
type AppFixtures = {
  omnivvaLoginPage: OmnivvaLoginPage;
  roleSliderPage: RoleSliderPage;
  portalDashboardPage: PortalDashboardPage;
  patientPortalPage: PatientPortalPage;
  apiClient: ApiClient;
};

export const test = base.extend<AppFixtures>({
  omnivvaLoginPage: async ({ page }, use) => {
    await use(new OmnivvaLoginPage(page));
  },

  roleSliderPage: async ({ page }, use) => {
    await use(new RoleSliderPage(page));
  },

  portalDashboardPage: async ({ page }, use) => {
    await use(new PortalDashboardPage(page));
  },

  patientPortalPage: async ({ page }, use) => {
    await use(new PatientPortalPage(page));
  },

  apiClient: async ({}, use) => {
    // ApiClient without a baseURL argument uses environment.apiBaseURL as default
    const client = await new ApiClient().init();
    await use(client);
    await client.dispose();
  },
});

export { expect } from '@playwright/test';
