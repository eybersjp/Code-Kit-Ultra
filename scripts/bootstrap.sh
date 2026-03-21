#!/usr/bin/env bash
set -e

echo "== Code Kit Ultra Bootstrap =="
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
else
  echo ".env already exists"
fi

mkdir -p .codekit/memory .codekit/audit artifacts/test-runs dist release
echo "Initialized local runtime directories"
echo "Bootstrap complete"