#!/usr/bin/env bash
set -e

echo "== SaaS Preflight Check =="

# 1. Typecheck
npm run typecheck

# 2. Smoke Tests
npm run test:smoke

# 3. SaaS Environment Validation
npm run validate-env -- --mode saas

# 4. Version consistency
VERSION=$(cat VERSION)
if [[ "${GITHUB_REF_NAME}" == v* ]] && [[ "v$VERSION" != "$GITHUB_REF_NAME" ]]; then
  echo "Error: VERSION file ($VERSION) does not match tag ($GITHUB_REF_NAME)"
  exit 1
fi

# 5. Migration sequence check
MIGRATIONS=$(ls db/migrations/*.sql | wc -l)
echo "Verified $MIGRATIONS migrations ready for application."

echo "SaaS Preflight passed"