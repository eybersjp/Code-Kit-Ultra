# Code Kit Ultra — Release Artifact Checklist

This checklist must be completed and verified before a Milestone Release is considered "Closed."

## 🏷️ Identity & Versioning
- [ ] `VERSION` file updated with correct semantic version.
- [ ] Root `package.json` version field synchronized with `VERSION`.
- [ ] Git tag created and pushed (format: `vX.Y.Z-milestone`).

## ✍️ Documentation & Changelog
- [ ] `CHANGELOG.md` updated with latest version section.
- [ ] Commits categorized (feat, fix, docs, etc.) correctly.
- [ ] `RELEASE_NOTES.md` updated with highlights for the milestone.
- [ ] Internal documentation/wikis updated if APIs changed.

## ✅ Verification
- [ ] `npm run typecheck` passes in all workspaces.
- [ ] `npm run test:smoke` passes (including phase-specific tests).
- [ ] environment validation passes for SaaS and Local modes.

## 🚀 Deployment & Distribution
- [ ] GitHub Release created with correct tag and notes.
- [ ] Production baseline deployed to environment.
- [ ] Rollback strategy verified and documented.

## 🏁 Post-Release
- [ ] Milestone Release Dashboard generated and committed.
- [ ] Announcement sent to stakeholders.
- [ ] Development branch merged and synced.
