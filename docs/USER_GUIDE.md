# Playwright Automation Framework — User Guide

A complete guide to understanding, using, and extending this enterprise-grade Playwright automation framework.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Project Structure](#2-project-structure)
3. [Configuration](#3-configuration)
4. [Writing Your First E2E Test](#4-writing-your-first-e2e-test)
5. [Page Object Model (POM)](#5-page-object-model-pom)
6. [Reusable Components](#6-reusable-components)
7. [Custom Fixtures](#7-custom-fixtures)
8. [Data-Driven Testing](#8-data-driven-testing)
9. [API Testing](#9-api-testing)
10. [Tagging and Filtering Tests](#10-tagging-and-filtering-tests)
11. [Authentication and Session Reuse](#11-authentication-and-session-reuse)
12. [Utilities Reference](#12-utilities-reference)
13. [Reporting](#13-reporting)
14. [Running Tests](#14-running-tests)
15. [CI/CD Pipeline](#15-cicd-pipeline)
16. [Docker](#16-docker)
17. [Code Quality](#17-code-quality)
18. [Recipes and Patterns](#18-recipes-and-patterns)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Getting Started

### Prerequisites

- **Node.js** 18 or later (20 recommended)
- **npm** 9+ (comes with Node.js)
- **Git** (for version control)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd framework

# Install dependencies
npm install

# Install Playwright browsers (Chromium, Firefox, WebKit)
npx playwright install --with-deps
```

### Verify Installation

```bash
# Run API tests (no browser needed for first verification)
npm run test:api

# Run all tests
npm test
```

### Quick Commands

| Command                    | What it does                          |
| -------------------------- | ------------------------------------- |
| `npm test`                 | Run all tests                         |
| `npm run test:smoke`       | Run only `@smoke` tests              |
| `npm run test:regression`  | Run only `@regression` tests          |
| `npm run test:api`         | Run API tests only                    |
| `npm run test:ui`          | Run UI tests on all browsers          |
| `npm run test:headed`      | Run with visible browser              |
| `npm run test:debug`       | Launch Playwright Inspector           |
| `npm run report:html`      | Open the HTML test report             |
| `npm run lint`             | Check code with ESLint                |
| `npm run format`           | Format code with Prettier             |

---

## 2. Project Structure

```
framework/
│
├── tests/                        # All test specifications
│   ├── e2e/                      #   End-to-end UI tests
│   │   ├── login.spec.ts
│   │   └── dashboard.spec.ts
│   └── api/                      #   API tests
│       └── users-api.spec.ts
│
├── pages/                        # Page Object Model classes
│   ├── base.page.ts              #   Base class — all pages extend this
│   ├── login.page.ts
│   └── dashboard.page.ts
│
├── components/                   # Reusable UI component classes
│   ├── navbar.component.ts
│   └── table.component.ts
│
├── fixtures/                     # Test fixtures and global hooks
│   ├── base.fixture.ts           #   Custom fixtures (auto-injects page objects)
│   ├── global-setup.ts           #   Runs once before all tests (login + session)
│   └── global-teardown.ts        #   Runs once after all tests (cleanup)
│
├── utils/                        # Utility modules
│   ├── api-client.ts             #   HTTP client for API testing
│   ├── logger.ts                 #   Winston-based logger
│   ├── helpers.ts                #   Wait, retry, assertion helpers
│   ├── file-utils.ts             #   JSON/CSV read/write utilities
│   └── test-data-loader.ts       #   Load test data from test-data/
│
├── config/                       # Application configuration
│   ├── environment.ts            #   Typed environment config
│   └── env/                      #   Environment-specific .env files
│       ├── .env.dev
│       ├── .env.qa
│       └── .env.prod
│
├── test-data/                    # Test data files (JSON, CSV)
│   ├── users.json
│   └── api-users.json
│
├── reports/                      # Generated reports (gitignored)
├── scripts/                      # Shell helper scripts
├── .github/workflows/            # CI/CD pipeline
│
├── playwright.config.ts          # Playwright configuration
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.json                # Linting rules
├── .prettierrc                   # Formatting rules
├── Dockerfile                    # Container support
├── .env                          # Local overrides (gitignored)
└── .env.example                  # Template for .env
```

### Where to put things

| You want to...                     | Put it in...          |
| ---------------------------------- | --------------------- |
| Write a new UI test                | `tests/e2e/`          |
| Write a new API test               | `tests/api/`          |
| Create a page object               | `pages/`              |
| Create a reusable UI component     | `components/`         |
| Add test data (JSON/CSV)           | `test-data/`          |
| Add a shared utility function      | `utils/`              |
| Add a new custom fixture           | `fixtures/`           |
| Configure a new environment        | `config/env/`         |

---

## 3. Configuration

### Environment Files

The framework supports multiple environments. Set the target with `TEST_ENV`:

```bash
# Default: dev
npm test

# Target QA
TEST_ENV=qa npm test

# Target production
TEST_ENV=prod npm test
```

Each environment has its own file in `config/env/`:

```ini
# config/env/.env.dev
BASE_URL=https://opensource-demo.orangehrmlive.com
API_BASE_URL=https://jsonplaceholder.typicode.com
USERNAME=Admin
PASSWORD=admin123
API_TOKEN=
```

**Resolution order** (later overrides earlier):

1. Defaults in `config/environment.ts`
2. `config/env/.env.{TEST_ENV}`
3. Root `.env` (local overrides, gitignored)
4. Command-line environment variables

### Adding a New Environment

1. Create `config/env/.env.staging`:
   ```ini
   BASE_URL=https://staging.myapp.com
   API_BASE_URL=https://api-staging.myapp.com
   USERNAME=testuser
   PASSWORD=testpass123
   API_TOKEN=your-staging-token
   ```

2. Run tests against it:
   ```bash
   TEST_ENV=staging npm test
   ```

### Playwright Config Overview

The `playwright.config.ts` defines five test projects:

| Project         | Browser          | Test Directory | Notes                          |
| --------------- | ---------------- | -------------- | ------------------------------ |
| `chromium`      | Desktop Chrome   | `tests/e2e/`   | Uses authenticated session     |
| `firefox`       | Desktop Firefox  | `tests/e2e/`   | Uses authenticated session     |
| `webkit`        | Desktop Safari   | `tests/e2e/`   | Uses authenticated session     |
| `mobile-chrome` | Pixel 5          | `tests/e2e/`   | Mobile viewport emulation      |
| `api`           | None (HTTP only) | `tests/api/`   | No browser, no session storage |

Key settings:

```
Timeout:            60 seconds per test
Action timeout:     15 seconds per action
Navigation timeout: 30 seconds per navigation
Parallel:           Fully parallel
Retries:            0 locally, 2 in CI
Traces:             Captured on first retry
Screenshots:        Captured on failure
Video:              Retained on failure
```

---

## 4. Writing Your First E2E Test

### Step 1 — Create a Test File

Create `tests/e2e/my-feature.spec.ts`:

```typescript
import { test, expect } from '../../fixtures/base.fixture';

test.describe('My Feature', () => {

  test('should do something important @smoke', async ({ page }) => {
    await page.goto('/web/index.php/dashboard/index');
    await expect(page).toHaveURL(/dashboard/);
  });

});
```

### Step 2 — Run It

```bash
# Run just your file
npx playwright test tests/e2e/my-feature.spec.ts

# Run in headed mode to watch the browser
npx playwright test tests/e2e/my-feature.spec.ts --headed

# Debug with Playwright Inspector
npx playwright test tests/e2e/my-feature.spec.ts --debug
```

### Step 3 — Use Page Objects (Recommended)

Instead of raw selectors in tests, use page objects:

```typescript
import { test, expect } from '../../fixtures/base.fixture';

test.describe('My Feature', () => {

  test('should navigate to dashboard @smoke', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectOnDashboard();

    const heading = await dashboardPage.getHeadingText();
    expect(heading).toContain('Dashboard');
  });

});
```

The `dashboardPage` fixture is automatically injected — no manual setup needed.

---

## 5. Page Object Model (POM)

### Architecture

Every page object extends `BasePage`, which provides shared actions:

```
BasePage (pages/base.page.ts)
  ├── LoginPage (pages/login.page.ts)
  ├── DashboardPage (pages/dashboard.page.ts)
  └── YourNewPage (pages/your-new.page.ts)
```

### BasePage — Available Methods

```typescript
// Navigation
await page.navigate('/path');              // Go to a relative URL
await page.getCurrentUrl();                // Get current URL string
await page.getTitle();                     // Get page title

// Element Interactions
await page.click(locator);                 // Wait for visible + click
await page.fill(locator, 'value');         // Wait for visible + fill
await page.selectOption(locator, 'value'); // Select dropdown option
await page.getText(locator);               // Get element text
await page.isVisible(locator, timeout?);   // Check if visible (returns boolean)

// Waits
await page.waitForPageLoad();              // Wait for DOM content loaded
await page.waitForNetworkIdle();           // Wait for no pending requests
await page.waitForSelector('.css');        // Wait for selector to appear

// Assertions
await page.expectUrl('dashboard');         // Assert URL contains string
await page.expectTitle(/Dashboard/);       // Assert page title
await page.expectVisible(locator);         // Assert element is visible
await page.expectText(locator, 'text');    // Assert element text

// Utilities
await page.screenshot('name');             // Capture full-page screenshot
```

### Creating a New Page Object

**Example: Creating an Employees page**

#### 1. Create the Page Class

```typescript
// pages/employees.page.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export class EmployeesPage extends BasePage {
  // ─── Locators ───────────────────────────────────────────
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly employeeTable: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.locator('button:has-text("Add")');
    this.searchInput = page.locator('input[placeholder="Type for hints..."]');
    this.employeeTable = page.locator('.oxd-table');
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.saveButton = page.locator('button[type="submit"]');
    this.successMessage = page.locator('.oxd-toast--success');
  }

  // ─── Actions ────────────────────────────────────────────
  async goto(): Promise<void> {
    await this.navigate('/web/index.php/pim/viewEmployeeList');
  }

  async clickAdd(): Promise<void> {
    await this.click(this.addButton);
    await this.waitForPageLoad();
  }

  async addEmployee(firstName: string, lastName: string): Promise<void> {
    logger.info(`Adding employee: ${firstName} ${lastName}`);
    await this.clickAdd();
    await this.fill(this.firstNameInput, firstName);
    await this.fill(this.lastNameInput, lastName);
    await this.click(this.saveButton);
    await this.waitForPageLoad();
  }

  async searchEmployee(name: string): Promise<void> {
    logger.info(`Searching for employee: ${name}`);
    await this.fill(this.searchInput, name);
  }

  // ─── Assertions ─────────────────────────────────────────
  async expectOnEmployeesPage(): Promise<void> {
    await this.expectUrl('viewEmployeeList');
  }

  async expectSuccessToast(): Promise<void> {
    await this.expectVisible(this.successMessage);
  }
}
```

#### 2. Register it as a Fixture

Add to `fixtures/base.fixture.ts`:

```typescript
import { EmployeesPage } from '../pages/employees.page';

type AppFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  navbar: NavbarComponent;
  apiClient: ApiClient;
  employeesPage: EmployeesPage;       // ← Add here
};

export const test = base.extend<AppFixtures>({
  // ... existing fixtures ...

  employeesPage: async ({ page }, use) => {
    await use(new EmployeesPage(page));
  },
});
```

#### 3. Use it in Tests

```typescript
// tests/e2e/employees.spec.ts
import { test, expect } from '../../fixtures/base.fixture';

test.describe('Employee Management', () => {

  test('should add a new employee @regression', async ({ employeesPage }) => {
    await employeesPage.goto();
    await employeesPage.addEmployee('John', 'Doe');
    await employeesPage.expectSuccessToast();
  });

  test('should display employees list @smoke', async ({ employeesPage }) => {
    await employeesPage.goto();
    await employeesPage.expectOnEmployeesPage();
    await employeesPage.expectVisible(employeesPage.employeeTable);
  });

});
```

### Page Object Best Practices

| Do                                          | Don't                                       |
| ------------------------------------------- | -------------------------------------------- |
| Define locators as class properties          | Put raw selectors in test files              |
| One page object per page/view               | Cram multiple pages into one class           |
| Keep assertions in the page object           | Write complex assertion logic in tests       |
| Use `BasePage` methods for interactions      | Call `page.locator().click()` directly       |
| Log meaningful actions via `logger`          | Log every single line                        |
| Name methods after user actions              | Name methods after implementation details    |

---

## 6. Reusable Components

Components represent UI fragments that appear on multiple pages (navbars, tables, modals, sidebars).

### Using the Built-In Components

**NavbarComponent** — top navigation bar:

```typescript
import { test } from '../../fixtures/base.fixture';

test('should logout via navbar @smoke', async ({ navbar }) => {
  await navbar.logout();
});

test('should search menu @regression', async ({ navbar }) => {
  await navbar.searchMenu('Leave');
});
```

**TableComponent** — data tables:

```typescript
import { TableComponent } from '../../components/table.component';

test('should display employee data @regression', async ({ page }) => {
  const table = new TableComponent(page, '.oxd-table');

  const rowCount = await table.getRowCount();
  expect(rowCount).toBeGreaterThan(0);

  const headers = await table.getHeaderTexts();
  expect(headers).toContain('Name');

  const firstCellText = await table.getCellText(0, 1);
  expect(firstCellText).toBeTruthy();
});
```

### Creating a New Component

```typescript
// components/modal.component.ts
import { Page, Locator } from '@playwright/test';
import { logger } from '../utils/logger';

export class ModalComponent {
  readonly overlay: Locator;
  readonly title: Locator;
  readonly closeButton: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page, rootSelector = '.oxd-dialog-sheet') {
    const root = page.locator(rootSelector);
    this.overlay = root;
    this.title = root.locator('.oxd-dialog-title');
    this.closeButton = root.locator('button.oxd-dialog-close-button');
    this.confirmButton = root.locator('button:has-text("Yes, Delete")');
    this.cancelButton = root.locator('button:has-text("No, Cancel")');
  }

  async isOpen(): Promise<boolean> {
    try {
      await this.overlay.waitFor({ state: 'visible', timeout: 3_000 });
      return true;
    } catch {
      return false;
    }
  }

  async confirm(): Promise<void> {
    logger.info('Confirming modal dialog');
    await this.confirmButton.click();
  }

  async cancel(): Promise<void> {
    logger.info('Cancelling modal dialog');
    await this.cancelButton.click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
```

### Composing Components into Pages

```typescript
// pages/employees.page.ts
import { ModalComponent } from '../components/modal.component';
import { TableComponent } from '../components/table.component';

export class EmployeesPage extends BasePage {
  readonly table: TableComponent;
  readonly deleteModal: ModalComponent;

  constructor(page: Page) {
    super(page);
    this.table = new TableComponent(page);
    this.deleteModal = new ModalComponent(page);
  }

  async deleteFirstEmployee(): Promise<void> {
    // Click delete icon on first row
    const deleteBtn = this.page.locator('.oxd-table-body .oxd-icon-button--danger').first();
    await this.click(deleteBtn);

    // Confirm in modal
    await this.deleteModal.confirm();
    await this.waitForPageLoad();
  }
}
```

---

## 7. Custom Fixtures

Fixtures automatically provide dependencies to your tests. The framework extends Playwright's base fixtures in `fixtures/base.fixture.ts`.

### Available Fixtures

```typescript
test('example', async ({
  loginPage,      // LoginPage instance
  dashboardPage,  // DashboardPage instance
  navbar,         // NavbarComponent instance
  apiClient,      // Initialized ApiClient (auto-disposed after test)
  page,           // Standard Playwright page (always available)
}) => {
  // All injected automatically
});
```

### Adding a New Fixture

Edit `fixtures/base.fixture.ts`:

```typescript
import { EmployeesPage } from '../pages/employees.page';
import { ModalComponent } from '../components/modal.component';

type AppFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  navbar: NavbarComponent;
  apiClient: ApiClient;
  employeesPage: EmployeesPage;        // ← new
  modal: ModalComponent;               // ← new
};

export const test = base.extend<AppFixtures>({
  // ... existing ...

  employeesPage: async ({ page }, use) => {
    await use(new EmployeesPage(page));
  },

  modal: async ({ page }, use) => {
    await use(new ModalComponent(page));
  },
});
```

### Fixture with Setup and Teardown

```typescript
// Fixture that navigates to a page before the test and cleans up after
employeesPage: async ({ page }, use) => {
  const employeesPage = new EmployeesPage(page);
  await employeesPage.goto();                 // Setup: navigate
  await use(employeesPage);                   // Run test
  // Teardown happens automatically after use()
},
```

### Fixture with External Resources

```typescript
// Fixture that creates and disposes an API client
apiClient: async ({}, use) => {
  const client = await new ApiClient().init();   // Setup
  await use(client);                              // Run test
  await client.dispose();                         // Teardown
},
```

---

## 8. Data-Driven Testing

### JSON-Based Tests

#### 1. Create Test Data

```json
// test-data/employees.json
{
  "validEmployees": [
    { "firstName": "John",  "lastName": "Doe",     "position": "QA Engineer" },
    { "firstName": "Jane",  "lastName": "Smith",   "position": "Developer" },
    { "firstName": "Alice", "lastName": "Johnson", "position": "Manager" }
  ],
  "searchTerms": [
    { "query": "John",  "expectedCount": 1 },
    { "query": "xyz",   "expectedCount": 0 }
  ]
}
```

#### 2. Load Data in Tests

```typescript
import { test, expect } from '../../fixtures/base.fixture';
import { loadJsonData } from '../../utils/test-data-loader';

interface EmployeeData {
  validEmployees: { firstName: string; lastName: string; position: string }[];
  searchTerms: { query: string; expectedCount: number }[];
}

const data = loadJsonData<EmployeeData>('employees.json');

test.describe('Employee Management', () => {

  // Parameterized test — runs once per employee
  for (const emp of data.validEmployees) {
    test(`should add employee: ${emp.firstName} ${emp.lastName} @regression`, async ({
      employeesPage,
    }) => {
      await employeesPage.goto();
      await employeesPage.addEmployee(emp.firstName, emp.lastName);
      await employeesPage.expectSuccessToast();
    });
  }

  // Parameterized search tests
  for (const search of data.searchTerms) {
    test(`should find ${search.expectedCount} results for "${search.query}" @regression`, async ({
      employeesPage,
    }) => {
      await employeesPage.goto();
      await employeesPage.searchEmployee(search.query);
      // assert expected count
    });
  }

});
```

### CSV-Based Tests

#### 1. Create CSV Data

```csv
username,password,expectedResult
Admin,admin123,success
BadUser,wrong,error
,admin123,validation
Admin,,validation
```

#### 2. Load and Use

```typescript
import { loadCsvData } from '../../utils/test-data-loader';

const loginData = loadCsvData('login-scenarios.csv');

for (const row of loginData) {
  test(`login: ${row.username || '(empty)'} / ${row.expectedResult} @regression`, async ({
    loginPage,
  }) => {
    await loginPage.goto();
    await loginPage.login(row.username, row.password);

    if (row.expectedResult === 'success') {
      // assert dashboard
    } else {
      // assert error or validation
    }
  });
}
```

### Inline Parameterized Tests

For simple cases, define data directly:

```typescript
const browsers = ['Chrome', 'Firefox', 'Safari'];
const viewports = [
  { width: 1920, height: 1080, name: 'Desktop' },
  { width: 375,  height: 812,  name: 'Mobile' },
];

for (const vp of viewports) {
  test(`should render correctly at ${vp.name} @regression`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    // assertions...
  });
}
```

---

## 9. API Testing

### Using the Built-In API Client

The `ApiClient` supports GET, POST, PUT, and DELETE with logging built in.

#### Direct Usage (in API tests)

```typescript
import { test, expect } from '@playwright/test';
import { ApiClient } from '../../utils/api-client';
import { assertApiResponse } from '../../utils/helpers';

test.describe('Orders API', () => {
  let api: ApiClient;

  test.beforeAll(async () => {
    api = await new ApiClient('https://api.example.com', 'your-auth-token').init();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('should list orders @smoke', async () => {
    const response = await api.get('/orders', {
      params: { status: 'active', page: '1' },
    });

    const body = await assertApiResponse<{ orders: unknown[] }>(response, 200);
    expect(body.orders.length).toBeGreaterThan(0);
  });

  test('should create an order @regression', async () => {
    const response = await api.post('/orders', {
      data: {
        product: 'Widget',
        quantity: 5,
        price: 19.99,
      },
    });

    const body = await assertApiResponse<{ id: string; product: string }>(response, 201);
    expect(body.id).toBeTruthy();
    expect(body.product).toBe('Widget');
  });

  test('should update an order @regression', async () => {
    const response = await api.put('/orders/123', {
      data: { quantity: 10 },
    });

    const body = await assertApiResponse<{ quantity: number }>(response, 200);
    expect(body.quantity).toBe(10);
  });

  test('should delete an order @regression', async () => {
    const response = await api.delete('/orders/123');
    expect(response.status()).toBe(204);
  });
});
```

#### Via Fixture (in E2E tests)

```typescript
import { test, expect } from '../../fixtures/base.fixture';

test('should verify API data matches UI @regression', async ({ apiClient, dashboardPage }) => {
  // Call API
  const response = await apiClient.get('/api/data');
  const apiData = await response.json();

  // Compare with UI
  await dashboardPage.goto();
  const uiText = await dashboardPage.getHeadingText();

  expect(uiText).toContain(apiData.title);
});
```

### API Client Options

```typescript
await api.get('/endpoint', {
  headers: { 'X-Custom-Header': 'value' },   // Additional headers
  params: { page: '1', limit: '10' },         // Query parameters
  failOnStatusCode: true,                      // Throw on 4xx/5xx (default: false)
});

await api.post('/endpoint', {
  data: { key: 'value' },                     // Request body (JSON)
  headers: { 'Content-Type': 'text/plain' },  // Override content type
});
```

### Creating a Domain-Specific API Client

For complex APIs, extend the base client:

```typescript
// utils/orders-api.ts
import { ApiClient } from './api-client';
import { assertApiResponse } from './helpers';

interface Order {
  id: string;
  product: string;
  quantity: number;
  status: string;
}

export class OrdersApi {
  constructor(private readonly client: ApiClient) {}

  async list(status?: string): Promise<Order[]> {
    const params = status ? { status } : undefined;
    const response = await this.client.get('/orders', { params });
    return assertApiResponse<Order[]>(response, 200);
  }

  async getById(id: string): Promise<Order> {
    const response = await this.client.get(`/orders/${id}`);
    return assertApiResponse<Order>(response, 200);
  }

  async create(data: Partial<Order>): Promise<Order> {
    const response = await this.client.post('/orders', { data });
    return assertApiResponse<Order>(response, 201);
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    const response = await this.client.put(`/orders/${id}`, { data: { status } });
    return assertApiResponse<Order>(response, 200);
  }

  async remove(id: string): Promise<void> {
    const response = await this.client.delete(`/orders/${id}`);
    if (response.status() !== 204) {
      throw new Error(`Failed to delete order ${id}: ${response.status()}`);
    }
  }
}
```

Usage:

```typescript
test.describe('Orders', () => {
  let ordersApi: OrdersApi;

  test.beforeAll(async () => {
    const client = await new ApiClient('https://api.example.com').init();
    ordersApi = new OrdersApi(client);
  });

  test('should create and verify order @smoke', async () => {
    const order = await ordersApi.create({ product: 'Widget', quantity: 3 });
    expect(order.id).toBeTruthy();

    const fetched = await ordersApi.getById(order.id);
    expect(fetched.product).toBe('Widget');
  });
});
```

---

## 10. Tagging and Filtering Tests

### Adding Tags

Tags are added inline in the test name:

```typescript
test('should login successfully @smoke', async ({ loginPage }) => { ... });
test('should validate all fields @regression', async ({ page }) => { ... });
test('should handle edge case @smoke @regression', async ({ page }) => { ... });
```

### Running by Tag

```bash
# Single tag
npm run test:smoke
npm run test:regression

# Multiple tags (OR logic)
npx playwright test --grep "@smoke|@regression"

# Exclude a tag
npx playwright test --grep-invert "@regression"

# Combine with project filter
npx playwright test --project=chromium --grep "@smoke"
```

### Suggested Tagging Strategy

| Tag           | Purpose                            | When to run         |
| ------------- | ---------------------------------- | ------------------- |
| `@smoke`      | Critical path, must always pass    | Every PR, every deploy |
| `@regression` | Full coverage                      | Nightly, release    |
| `@flaky`      | Known unstable tests               | Exclude from CI     |
| `@wip`        | Work in progress                   | Manual only         |

---

## 11. Authentication and Session Reuse

### How It Works

1. **Global Setup** (`fixtures/global-setup.ts`) runs once before all tests
2. It launches a browser, performs login, and saves cookies/localStorage to `.auth/storageState.json`
3. Every UI test reuses that file — no re-login needed
4. API tests skip authentication entirely (separate project config)

### Overriding Session for Specific Tests

If a test needs to start without authentication (e.g., testing the login page itself):

```typescript
test.describe('Login Tests', () => {
  // Clear the stored session for these tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show login form @smoke', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.expectOnLoginPage();
  });
});
```

### Using a Different User Session

```typescript
test.describe('Admin-only Features', () => {
  // Use a different stored session
  test.use({ storageState: '.auth/adminState.json' });

  test('should access admin panel @regression', async ({ page }) => {
    await page.goto('/admin');
    // ...
  });
});
```

### Token-Based API Authentication

```typescript
// Pass token in constructor
const api = await new ApiClient('https://api.example.com', 'your-bearer-token').init();

// Or set via environment variable
// In .env: API_TOKEN=your-bearer-token
// The ApiClient reads it automatically from environment.apiToken
```

---

## 12. Utilities Reference

### Logger

```typescript
import { logger } from '../utils/logger';

logger.info('Test started');
logger.warn('Retrying flaky step');
logger.error('Unexpected failure', new Error('details'));
logger.debug('Verbose info for troubleshooting');
```

Output goes to:
- Console (colored)
- `reports/logs/test-run.log` (all levels)
- `reports/logs/errors.log` (errors only)

Set log level: `LOG_LEVEL=debug npm test`

### Helpers

```typescript
import {
  waitForVisible,
  waitForHidden,
  waitForNetworkIdle,
  retry,
  assertApiResponse,
  randomString,
  takeScreenshot,
} from '../utils/helpers';

// Wait for an element
await waitForVisible(page.locator('.spinner'), 5_000);
await waitForHidden(page.locator('.spinner'), 10_000);

// Wait for network
await waitForNetworkIdle(page);

// Retry a flaky action up to 3 times with 1s delay
const result = await retry(async () => {
  const res = await api.get('/unstable-endpoint');
  if (res.status() !== 200) throw new Error('Not ready');
  return res.json();
}, 3, 1_000);

// Assert API response status and parse body
const body = await assertApiResponse<{ id: number }>(response, 200);

// Generate random test data
const uniqueName = `test-user-${randomString(6)}`;   // e.g. "test-user-a3f8k2"

// Take and save screenshot
const buffer = await takeScreenshot(page, 'after-submit');
```

### File Utilities

```typescript
import { readJson, writeJson, readCsv, ensureDir } from '../utils/file-utils';

// Read JSON with type safety
interface Config { timeout: number; retries: number }
const config = readJson<Config>('test-data/config.json');

// Write JSON
writeJson('reports/output.json', { results: [...] });

// Read CSV → array of objects
const rows = readCsv('test-data/users.csv');
// rows = [{ username: 'Admin', password: 'admin123' }, ...]

// Ensure directory exists
ensureDir('reports/custom');
```

### Test Data Loader

```typescript
import { loadJsonData, loadCsvData } from '../utils/test-data-loader';

// Loads from test-data/ directory automatically
const users = loadJsonData<UserData>('users.json');
const scenarios = loadCsvData('login-scenarios.csv');
```

---

## 13. Reporting

### HTML Report (Built-In)

```bash
# Run tests (report generated automatically)
npm test

# Open the report
npm run report:html
```

The HTML report includes:
- Test results grouped by file/suite
- Screenshots on failure
- Video recordings on failure
- Trace viewer links on first retry

### Allure Report

```bash
# Generate from test results
npm run report:allure:generate

# Open in browser
npm run report:allure:open
```

Allure provides:
- Test execution timeline
- Trend graphs (over multiple runs)
- Categories and severity breakdown
- Attached screenshots, videos, and traces

### Attaching Extra Information to Allure

```typescript
import { test } from '@playwright/test';

test('should process order @regression', async ({ page }, testInfo) => {
  // Attach a screenshot
  const screenshot = await page.screenshot();
  await testInfo.attach('order-confirmation', {
    body: screenshot,
    contentType: 'image/png',
  });

  // Attach JSON data
  await testInfo.attach('api-response', {
    body: JSON.stringify({ orderId: 123 }, null, 2),
    contentType: 'application/json',
  });

  // Attach text
  await testInfo.attach('debug-log', {
    body: 'Order processing completed successfully',
    contentType: 'text/plain',
  });
});
```

### Viewing Traces

When a test fails on retry, Playwright captures a full trace. To view:

```bash
npx playwright show-trace reports/test-results/<test-folder>/trace.zip
```

The Trace Viewer shows:
- Every action with before/after screenshots
- Network requests
- Console logs
- DOM snapshots at each step

---

## 14. Running Tests

### Local Execution

```bash
# All tests, all browsers
npm test

# Specific file
npx playwright test tests/e2e/login.spec.ts

# Specific test by title
npx playwright test -g "should login with valid credentials"

# Specific project (browser)
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=api

# Multiple projects
npx playwright test --project=chromium --project=firefox

# Headed mode (see the browser)
npm run test:headed

# Debug mode (step through with Inspector)
npm run test:debug

# With specific environment
TEST_ENV=qa npm test
```

### Parallel and Sharding

```bash
# Playwright runs tests in parallel by default (fullyParallel: true)
# Control worker count:
npx playwright test --workers=4
npx playwright test --workers=1      # Sequential

# Sharding for CI (split across machines)
npx playwright test --shard=1/4      # Machine 1 of 4
npx playwright test --shard=2/4      # Machine 2 of 4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
```

### Running Subsets

```bash
# By tag
npx playwright test --grep "@smoke"
npx playwright test --grep "@regression"
npx playwright test --grep-invert "@flaky"

# By directory
npx playwright test tests/e2e/
npx playwright test tests/api/

# Combination
npx playwright test --project=chromium --grep "@smoke" tests/e2e/
```

### Retry Behavior

```bash
# Override retries
npx playwright test --retries=3

# Locally: 0 retries (fail fast)
# CI:      2 retries (handle flakiness)
```

---

## 15. CI/CD Pipeline

### GitHub Actions Workflow

The pipeline (`.github/workflows/playwright.yml`) triggers on:
- Push to `main` or `develop`
- Pull requests to `main`
- Manual dispatch (with optional test tag filter)

### Pipeline Architecture

```
┌─────────────────────────────────────────────────┐
│               test (matrix: 4 shards)           │
│                                                 │
│  Shard 1/4 ─┬─ Install ─ Run tests ─ Upload    │
│  Shard 2/4 ─┤    (parallel execution)           │
│  Shard 3/4 ─┤                                   │
│  Shard 4/4 ─┘                                   │
└──────────────────────┬──────────────────────────┘
                       │
              ┌────────▼────────┐
              │  allure-report  │
              │  (merge + gen)  │
              └─────────────────┘
```

### Manual Trigger with Tag Filter

Go to **Actions** → **Playwright Tests** → **Run workflow** → enter `@smoke` or `@regression` in the tag input.

### Viewing CI Artifacts

After a pipeline run, download from the **Artifacts** section:
- `html-report-shard-{N}` — HTML reports per shard
- `allure-results-shard-{N}` — Raw Allure data
- `allure-report` — Merged Allure report
- `test-artifacts-shard-{N}` — Screenshots, videos, traces (only on failure)

---

## 16. Docker

### Build and Run

```bash
# Build the image
docker build -t pw-framework .

# Run all tests
docker run --rm pw-framework

# Run with environment and mount reports
docker run --rm \
  -e TEST_ENV=qa \
  -v $(pwd)/reports:/app/reports \
  pw-framework

# Run specific tag
docker run --rm \
  -v $(pwd)/reports:/app/reports \
  pw-framework \
  npx playwright test --grep "@smoke"
```

### Using the Helper Script

```bash
# Run all tests
bash scripts/docker-run.sh

# Run smoke tests
bash scripts/docker-run.sh @smoke
```

---

## 17. Code Quality

### ESLint

```bash
# Check for issues
npm run lint

# Auto-fix
npm run lint:fix
```

Key rules enforced:
- No unused variables (warning)
- No `any` types (warning)
- No focused tests (`test.only`) — **error**
- No skipped tests (`test.skip`) — warning
- No `console.log` — warning

### Prettier

```bash
# Format all files
npm run format

# Check without changing
npm run format:check
```

Settings: single quotes, trailing commas, 100 char line width, 2-space indent.

### TypeScript Strict Mode

The `tsconfig.json` enables:
- `strict: true` (all strict checks)
- `resolveJsonModule: true` (import JSON directly)
- `forceConsistentCasingInFileNames: true`

---

## 18. Recipes and Patterns

### Recipe: Test with Login as Different Roles

```typescript
// fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  adminPage: Page;
  userPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: '.auth/adminState.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: '.auth/userState.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
```

### Recipe: Visual Regression Testing

```typescript
test('should match dashboard screenshot @regression', async ({ dashboardPage, page }) => {
  await dashboardPage.goto();
  await dashboardPage.waitForNetworkIdle();

  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixelRatio: 0.01,
  });
});
```

### Recipe: File Upload

```typescript
test('should upload document @regression', async ({ page }) => {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-data/sample.pdf');

  await page.locator('button:has-text("Upload")').click();
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Recipe: Handling Dialogs

```typescript
test('should confirm deletion @regression', async ({ page }) => {
  // Set up dialog handler BEFORE triggering it
  page.on('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Are you sure');
    await dialog.accept();
  });

  await page.locator('.delete-button').click();
});
```

### Recipe: Network Interception

```typescript
test('should handle slow API @regression', async ({ page }) => {
  // Simulate slow response
  await page.route('**/api/data', async (route) => {
    await new Promise((r) => setTimeout(r, 3_000));
    await route.continue();
  });

  await page.goto('/dashboard');
  await expect(page.locator('.loading-spinner')).toBeVisible();
  await expect(page.locator('.data-table')).toBeVisible({ timeout: 10_000 });
});

test('should mock API response @regression', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock User' }]),
    });
  });

  await page.goto('/users');
  await expect(page.locator('.user-name')).toHaveText('Mock User');
});
```

### Recipe: Multi-Tab / Multi-Window

```typescript
test('should open link in new tab @regression', async ({ page, context }) => {
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('a[target="_blank"]').click(),
  ]);

  await newPage.waitForLoadState();
  expect(newPage.url()).toContain('/external');
  await newPage.close();
});
```

### Recipe: Combining UI and API in One Test

```typescript
test('should create via API and verify in UI @regression', async ({
  apiClient,
  dashboardPage,
  page,
}) => {
  // Create resource via API
  const response = await apiClient.post('/api/items', {
    data: { name: 'Test Item', status: 'active' },
  });
  const { id } = await response.json();

  // Verify in UI
  await page.goto(`/items/${id}`);
  await expect(page.locator('.item-name')).toHaveText('Test Item');
  await expect(page.locator('.item-status')).toHaveText('active');

  // Cleanup via API
  await apiClient.delete(`/api/items/${id}`);
});
```

---

## 19. Troubleshooting

### Common Issues

#### Tests fail with "storageState file not found"

The global setup failed to create `.auth/storageState.json`. Check:
1. Is the `BASE_URL` correct and accessible?
2. Are the credentials in your `.env` file valid?
3. Run `npx playwright test --headed` to see what happens during login.

#### "Timeout waiting for selector"

```typescript
// Increase timeout for slow elements
await page.locator('.slow-element').waitFor({ state: 'visible', timeout: 30_000 });

// Or use the BasePage helper
await myPage.isVisible(myPage.someElement, 30_000);
```

#### Tests pass locally but fail in CI

- Add retries: `retries: process.env.CI ? 2 : 0`
- Check if the app is accessible from CI network
- Add `waitForNetworkIdle()` before assertions
- Review traces from CI artifacts

#### API tests return unexpected status codes

- Check your `API_BASE_URL` in the environment config
- Verify the API endpoint hasn't changed
- Check if authentication is required (pass token to ApiClient)

#### "Browser closed unexpectedly"

- Increase the test timeout: `test.setTimeout(120_000)`
- Check for memory issues in CI (reduce workers)
- Ensure Playwright browsers are installed: `npx playwright install --with-deps`

### Debug Tools

```bash
# Playwright Inspector (step-by-step debugging)
npx playwright test --debug

# Trace Viewer (analyze a captured trace)
npx playwright show-trace reports/test-results/*/trace.zip

# Codegen (generate selectors interactively)
npx playwright codegen https://your-app.com

# UI Mode (visual test runner)
npx playwright test --ui
```

### Getting Help

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Playwright Discord**: Community support
- **Framework Issues**: File an issue in your repo

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────┐
│                    DAILY WORKFLOW                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Write test data    → test-data/*.json                  │
│  2. Create page object → pages/*.page.ts (extend BasePage) │
│  3. Register fixture   → fixtures/base.fixture.ts          │
│  4. Write test         → tests/e2e/*.spec.ts               │
│  5. Tag test           → @smoke or @regression             │
│  6. Run                → npm test or npm run test:smoke    │
│  7. Review report      → npm run report:html               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                    NAMING CONVENTIONS                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Page objects:   *.page.ts     (e.g. login.page.ts)        │
│  Components:     *.component.ts (e.g. navbar.component.ts) │
│  E2E tests:      *.spec.ts    (in tests/e2e/)             │
│  API tests:      *.spec.ts    (in tests/api/)             │
│  Test data:      *.json       (in test-data/)             │
│  Utilities:      *.ts         (in utils/)                 │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                    KEY IMPORTS                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  import { test, expect } from '../../fixtures/base.fixture'│
│  import { loadJsonData } from '../../utils/test-data-loader│
│  import { logger } from '../../utils/logger'               │
│  import { ApiClient } from '../../utils/api-client'        │
│  import { retry, randomString } from '../../utils/helpers' │
│                                                            │
└────────────────────────────────────────────────────────────┘
```
