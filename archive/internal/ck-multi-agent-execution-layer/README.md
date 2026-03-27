# Code Kit Ultra — Multi-Agent Execution Layer

This package adds a full multi-agent execution layer for Code Kit Ultra.

## Included
- Agent registry
- Agent contracts
- Role-specific prompts
- Routing engine
- Execution coordinator
- Mode-aware agent plans
- Command handlers for `/ck-agent`, `/ck-run`, `/ck-status`
- Demo in-memory run store
- Example tests

## Agent Roles
- ceo
- clarifier
- planner
- skillsmith
- architect
- builder
- reviewer
- qa
- security
- deployer
- reporter

## High-Level Flow
1. `handleInit` creates a run
2. `handleRun` resolves a mode-aware execution plan
3. `execution-coordinator` routes each phase to the correct agent
4. results are persisted to the run store
5. `handleStatus` and `handleReport` expose the current state

## Notes
- This is framework-ready TypeScript, not tied to one AI vendor
- Replace the prompt runner in `packages/agents/src/prompt-runner.ts` with your Antigravity, Cursor, Claude Code, or API adapter
