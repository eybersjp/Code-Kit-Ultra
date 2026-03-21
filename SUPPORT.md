# Support

## First checks
1. Run `npm run validate-env`
2. Run `npm run ck -- adapters`
3. Run `npm run preflight`
4. Run `npm run test:smoke`

## Common issues
- missing credentials in `.env`
- unsupported adapter selected by policy
- stale artifacts in `.codekit/` or `artifacts/`

## Escalation
Create an issue with:
- command run
- expected behavior
- actual behavior
- redacted logs