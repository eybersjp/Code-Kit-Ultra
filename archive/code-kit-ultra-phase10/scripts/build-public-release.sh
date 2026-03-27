#!/usr/bin/env bash
set -e

npm run preflight
npm run package:release
echo "Public release build complete"