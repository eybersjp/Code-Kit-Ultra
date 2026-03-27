# CI/CD and Release Flow

## Pipeline stages
1. Install
2. Lint
3. Typecheck
4. Unit tests
5. Integration tests
6. Security checks
7. Build artifacts
8. Deploy to staging
9. Smoke tests
10. Manual go/no-go gate
11. Deploy to production
12. Post-deploy verification

## Branch strategy
- main
- release/*
- hotfix/*

## Required release evidence
- all green checks
- migration diff reviewed
- rollback plan present
- runbook updated
- changelog entry present

## Rollback
- frontend rollback by deployment alias
- API rollback by image pin
- DB rollback by forward fix where destructive migrations exist
