# Auth migration smoke spec

## Goal
Verify compatibility and forward migration.

## Cases
1. Legacy API key request to protected control-service route returns 200 in compatibility mode.
2. Bearer token request returns 200 and session context.
3. Bearer token request without project context fails where project scope is required.
4. Gate approval requires action token.
5. Audit log contains actor + correlation ID for both legacy and bearer paths.

## Success
No regression in existing local operator flow while new session-based path is functional.
