# Phase 6: Skill Registry + Selector

## Overview
Implemented a deterministic skill selection system that maps available capabilities from a JSON registry to the project plan and clarified objectives.

## Key Capabilities
- **JSON Registry**: Centralized skill definitions in `config/skill-registry.json`.
- **Weighted Scoring**: Skills are scored based on project type match, keyword matches in the idea/plan, and specific task triggers.
- **Traceable Reasons**: Every selected skill includes a human-readable explanation of why it was chosen.
- **Fallback Logic**: Automatically selects a general scaffold skill if no specialized entries meet the selection threshold.

## Registry Schema
Skills in the registry include:
- `skillId`: Unique identifier (e.g., `architecture-planning`).
- `triggers`: Keywords that boost the score (e.g., `monorepo`, `saas`).
- `projectTypes`: Categories where the skill is applicable.
- `taskTriggers`: Specific task IDs that trigger the skill.
- `priority`: Baseline priority for tie-breaking.

## Usage
```typescript
import { selectSkillsFromClarification } from "./packages/skill-engine/src";
const selected = selectSkillsFromClarification(clarification, plan);
```

## Success Markers
1. `architecture-planning` is selected for all runs.
2. `saas-multitenancy` is selected when "SaaS" or "multi-tenant" is mentioned.
3. `landing-page-copy-ux` is selected for `website` projects.
4. Selection reasons correctly cite the matching keywords or tasks.
