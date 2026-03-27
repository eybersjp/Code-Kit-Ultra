# Release Control Center: Operator Guide

## 🚀 Overview

The Release Control Center (RCC) is the governing orchestration system for all milestone and phase releases in the Code Kit Ultra repository. It provides a formal "GO / NO-GO" decision based on verification, artifacts, and governance metadata.

## 🕒 When to Run

- When preparing a new Milestone (e.g., Phase 10 Production Baseline).
- When promoting a release from Beta to Stable.
- Before final tagging in any governed environment.

## 📥 Required Inputs

The RCC consumes environment variables for manual overrides and governance data:

- `MILESTONE_NAME`: Title of the milestone (Default: "Baseline Milestone").
- `RELEASE_SUMMARY`: High-level summary of changes.
- `BUMP_TYPE`: `major`, `minor`, `patch`, or explicit version (e.g., `1.2.0`).
- `VERIFICATION_STATUS`: `PASS`, `FAIL`, `PARTIAL`, or `PENDING`.
- `BLOCKERS`: Comma-separated list of active blockers.
- `RISKS`: Comma-separated list of active risks.

## 📤 Generated Outputs

1. **Full Report (`.md`)**: Stored in `releases/control-center/reports/`.
2. **Machine-readable Manifest (`.json`)**: Stored in `releases/control-center/manifests/`.

## ⚖️ Interpreting Decisions

- **🟢 GO**: All checks passed. Proceed with tagging and deployment.
- **🟡 GO WITH RISKS**: Verification passed, but non-critical risks were reported. Proceed with caution and monitor.
- **🔴 NO-GO**: Verification failed or blockers were reported. Do NOT tag or release. Resolve blockers first.

## 🛠️ How to Run

### Local Execution

```bash
# Run with defaults
npm run release:control-center

# Run for a specific milestone with blockers
MILESTONE_NAME="Phase 10 Production" BLOCKERS="Legacy auth not fully deprecated" npm run release:control-center
```

### GitHub Actions

- Go to the **Actions** tab.
- Select the **Release Control Center** workflow.
- Enter the milestone details and run the workflow.
- Review the generated artifacts and the final decision in the workflow summary.

## 🔄 What's Next

1. **Review**: Check the generated `.md` report for accuracy.
2. **Tag**: If the decision is **GO**, proceed with `npm run release:tag` or manual tagging.
3. **Archive**: The manifests are permanently stored in the repo for history.
