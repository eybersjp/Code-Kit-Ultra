# Rollback

## Release rollback
1. identify the bad release tag
2. restore previous known-good release artifact
3. revert affected branch changes
4. rerun preflight and smoke tests
5. publish rollback notes

## Skill rollback
Use the governed rollback command path where available and verify audit trail integrity afterward.