# Phase 10.5 Integration Guide

## Assumed baseline
- Phase 9.3 intelligent execution
- Phase 10 learning store and optimizer
- Control service
- Audit logging and policy enforcement

## Integration points
1. Call `attemptHealing()` after execution verification fails or a step throws.
2. Persist healing attempts into run-scoped `healing-log.json`.
3. Feed healing stats into the learning layer.
4. Expose healing endpoints through the control service and IDE.
