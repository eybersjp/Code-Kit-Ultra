#!/usr/bin/env bash
set -e

echo "== Validate Environment =="

if [ ! -f .env ]; then
  echo ".env file is missing"
  exit 1
fi

required_vars=(
  "ANTIGRAVITY_API_KEY"
  "ANTIGRAVITY_BASE_URL"
  "CURSOR_API_KEY"
  "CURSOR_BASE_URL"
  "WINDSURF_API_KEY"
  "WINDSURF_BASE_URL"
  "CODEKIT_PROFILE"
  "CKU_AUTH_MODE"
)

missing=false
for key in "${required_vars[@]}"; do
  if ! grep -qE "^${key}=" .env; then
    echo "[MISSING] ${key}"
    missing=true
  fi
done

if [ "$missing" = true ]; then
  echo "Some required environment variables are missing in .env"
  exit 1
fi

echo "Environment validation passed"
