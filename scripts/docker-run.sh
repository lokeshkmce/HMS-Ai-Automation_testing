#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="pw-framework"
TAG="${1:-}"

echo "=== Building Docker image ==="
docker build -t "$IMAGE_NAME" .

echo "=== Running tests in Docker ==="
DOCKER_ARGS=()
if [ -n "$TAG" ]; then
  DOCKER_ARGS=("npx" "playwright" "test" "--grep" "$TAG")
fi

docker run --rm \
  -e TEST_ENV="${TEST_ENV:-dev}" \
  -v "$(pwd)/reports:/app/reports" \
  "$IMAGE_NAME" \
  "${DOCKER_ARGS[@]}"

echo "=== Done — reports available in ./reports ==="
