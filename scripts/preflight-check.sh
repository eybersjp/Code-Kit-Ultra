#!/usr/bin/env bash
set -e

echo "== Preflight Check =="
npm run typecheck
npm run test:smoke
npm run validate:docs

if [ ! -f ".env" ]; then
  echo ".env is missing"
  exit 1
fi

echo "Preflight passed"