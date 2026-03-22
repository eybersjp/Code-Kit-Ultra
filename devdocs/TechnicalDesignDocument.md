# Technical Design Document (TDD): Code-Kit-Ultra

## 1. Orchestration Strategy: The Deterministic Pipeline
Code-Kit-Ultra uses a deterministic, rule-based approach to initial orchestration. This ensures a stable foundation for downstream LLM reasoning.

### 1.1 Mode Control Logic
The `mode-controller` maps three progression modes (`safe`, `balanced`, `god`) to a `ModePolicy`. This policy dictates:
- Maximum allowed clarifying questions.
- Minimum required tasks for a "Pass" status.
- Thresholds for ambiguity review vs. block.

### 1.2 Deterministic Planning
The `planner` maps inferred project categories to a predefined task set with hard-coded dependency IDs. This creates a "Baseline Roadmap" that can later be augmented by LLM-driven custom tasks.

## 2. Skill Selection Algorithm
The `skill-engine` uses a normalized weighted scoring mechanism:
- **Project Type Match**: +5 points (if category matches one of the skill's `projectTypes`).
- **Objective Keyword Match**: +4 points per keyword match in the user idea.
- **Task ID Match**: +3 points if a skill's `taskTriggers` match an ID in the generated plan.
- **Plan Text Match**: +2 points for matching keywords in task titles/descriptions.
- **Priority Bonus**: Up to +3 points for skills with high inherent priority (`>95`).

## 3. Persistent Memory Model
All state is stored within the repo in a `.codekit` hidden directory:
- **`project-memory.json`**: Global tracking of runs, unique ideas, and overall system state.
- **`artifacts/**/run-report.json`**: Deep-dive record for every individual command invocation.

## 4. Observability Integration
The `observability` package implements the `Logger` interface to provide a single, pluggable point for all log statements.
- **Structured JSON**: Every log line is serializable JSON.
- **Console Redirects**: Info and Debug use `stdout`, while Warn and Error are routed to `stderr` to avoid polluting the data stream in CLI pipelines.
