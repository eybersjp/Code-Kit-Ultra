#!/usr/bin/env bash
set -e

pnpm run build
pnpm run package:release
echo "Public release build complete"