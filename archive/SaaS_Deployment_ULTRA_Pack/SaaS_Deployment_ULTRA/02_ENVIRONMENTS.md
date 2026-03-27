# Environment Model

## Environments
- local
- dev
- staging
- production

## Promotion rules
- dev is integration sandbox
- staging mirrors production config minus secrets scale
- production requires signed release tag and passing readiness gate

## Required secrets
- INSFORGE_PROJECT_URL
- INSFORGE_ANON_KEY
- INSFORGE_SERVICE_ROLE_KEY
- INSFORGE_JWT_ISSUER
- INSFORGE_JWT_AUDIENCE
- INSFORGE_JWKS_URL
- CKU_EXECUTION_TOKEN_SECRET
- CKU_ENCRYPTION_KEY
- STORAGE_PROVIDER
- LOG_DRAIN_URL
- ALERT_WEBHOOK_URL

## Production toggles
- CKU_LEGACY_API_KEYS_ENABLED=false
- CKU_REALTIME_ENABLED=true
- CKU_LEARNING_ENABLED=true
- CKU_POLICY_ADAPTATION_MODE=proposal_only
