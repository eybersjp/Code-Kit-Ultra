# Contributing to Code Kit Ultra

Thank you for contributing.

## Before opening a PR
1. Run `npm install`
2. Run `npm run preflight`
3. Run `npm run test:smoke`
4. Update docs and changelog when behavior changes

## Contribution areas
- adapters
- orchestration logic
- routing policy
- docs
- templates
- examples
- observability
- governance and promotion lifecycle

## PR expectations
- keep PRs focused
- include rationale, not just code
- update release-facing docs if user-visible behavior changes
- do not commit secrets or generated private credentials

## Quality bar
- type-safe changes
- smoke test remains green
- docs remain aligned
- safe defaults preserved