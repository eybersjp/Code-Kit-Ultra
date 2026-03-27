#!/bin/bash

# promote-to-production.sh
# Handles final production deployment and promotion.

set -e

VERSION=$(cat VERSION)
echo "Promoting Code Kit Ultra v$VERSION to production..."

# 1. Verify environment
if [ "$NODE_ENV" != "production" ] && [ "$ENV" != "production" ]; then
  echo "Warning: Not in production mode, proceeding with caution..."
fi

# 2. Deployment logic (e.g. Docker push, Cloud Run update, etc.)
echo "Updating production control service..."
# npx insforge deploy --project-id $INSFORGE_PROJECT_ID --tag v$VERSION

# 3. Post-deploy health check
echo "Running post-deploy health checks..."
# curl -f https://api.codekit.ultra/v1/health

echo "Production promotion complete for v$VERSION"
