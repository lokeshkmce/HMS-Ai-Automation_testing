# Playwright Automation Framework — Omnivva HMS

Enterprise-grade, production-ready Playwright test automation framework built with TypeScript for the **Omnivva Hospital Management System**.

## Features

- **Page Object Model** — Clean separation of test logic and page interactions
- **Multi-environment** — dev / qa / prod configs via dotenv with strict env-var validation
- **Data-driven tests** — All test cases (valid + invalid) in `omnivva-login-data.json`
- **Role-based login tests** — 9 staff roles tested with menu count validation
- **API Testing** — Dedicated API client with full CRUD support
- **Secrets management** — Credentials injected via environment variables, never in source
- **Reporting** — HTML + Allure reporters with on-failure screenshots, videos, and traces
- **CI/CD** — GitHub Actions with sharded parallel execution (4 shards)
- **Docker** — Run tests in containers using the official Playwright image
- **Code quality** — ESLint + Prettier + strict TypeScript

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium --with-deps

# 3. Copy env template and fill in credentials
cp .env.example .env
# Edit .env and set all QA_PASSWORD_* variables

# 4. Run all tests
npm test

# 5. Run smoke tests only
npm run test:smoke

# 6. Run regression tests
npm run test:regression

# 7. Run API tests only
npm run test:api

# 8. Run in headed mode (see browser)
npm run test:headed

# 9. Debug a test
npm run test:debug
```

---

## Credentials & Security

> **⚠️ Passwords are NEVER stored in source files.**

Test account passwords are loaded from environment variables at runtime:

```bash
# Set in your local .env file (gitignored)
QA_PASSWORD_DOCTOR=your_password_here
QA_PASSWORD_NURSE=your_password_here
# ... etc. (see .env.example for all keys)
```

In CI (GitHub Actions), these are injected as **repository secrets** — set them in:
`Settings → Secrets and variables → Actions`

---

## Test Data

All login test cases live in a single file:

```
test-data/omnivva-login-data.json
```

This file contains:
- **`roleUsers`** — 9 valid staff role accounts (Doctor, Nurse, Reception, Billing, Laboratory, Radiology, Pharmacy, Administration, Group Admin), each with `expectedMenus` count for role-based menu validation
- **`invalidScenarios`** — 10 negative test cases tagged with `@smoke`, `@regression`, or `@security`

Passwords are referenced by environment variable key (`passwordEnvKey`) — never stored in the file.

---

## Project Structure

```
├── .github/workflows/      # CI/CD pipeline (GitHub Actions)
├── components/             # Reusable UI components (navbar, table — MUI-compatible)
├── config/
│   ├── env/                # Environment-specific .env files
│   └── environment.ts      # Typed env config with strict validation
├── fixtures/               # Playwright fixtures, global setup/teardown
├── pages/                  # Page Object Model classes (Omnivva HMS / MUI)
├── reports/                # Generated reports (gitignored)
├── scripts/                # Helper scripts (allure runner, docker)
├── test-data/
│   └── omnivva-login-data.json  # All test cases (valid + invalid logins)
├── tests/
│   ├── api/                # API test specs (JSONPlaceholder /posts)
│   └── e2e/                # End-to-end UI specs (Omnivva login)
├── utils/                  # Helpers, logger, API client, file utils
├── playwright.config.ts    # Playwright configuration
└── tsconfig.json           # TypeScript configuration
```

---

## Environment Configuration

Set the target environment via `TEST_ENV`:

```bash
TEST_ENV=qa npm test      # QA environment
TEST_ENV=prod npm test    # Production environment
```

Environment files live in `config/env/`:
| File | Environment |
|------|------------|
| `.env.dev` | Development (default) |
| `.env.qa` | QA / Staging |
| `.env.prod` | Production |

Override any value in the root `.env` file (gitignored).

---

## Tagging and Filtering

Tests are tagged inline in test titles:

```
@smoke      — fast, critical-path tests; run on every push
@regression — comprehensive coverage; run on PR and nightly
@security   — injection and boundary tests
```

Run by tag:

```bash
npm run test:smoke         # @smoke only
npm run test:regression    # @regression only
npm run test:security      # @security only
npx playwright test --grep "@smoke|@regression"
```

---

## Reports

### HTML Report
```bash
npm run report:html
```

### Allure Report
```bash
npm run report:allure:generate
npm run report:allure:open
```

---

## Sharding (CI)

Run tests across 4 shards for parallel CI execution:

```bash
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
```

The GitHub Actions workflow handles this automatically via matrix strategy.

---

## Docker

```bash
# Build and run
docker build -t pw-framework .
docker run --rm \
  -e TEST_ENV=qa \
  -e QA_PASSWORD_DOCTOR=your_password \
  -v $(pwd)/reports:/app/reports \
  pw-framework

# Or use the helper script
bash scripts/docker-run.sh
```

---

## Adding New Tests

1. Add a new page object in `pages/` extending `BasePage` (use MUI selectors for Omnivva)
2. Add test data in `test-data/` (no passwords — use env var keys)
3. Write the test spec in `tests/e2e/` or `tests/api/`
4. Use fixtures from `fixtures/base.fixture.ts` for automatic page object injection

---

## Code Quality

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format with Prettier
npm run format:check  # Check formatting
```
