# Disaster Recovery

## Scenarios
- corrupted local memory
- broken release artifact
- invalid environment configuration
- adapter outage

## Recovery
- restore `.codekit/` from backup if available
- regenerate release artifact via `npm run package:release`
- reset `.env` from `.env.example`
- force stub-only profile temporarily