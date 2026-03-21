# Known Failure Modes

- missing environment variables
- invalid runtime profile
- unavailable real adapters
- stale generated artifacts
- release packaging failures

## Mitigation
- run `npm run preflight`
- use dry-run mode for diagnostics
- fall back to stub profile
- inspect redacted logs only