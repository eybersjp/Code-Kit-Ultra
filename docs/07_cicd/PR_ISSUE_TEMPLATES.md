# PR and Issue Templates Guide

**Project:** Code-Kit-Ultra v1.2.0
**Template location:** `.github/` (PR template) and `.github/ISSUE_TEMPLATE/` (issue templates)
**Maintained by:** Core team. Changes to templates require a PR reviewed by at least one
maintainer and approval from the team lead.

---

## Overview

This document describes every GitHub template used in this repository, provides the full
content of each template, and explains when and how to use them. Templates enforce consistent
issue and PR quality, ensure security considerations are captured, and reduce the back-and-forth
between contributors and reviewers.

| Template | File | Triggers on |
|---|---|---|
| Pull Request | `.github/pull_request_template.md` | Every new PR |
| Bug Report | `.github/ISSUE_TEMPLATE/bug_report.md` | "Bug report" issue type |
| Feature Request | `.github/ISSUE_TEMPLATE/feature_request.md` | "Feature request" issue type |
| Security Vulnerability | `.github/ISSUE_TEMPLATE/security_vulnerability.md` | "Security" issue type |
| Documentation Gap | `.github/ISSUE_TEMPLATE/doc_gap.md` | "Documentation" issue type |

---

## Section 1: Pull Request Template

**File:** `.github/pull_request_template.md`

This template loads automatically when a contributor opens a new PR. Every field must be
filled in. Reviewers should reject PRs where the template is left blank or removed.

```markdown
## Summary
<!-- 1-3 bullet points describing what this PR does -->

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Security fix (addresses a security vulnerability)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactor (no behavior change)
- [ ] CI/CD change

## Changes Made
<!-- List the key files and what changed in each -->

## Testing
<!-- How did you test this? What test cases cover this change? -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed — describe steps

## Security Considerations
<!-- Did this change touch auth, permissions, or audit? -->
- [ ] No security impact
- [ ] Auth flow modified — reviewed by security
- [ ] Multi-tenant scoping verified
- [ ] Audit events emitted for all material actions
- [ ] No secrets introduced in code

## Definition of Done
- [ ] Code compiles (`pnpm typecheck` passes)
- [ ] Tests pass (`pnpm test:auth` passes, relevant tests added)
- [ ] PR title follows conventional commit format
- [ ] No `console.log` in production code paths
- [ ] Linked to spec (if implementing a `SPEC_*.md`)

## Related Issues
<!-- Closes #123, Related to #456 -->
```

**Usage notes:**
- The PR title must follow conventional commit format: `type(scope): subject`. See
  `CONVENTIONAL_COMMITS.md`.
- The `pr-gate.yml` workflow validates the PR title on open and every subsequent edit.
- If the PR is a security fix, add the `security-review-required` label before requesting
  review. Do not merge until a maintainer with security authority has approved.
- Breaking changes require the `breaking-change` label and must document migration steps in
  the PR body or a linked spec.

---

## Section 2: Bug Report Template

**File:** `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug Report
about: Report a reproducible defect in Code-Kit-Ultra
labels: type:bug
assignees: ''
---

## Environment

- **Version:** (e.g., v1.2.0 — check `VERSION` file or `pnpm ck --version`)
- **Node version:** (run `node --version`)
- **OS:** (e.g., macOS 14, Ubuntu 22.04)
- **Deployment:** (local dev / Docker / cloud — specify)

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

<!-- What should have happened? -->

## Actual Behavior

<!-- What actually happened? -->

## Logs / Error Output

```
<!-- Paste relevant logs, stack traces, or error messages here -->
```

## Security Impact

<!-- Was any sensitive data exposed? Were permissions bypassed? If yes, DO NOT
file a public issue — use the Security Vulnerability template instead or email
security@[company].com -->

- [ ] No security impact
- [ ] Potential security impact — please review the Security Vulnerability template

## Workaround

<!-- Is there a known workaround? Document it here if so. -->
```

**Usage notes:**
- Set the `priority:P*` label based on user impact before assigning.
- If the bug involves data exposure or a permission bypass, close this issue and file a
  security vulnerability report instead (see Section 4).
