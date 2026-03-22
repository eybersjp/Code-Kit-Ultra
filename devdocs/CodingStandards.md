# Coding Standards & Style Guide: Code-Kit-Ultra

## 1. Core Principles
- **Readability Over Cleverness**: Code should be readable by junior developers and AI agents alike.
- **Strict Typing**: TypeScript is not optional. Avoid `any` at all costs.
- **Deterministic by Default**: Avoid random behavior in the core orchestrator.

## 2. Monorepo Organization
- **Apps**: High-level entry points (`apps/cli`).
- **Packages**: Domain-specific logic (`packages/*`).
- **Config**: Externalized rule sets and registries (`config/*`).

## 3. TypeScript Best Practices
### 3.1 Naming
- **Interfaces**: NO `I` prefix. Use `UserInput`, not `IUserInput`.
- **Enums/Unions**: Prefer string union types over traditional Enums for better serializability.
- **Functions**: Use descriptive verb-based names (`runVerticalSlice`, `normalizeIdeaText`).

### 3.2 Error Handling
- Use structured results or captured errors in the `RunReport` instead of raw `throw` whenever possible.
- If throwing is necessary, use a custom error if it's a domain boundary issue.

## 4. Documentation
- **TSDoc**: Use TSDoc for all exported functions and interfaces.
- **Markdown**: Every package must have an `index.ts` and a meaningful `README.md` (or be covered by `devdocs`).

## 5. Architectural Boundaries
- **Shared**: Never depends on other internal packages.
- **Orchestrator**: The "Heart" that depends on everything else.
- **Memory**: The "Sidekick" that depends ONLY on `shared`.
- **Adapters**: The "Strategist" that depends ONLY on `shared`.

## 6. Logging (HeliosOS Rule)
- Always use the `observability` logger package.
- Never use `console.log` directly in package logic (allowed only in the CLI app layer).
