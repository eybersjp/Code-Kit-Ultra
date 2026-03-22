#!/usr/bin/env bash
set -e

echo "== Preflight Check =="
npm run typecheck
npm run test:smoke
npm run validate:docs

if [ -z "$GITHUB_ACTIONS" ]; then
  if [ ! -f ".env" ]; then
    echo ".env is missing"
    exit 1
  fi
else
  echo "CI environment detected, skipping .env check"
fi

echo "Preflight passed"