- Add the `component:*` label matching the affected package or app.

---

## Section 3: Feature Request Template

**File:** `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Feature Request
about: Propose a new capability or enhancement
labels: type:feature
assignees: ''
---

## Problem Statement

<!-- As a [role], I need [capability] so that [outcome]. -->

## Proposed Solution

<!-- Describe how you envision this working. Include API shape, UX flow, or
configuration format if applicable. -->

## Alternatives Considered

<!-- What other approaches did you consider and why did you rule them out? -->

## Acceptance Criteria

- [ ] (Describe verifiable, testable outcomes)
- [ ] (Each item should be independently checkable)
- [ ] (Avoid vague criteria like "works correctly")

## Related Specs

<!-- Link to any SPEC_*.md in docs/03_specs/ that this feature relates to or
would require updating. If no spec exists, note whether one should be created. -->

## Priority

<!-- Select one and explain briefly -->
- [ ] P0 — Critical: blocking a release or a major customer
- [ ] P1 — High: significant user impact, no adequate workaround
- [ ] P2 — Medium: meaningful improvement, workaround exists
- [ ] P3 — Low: nice to have, minimal user impact
```

**Usage notes:**
- A feature request does not guarantee implementation. The core team triages requests weekly.
- If the feature changes a public API or requires a spec, add the `status:needs-spec` label
  and link the relevant spec directory.
- P0 and P1 requests are discussed in the next planning cycle. P2/P3 are backlogged.

---

## Section 4: Security Vulnerability Template

**File:** `.github/ISSUE_TEMPLATE/security_vulnerability.md`

> IMPORTANT: This template exists so reporters know the correct process. The template itself
> instructs reporters NOT to use a public GitHub issue for vulnerabilities.

```markdown
---
name: Security Vulnerability
about: Report a security vulnerability in Code-Kit-Ultra
labels: type:security, security-review-required
assignees: ''
---

## STOP — Do Not File Public Security Issues

If you have found a security vulnerability, **do not open a public GitHub issue**.
Public issues are visible to everyone, including potential attackers.

**How to report a security vulnerability:**

1. **Email:** security@[company].com with subject line `[SECURITY] Brief description`
2. **GitHub Private Advisory:** Use GitHub's private security advisory feature at
   `Security` → `Advisories` → `Report a vulnerability` in this repository.

We will acknowledge your report within 48 hours and provide a remediation timeline.

---

If you have already confirmed this is NOT a sensitive vulnerability (e.g., it is a
publicly known issue with a published CVE and no exploit is available), you may
continue with this template:

## Impact Assessment

<!-- What data or systems are at risk? Who is affected (all users, admins only,
specific orgs)? What can an attacker do? -->

## Steps to Reproduce

<!-- Only share details in this public issue if the vulnerability is already
publicly known. Otherwise, share reproduction steps in the private advisory. -->

## Affected Versions

<!-- Which versions are affected? Is the latest release affected? -->

## CVSS Score

<!-- If you have computed a CVSS score, include it here. If not, leave blank. -->

## Suggested Remediation

<!-- If you have a suggested fix or mitigation, describe it here. -->
```

**Usage notes:**
- The `security-review-required` label is applied automatically. Do not remove it.
- A maintainer with security authority must acknowledge and triage all security issues within
  48 hours of filing.
- After a fix is merged, a security advisory is published and the CVE is requested if
  warranted.

---

## Section 5: Documentation Gap Template

**File:** `.github/ISSUE_TEMPLATE/doc_gap.md`

```markdown
---
name: Documentation Gap
about: Report missing, incorrect, or outdated documentation
labels: type:docs
assignees: ''
---

## Which Document Is Missing or Incorrect

<!-- Provide the file path (e.g., docs/03_specs/SPEC_ORCHESTRATOR.md) or describe
what documentation you expected to find and could not. -->

## What the Correct Behavior Is

<!-- Describe what the system actually does (per the implementation or an existing
spec), or what documentation should say. -->

## Suggested Content or Correction

<!-- If you know what the correct documentation should say, write it here. Even a
rough draft is helpful. If you are reporting that documentation simply does not
exist, describe what topics it should cover. -->

## Related Implementation

<!-- Link to the relevant source file, package, or SPEC_*.md if applicable. -->
```

