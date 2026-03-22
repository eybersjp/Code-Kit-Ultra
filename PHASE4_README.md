# Phase 4: Intake and Clarification

## Overview
Implemented a deterministic intake module that converts raw project ideas into structured clarification results.

## Key Capabilities
- **Normalization**: Trims and cleans user input.
- **Category Inference**: Detects project types (app, website, automation, etc.) based on keyword patterns.
- **Assumption Generation**: Automatically records baseline assumptions when project signals are missing.
- **Clarifying Questions**: Generates targeted questions to resolve ambiguity (e.g., missing audience or tech preference).
- **Completeness Check**: Determins if the idea is "sufficient-for-initial-planning" or "needs-clarification".

## Heuristics
- **Audiences**: Looks for "for sales team", "for installers", etc.
- **Platforms**: Detects "mobile", "web", "ios", "desktop".
- **Tech Stack**: Detects "React", "Node", "Python", etc.
- **Business Model**: Detects "SaaS", "Internal", "Commercial".

## Usage
The intake module is used internally by the orchestrator but can be tested independently:
```typescript
import { runIntake } from "./packages/orchestrator/src";
const result = runIntake({ idea: "Build a CRM for solar teams", mode: "balanced" });
```

## Success Markers
1. Input "Build a CRM" is inferred as `category: "app"`.
2. Input without a platform triggers the "Assuming web-first" assumption.
3. Input without a target audience triggers the "Who are the main users?" question.
