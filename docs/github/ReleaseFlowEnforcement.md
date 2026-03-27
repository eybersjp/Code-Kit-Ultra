# Release Flow Enforcement: Code Kit Ultra

## 🎯 Purpose

To ensure that all Code Kit Ultra releases meet the required governance standards, the Release Control Center (RCC) is now the mandatory pre-release gate. This document outlines the enforcement logic and impacts on the release workflow.

## 🛠️ Enforcement Logic

### 1. Mandatory Pre-Tagging Check

The `version-bump-release` workflow now triggers the RCC orchestrator after the changelog is updated but **before** the version tag is created and pushed.

### 2. Decision-Based Blocking

| RCC Decision | Workflow Result | Impact |
| :---: | :---: | :--- |
| **🟢 GO** | ✅ SUCCESS | Workflow proceeds to commit, tag, and publish the release. |
| **🟡 GO WITH RISKS** | ⚠️ WARNING | Workflow proceeds but generates a GitHub warning summary. Operators must review the risks. |
| **🔴 NO-GO** | ❌ FAILURE | Workflow terminates immediately. No commit or tag is created. |

## 🔄 Workflow Integration
The enforcement is implemented via a dedicated `Enforce Release Control Gate` step in `.github/workflows/version-bump-release.yml`. This step parses the latest release manifest JSON to determine the decision.

```bash
# Enforcement Snippet
DECISION=$(node -p "require('./manifest.json').governance.decision")
if [ "$DECISION" = "NO-GO" ]; then
  exit 1
fi
```

## 👷 Operator Implications

- **Visibility**: Operators will see the final release decision in the GitHub workflow summary.
- **Remediation**: If a release is rejected (`NO-GO`), operators must resolve the blockers (e.g., fix failing tests) and re-run the release workflow.
- **Transparency**: Every release commit now includes the official RCC manifest and report in the `releases/control-center/` directory, providing a permanent audit trail.

## 📜 Failure Modes

- **Orchestrator Failure**: If the RCC script fails to generate a report, the workflow will fail by default, preventing un-governed releases.
- **Missing Metadata**: Manifests with missing required fields will be treated as incomplete and may trigger a `NO-GO` recommendation.
