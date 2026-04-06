---
description: "Create a workspace-specific Code Kit Ultra agent file at .agent/agents/code-kit-starter.md."
---

Create a new `.agent/agents/code-kit-starter.md` file that defines a workspace-specific assistant for Code Kit Ultra.

The agent should:
- target monorepo workspace tasks in `packages/`, `apps/`, and `extensions/`
- prefer `pnpm`, `tsx`, and `vitest` commands
- preserve existing repo structure and avoid broad refactors
- avoid modifying `.agent/` internals or CI files unless explicitly requested
- include example prompts for usage
