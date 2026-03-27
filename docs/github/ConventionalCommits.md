# Conventional Commits Policy: Code Kit Ultra

This policy defines the standard for all commit messages in the Code Kit Ultra repository. Following these conventions ensures that our automated changelogs and release notes are structured, professional, and reliable.

---

## 1. Commit Format

Each commit message consists of a **header**, a **body**, and a **footer**.

```
type(scope): concise summary
<BLANK LINE>
[optional body]
<BLANK LINE>
[optional footer(s)]
```

- **type**: The category of the change (see below).
- **scope**: The part of the repository affected (e.g., `orchestrator`, `cli`).
- **summary**: A short description in the imperative mood (e.g., "add", not "added").

---

## 2. Allowed Types

| Type | Purpose |
| :--- | :--- |
| **feat** | New functionality or feature. |
| **fix** | Bug fix or patch. |
| **refactor** | Code change that neither fixes a bug nor adds a feature. |
| **perf** | A code change that improves performance. |
| **docs** | Documentation only changes. |
| **test** | Adding missing tests or correcting existing tests. |
| **build** | Changes that affect the build system or external dependencies. |
| **ci** | Changes to our CI configuration files and scripts. |
| **chore** | Maintenance, admin tasks, or repo hygiene. |
| **revert** | Reverting a previous commit. |
| **security** | Security-sensitive fix or hardening. |

---

## 3. Scopes

Scopes are used to identify the specific package or layer being modified. For Code Kit Ultra, we recommend:

- **orchestrator**
- **control-service**
- **web-control-plane** (aliased: `web`)
- **cli**
- **docs**
- **github** (aliased: `actions`)
- **release**
- **repo**
- **api**
- **policies**
- **tests**
- individual package names: `auth`, `audit`, `events`, `realtime`, etc.

---

## 4. Breaking Changes

Mark a breaking change by:
1. Adding a `!` after the type/scope (e.g., `feat(api)!: change contract`).
2. Including `BREAKING CHANGE:` in the footer of the commit message.

---

## 5. Examples

### **Good Examples**
- `feat(orchestrator): add adaptive execution outcome routing`
- `fix(control-service): handle missing execution state safely`
- `docs(release): document Phase 10 release process`
- `ci(github): add PR gate workflow for verification`
- `chore(repo): add version bump automation`
- `feat(api)!: change policy evaluation contract`

### **Bad Examples**
- `merged stuff` (Missing type, non-descriptive)
- `fixed bug` (Missing scope, missing detail)
- `updated readme.md version 1.2` (Missing type prefix)

---

## 6. Guidance for Releases

Releases should be handled by the automation whenever possible, generating a commit like:
- `chore(release): v1.2.0`

---
*Code Kit Ultra: Governance-First Engineering*
