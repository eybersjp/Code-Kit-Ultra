# Milestone Release Dashboard: Operator Guide

## 📌 Overview
The Milestone Release Dashboard (MRD) provides a high-level summary of a release's readiness, verification state, and governance metadata (risks, blockers, rollback). 

## 🗓️ When to Generate
- **Post-Verification**: After running `npm run preflight`.
- **Pre-Release**: To review the full status before creating the GitHub tag.
- **Post-Release**: As a final record of the released state.

## 🛠️ How to Generate (Local)

Run the generator using `npm`:
```bash
npm run release:dashboard
```

### Optional: Manual Inputs
Pass environment variables to manually override or supplement detected metadata:
- `MILESTONE_NAME`: Custom milestone name.
- `PREFLIGHT_STATUS`: `"PASS" | "FAIL" | "PARTIAL"`.
- `PREFLIGHT_NOTES`: Custom text for the verification section.
- `PREFLIGHT_TYPECHECK`: `"PASS" | "FAIL" | "PENDING"`.
- `PREFLIGHT_SMOKE`: `"PASS" | "FAIL" | "PARTIAL" | "PENDING"`.

Example:
```bash
MILESTONE_NAME="Phase 10 Baseline" PREFLIGHT_STATUS="PASS" npm run release:dashboard
```

## 🚀 How to Generate (GitHub Actions)
1. Go to the **Actions** tab in GitHub.
2. Select the **Milestone Release Dashboard** workflow.
3. Click **Run workflow**.
4. Input the milestone name, version, and tag.
5. The generated dashboard will be available as a workflow artifact and also committed back if appropriate.

## 📁 Output Locations
- **Markdown Dashboard**: `releases/milestones/YYYY-MM-DD-vX.Y.Z.md`
- **JSON Data Model**: `releases/milestones/YYYY-MM-DD-vX.Y.Z.json`

## 🧩 Structure
- **Core Identity**: Git context and versions.
- **Verification**:pass/fail indicators for CI/CD checks.
- **Release Summary**: Highlights from CHANGELOG and RELEASE_NOTES.
- **Governance**: Explicit risk and rollback documentation.

---
*For questions regarding the MRD automation, contact the engineering systems team.*
