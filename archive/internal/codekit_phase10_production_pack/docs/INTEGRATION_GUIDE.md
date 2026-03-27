# Phase 10 Integration Guide

## Existing Phase 9.3 baseline
This pack assumes you already have:
- intelligent execution lifecycle
- adapter simulation and verification
- control-service endpoints
- RBAC, policy engine, audit logging

## Wiring points
1. Call `recordRunOutcome()` at the end of successful or failed runs.
2. Store user ratings and feedback when operators review outcomes.
3. Load adaptive policy overlays before task execution.
4. Run `optimizeTasks()` before finalizing an executable plan.

## Recommended rollout
- Week 1: outcome capture only
- Week 2: learning reports
- Week 3: optimizer in shadow mode
- Week 4: adaptive overlay enforcement for low-risk adapters
