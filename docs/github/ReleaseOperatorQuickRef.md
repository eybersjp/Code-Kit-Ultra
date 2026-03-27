# Release Operator Quick Reference: Code Kit Ultra

## 🚀 Pre-Release Checklist

1. **Sync**: Ensure your local `main` branch is up to date with `origin/main`.
2. **Verify**: Run `npm run typecheck` and `npm run test` locally to pre-emptively catch errors.

## 🕹️ Execution Commands

### 1. Milestone Release (Automated)

Triggers the full prep flow (bump, notes, changelog, RCC report, tag, and GitHub Release):

- **Via CLI**: `npm run release:control:milestone`
- **Via GitHub**: Run the `Manual Release Preparation` workflow.

### 2. Governance Check Only

Generate a new control report without bumping or tagging:

```bash
npm run release:control-center
```

## 📊 Interpreting Decisions

- **🟢 GO**: Release is ready. Proceed with confidence.
- **🟡 GO WITH RISKS**: Approved but monitor documented risks in the report.
- **🔴 NO-GO**: **STOP**. Release blocked. Resolve blockers and re-run.

## 📂 Artifact Locations

- **Governance Reports**: `releases/control-center/reports/`
- **Machine Manifests**: `releases/control-center/manifests/`
- **Release Notes**: `RELEASE_NOTES_vX.Y.Z.md`

## 🏁 Post-Release Steps

1. **Validate**: Run the automated validation tool:

```bash
npm run release:validate
```

2. **Checklist**: Complete the [Post-Release Checklist](../../releases/templates/PostReleaseChecklist.md).
3. **Notify**: Share the Executive Summary (`*-executive.md`) with stakeholders.

---
*For more details, see [ReleaseControlCenterGuide.md](./ReleaseControlCenterGuide.md)*
