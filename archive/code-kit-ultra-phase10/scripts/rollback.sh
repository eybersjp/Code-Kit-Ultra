#!/bin/bash

# rollback.sh
# Reverts to the previous Git tag for emergency recovery.

set -e

echo "== SaaS Emergency Rollback =="

# 1. Identify previous tag
CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
PREVIOUS_TAG=$(git describe --tags --abbrev=0 "$CURRENT_TAG^" 2>/dev/null || echo "")

if [ -z "$PREVIOUS_TAG" ]; then
  echo "Error: No previous tag found to roll back to."
  exit 1
fi

echo "Current version: $CURRENT_TAG"
echo "Rollback target: $PREVIOUS_TAG"

# 2. Safety check
if [ "$1" != "--force" ]; then
  read -p "Are you sure you want to roll back to $PREVIOUS_TAG? (y/N) " confirm
  if [ "$confirm" != "y" ]; then
    echo "Rollback cancelled."
    exit 0
  fi
fi

# 3. Execution
echo "Reverting repository to $PREVIOUS_TAG..."
git checkout "$PREVIOUS_TAG"

echo "Rollback complete. Please trigger a manual 'Production Release' workflow in GitHub if needed."
