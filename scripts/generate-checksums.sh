#!/usr/bin/env bash
set -e

mkdir -p release
for f in release/*.zip; do
  if [ -f "$f" ]; then
    sha256sum "$f" > "$f.sha256"
    echo "Generated checksum for $f"
  fi
done