---
name: code-kit-starter
description: "Workspace-specific guidance for Code Kit Ultra contributors working on monorepo code, docs, and configuration."
applyTo:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.md"
  - "apps/**"
  - "packages/**"
  - "extensions/**"
  - ".github/**"
---

Use this guidance when editing Code Kit Ultra repository source, documentation, workspace configuration, or build scripts.

- Prefer `pnpm` workspace commands such as `pnpm install`, `pnpm run typecheck`, `pnpm run test:auth`, and `pnpm run build`.
- Use `tsx` for local script execution and `vitest` for test runs.
- Preserve the monorepo architecture and avoid broad refactors unless explicitly requested.
- Update docs only when the change affects setup, commands, or workspace conventions.
- Avoid modifying `.agent/` internals or GitHub workflow files unless the user specifically asks.
- Link to existing docs like `README.md`, `CONTRIBUTING.md`, and `docs/AUTHENTICATION.md` instead of duplicating content.
