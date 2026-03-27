# Commit Message Guidance: Code Kit Ultra

This quick reference guide provides examples and common patterns for writing high-quality commit messages that align with our Conventional Commits policy.

---

## 1. Common Patterns

- **New Functionality**: `feat(orchestrator): add adaptive execution outcome routing`
- **Bug Fix**: `fix(control-service): handle missing execution state safely`
- **Internal Optimization**: `perf(memory): reduce run-store lookup latency`
- **Refactoring**: `refactor(cli): simplify healing command registration`
- **Security Check**: `security(api): harden token validation path`
- **New Tests**: `test(orchestrator): add execution lifecycle coverage`
- **CI/CD update**: `ci(github): add PR gate workflow for verification`
- **Internal Maintenance**: `chore(repo): add version bump automation`

---

## 2. Breaking Changes

Mark a breaking change with a `!` after the type/scope and provide details in the body.

**Example**:
```
feat(api)!: change policy evaluation contract

The policy evaluation response now requires normalized rule metadata 
to support Phase 10.5 healing engines.

BREAKING CHANGE: policy evaluation responses now require normalized rule metadata
```

---

## 3. Phase / Milestone Commits

When completing a core milestone, use `chore(release)` or a specific feature tag.

**Example**:
- `chore(release): v1.2.0-phase10`
- `feat(phase10): complete autonomous learning baseline`

---

## 4. Good vs. Bad Commits

| 🛑 Bad Commit | ✅ Good Commit |
| :--- | :--- |
| `added auth` | `feat(auth): implement session-first authentication` |
| `fixed it` | `fix(control-service): resolve race condition in event loop` |
| `docs update` | `docs(readme): update CI/CD section with PR gates` |
| `reformatted code` | `refactor(orchestrator): align variable naming with style guide` |

---
*Code Kit Ultra: Governance-First Engineering Practice*
