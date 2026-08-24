#!/usr/bin/env bash
set -euo pipefail

ENV="${TEST_ENV:-dev}"
TAG="${1:-}"

echo "=== Running tests against env: $ENV ==="

ARGS=()
if [ -n "$TAG" ]; then
  ARGS+=("--grep" "$TAG")
fi

npx playwright test "${ARGS[@]}"

echo "=== Tests complete ==="
echo "HTML report: npx playwright show-report reports/html"
echo "Allure:      npx allure generate reports/allure-results -o reports/allure-report --clean && npx allure open reports/allure-report"
