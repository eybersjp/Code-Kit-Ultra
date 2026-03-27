# Changelog Classification Policy: Code Kit Ultra

This policy defines how commit types are mapped into structured sections within the `CHANGELOG.md` and formal release notes. This ensures that stakeholders can quickly identify the value and risk profile of each release.

---

## 1. Section Mapping

The following commit types are mapped to their respective sections in the changelog:

| Section | Commit Types | Priority |
| :--- | :--- | :--- |
| **🚀 Features** | `feat` | **High** |
| **🐞 Bug Fixes** | `fix`, `security` | **High** |
| **⚡ Performance** | `perf` | **Medium** |
| **🛠️ Internal Structure** | `refactor` | **Medium** |
| **📄 Documentation** | `docs` | **Low** |
| **⚙️ Build/Tooling** | `build`, `ci` | **Low** |
| **🧪 Testing** | `test` | **Low** |
| **🧹 Maintenance** | `chore` | **None** (Optional) |
| **🌀 Reverts** | `revert` | **Varies** |

---

## 2. Public vs. Private Visibility

For public-facing release notes, the following rules apply:
- **Prioritize**: `feat`, `fix`, `security`, and `perf` should always be listed.
- **Minimize**: `refactor` and `test` may be collapsed into a single "Technical Details" section or hidden if they do not impact users.
- **Ignore**: Internal maintenance tasks (`chore`, `ci`, `build`) should generally be omitted from user-facing notes unless they change a fundamental requirement (like Node version).

---

## 3. Highlighting Breaking Changes

All breaking changes MUST be prominently displayed at the top of the changelog entry, regardless of their type. They should use a ⚠️ warning symbol and a bold header.

---

## 4. PR Titles and Release Notes

PR titles are the primary source of truth for the final release notes. PR authors MUST ensure the PR title follows the Conventional Commit format: `type(scope): summary`.

- **Guidance**: When a single PR contains multiple commit types, the PR title should reflect the **highest priority** type or the major intent of the PR.
- **Groupings**: Related PRs should be grouped together during release note generation to tell a cohesive story.

---

## 5. Non-Conforming History

For older, non-conforming commits, we implement a **Sate Fallback** section:
- **"Other Changes"**: This section contains anything that does not follow the `type(scope):` pattern.

---
*Code Kit Ultra: Clear Communication and Structured Governance*
