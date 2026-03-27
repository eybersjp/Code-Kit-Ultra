#!/usr/bin/env bash
set -e

mkdir -p release
VERSION=$(cat VERSION | tr -d '[:space:]')
ZIP="release/code-kit-ultra-${VERSION}.zip"

rm -f "$ZIP"
zip -r "$ZIP" . -x "node_modules/*" ".git/*" "release/*" "dist/*"

echo "Created $ZIP"