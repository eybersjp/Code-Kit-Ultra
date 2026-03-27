# Conventional Commits: Quick Reference

High-level summary for writing commit messages in **Code Kit Ultra**.

---

## 1. Format
```
type(scope)?: summary
<BLANK LINE>
[optional body]
<BLANK LINE>
[optional footer(s)]
```

---

## 2. Allowed Types

| Type | Section |
| :--- | :--- |
| **feat** | 🚀 Features |
| **fix** | 🐞 Bug Fixes |
| **refactor** | 🛠️ Refactors |
| **perf** | ⚡ Performance |
| **docs** | 📄 Documentation |
| **test** | 🧪 Testing |
| **build** | ⚙️ Build / CI |
| **ci** | ⚙️ Build / CI |
| **chore** | 🧹 Maintenance |
| **revert** | 🌀 Reverts |
| **security** | 🐞 Bug Fixes |

---

## 3. Scopes
Commonly used scopes:
- **orchestrator**
- **control-service**
- **web-control-plane**
- **cli**
- **api**
- **auth**
- **audit**
- **events**
- **docs**
- **github**
- **release**
- **repo**
- **tests**

---

## 4. Breaking Changes
Add `!` to type or scope. (e.g., `feat(api)!: change contract`).

---

## 5. Examples

- `feat(orchestrator): add adaptive execution routing`
- `fix(control-service): resolve race condition in event loop`
- `refactor(cli): simplify command registration`
- `perf(memory): reduce lookup latency`
- `docs(readme): update CI/CD section with PR gates`
- `feat(api)!: change policy evaluation contract`

---
*Code Kit Ultra: Clear Communication and Structured Governance*
