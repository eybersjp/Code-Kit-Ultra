# Code Kit Ultra — Phase 10.5 Production Pack

This pack adds a governed self-healing systems layer on top of the existing
Phase 10 learning-enabled baseline.

## Included

- failure classifier
- healing strategy registry
- healing engine
- revalidation flow
- healing log store
- control-service healing endpoints
- CLI healing commands
- example healing test
- docs and rollout guidance

## Unified Identity & Governance

**Root Identity Plane**: [InsForge](https://docs.insforge.com)
**Authorization Layer**: Code Kit Ultra Policy Engine (RBAC)

Code Kit Ultra v1.2.0+ enforces session-first authentication for all human operators. Legacy API keys are deprecated for production usage.

- See [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) for the new operator flow.

## Lifecycle

Simulate → Assess Risk → Approve → Execute → Verify → Diagnose → Heal → Re-Verify → Learn (InsForge Identity-Attributed)