**Usage notes:**
- If the documentation gap reveals a discrepancy between a spec and the implementation,
  add both `type:docs` and `type:bug` labels.
- Documentation-only fixes can be merged by any maintainer without a second review if
  the change is non-controversial (correcting a typo, adding a missing step, etc.).

---

## Section 6: PR Review Checklist

Reviewers must verify the following before approving any PR. This checklist is not embedded
in the PR template — it is a reviewer responsibility.

**Code quality:**
- [ ] TypeScript strict mode — no `any` without an explicit justification comment
- [ ] No `console.log` statements in production code paths (use the `observability` package)
- [ ] No hardcoded secrets, tokens, or credentials in any file
- [ ] New behavior has corresponding test coverage (unit tests at minimum)

**Security:**
- [ ] Multi-tenant scoping enforced: `orgId`, `workspaceId`, and `projectId` are passed and
      validated at all relevant boundaries
- [ ] If touching auth: session resolution path tested, RBAC permissions checked
- [ ] Audit events emitted for all material actions (run create/cancel, gate approve/reject,
      policy change)
- [ ] No new dependencies added without a brief justification in the PR description

**Database:**
- [ ] If schema changes: a migration file is included alongside the code change
- [ ] No raw SQL string concatenation — use parameterized queries exclusively
- [ ] New queries are covered by at least one test that exercises the DB layer

**Process:**
- [ ] PR title follows conventional commit format (`type(scope): subject`)
- [ ] All PR template checkboxes are completed (not left blank)
- [ ] If implementing a spec: the spec is linked in the PR description and any deviations
      are documented

---

## Section 7: GitHub Labels

Configure the following labels in the repository settings. Labels should be created before
the first PR is opened. Use the exact names and hex colors listed.

**Type labels:**

| Label | Color | Description |
|---|---|---|
| `type:bug` | `#d73a4a` | Something is not working correctly |
| `type:feature` | `#0075ca` | New capability or enhancement |
| `type:security` | `#e11d48` | Security vulnerability or hardening |
| `type:docs` | `#0052cc` | Documentation missing, incorrect, or outdated |
| `type:chore` | `#e4e669` | Maintenance with no user-visible change |
| `type:test` | `#cfd3d7` | Test-only addition or update |

**Priority labels:**

| Label | Color | Description |
|---|---|---|
| `priority:P0` | `#b60205` | Critical — blocking a release or major customer |
| `priority:P1` | `#e4002b` | High — significant impact, no adequate workaround |
| `priority:P2` | `#fbca04` | Medium — meaningful improvement, workaround exists |
| `priority:P3` | `#c2e0c6` | Low — nice to have, minimal user impact |

**Component labels:**

| Label | Color | Description |
|---|---|---|
| `component:auth` | `#1d76db` | packages/auth — session, RBAC, permissions |
| `component:orchestrator` | `#1d76db` | packages/orchestrator — phase engine, run lifecycle |
| `component:governance` | `#1d76db` | packages/governance — gates, policies |
| `component:adapters` | `#1d76db` | packages/adapters — external integrations |
| `component:db` | `#1d76db` | Database schema, migrations, queries |
| `component:cli` | `#1d76db` | apps/cli — CLI entry point and commands |
| `component:api` | `#1d76db` | apps/control-service — REST API |
| `component:web` | `#1d76db` | apps/web-control-plane — Vite frontend |

**Status labels:**

| Label | Color | Description |
|---|---|---|
| `status:blocked` | `#b60205` | Cannot proceed — waiting on external dependency |
| `status:in-review` | `#0075ca` | Actively being reviewed by maintainers |
| `status:needs-spec` | `#fbca04` | Requires a SPEC_*.md before implementation begins |
| `status:wont-fix` | `#cfd3d7` | Acknowledged but will not be addressed |

**Special labels:**

| Label | Color | Description |
|---|---|---|
| `breaking-change` | `#b60205` | PR introduces a breaking API or behavior change |
| `security-review-required` | `#e11d48` | Must be reviewed by a maintainer with security authority |
