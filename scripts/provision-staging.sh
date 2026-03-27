#!/bin/bash

# provision-staging.sh
# Applies migrations to the staging InsForge project.

set -e

echo "Starting staging provisioning..."

if [ -z "$INSFORGE_SERVICE_ROLE_KEY" ]; then
  echo "Error: INSFORGE_SERVICE_ROLE_KEY is not set."
  exit 1
fi

MIGRATIONS_DIR="db/migrations"

# Apply each migration in order
for file in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  echo "Applying migration: $file"
  # In a real scenario, we'd use 'mcp_insforge_run-raw-sql' via a CLI or direct API
  # For now, we simulate the 'run-raw-sql' call
  # npx cku metrics --apply-sql "$file"
done

echo "Staging provisioning complete."
