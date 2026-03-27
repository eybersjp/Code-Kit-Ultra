# Post-Release Validation Checklist: Code Kit Ultra Template

## 🕒 Overview

This checklist defines the critical verification points that must be confirmed **after** a release has been merged to `main` and tagged.

## ✅ Verification Checklist

- [ ] **Git Tag Published**: Does the tag `vX.Y.Z` exist on origin?
- [ ] **GitHub Release Published**: Is the release visible on GitHub with correct notes?
- [ ] **Changelog Updated**: Does `CHANGELOG.md` in the `main` branch reflect the new version?
- [ ] **RCC Manifest Stored**: Is the unique `.json` manifest for this version in `releases/control-center/manifests/`?
- [ ] **RCC Report Stored**: Is the `.md` report in `releases/control-center/reports/`?
- [ ] **Artifact Presence**: Are all build artifacts (`dist/`, `package-lock.json`, etc.) in the correct state?
- [ ] **No Leakage**: Confirm no sensitive `.env` files or temporary build artifacts are present in the stable release branch.
- [ ] **Version Synchronization**: Check workspace versions (`apps/`, `packages/`, `extensions/`) against the root version.

## 🔄 Post-Release Validation Script
Run the automated validation tool:
```bash
npm run release:validate
```

## 📜 Failure Handling

If any post-release checks fail:

1. **Quarantine**: If the issue is critical/security-related, immediately trigger the rollback procedure.
2. **Patch**: If the issue is minor (e.g., missed changelog entry), create a hotfix/patch release.
3. **Notify**: Inform the release lead and update the Release Control Center record as a post-release failure.
