# Repo Patch Map

## Add
- packages/learning-engine/
- packages/reliability/
- packages/optimizer/
- packages/outcomes/
- apps/control-service/src/routes/outcomes.ts
- apps/control-service/src/routes/learning.ts
- apps/control-service/src/routes/reliability.ts
- apps/control-service/src/routes/policy-adaptations.ts
- db/migrations/005_outcomes.sql
- db/migrations/006_learning_patterns.sql
- db/migrations/007_policy_adaptations.sql

## Patch
- packages/shared/src/types.ts
- packages/shared/src/contracts/events.ts
- packages/orchestrator/src/execution-engine.ts
- packages/orchestrator/src/phase-engine.ts
- packages/audit/src/write-audit-event.ts
- apps/cli/src/index.ts
- apps/web-control-plane/src/app/runs/[id]/page.*
- apps/web-control-plane/src/app/settings/page.*
- extensions/code-kit-vscode/src/views/*
