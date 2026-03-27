# Code Kit Ultra Release Process

This document defines the steps for preparing, verifying, and publishing a release.

## Versioning Strategy

We use Semantic Versioning (SemVer) with milestone suffixes where appropriate.
- `vX.Y.Z`: Stable production release.
- `vX.Y.Z-phaseN`: Milestone baseline for a specific development phase.

## Release Steps

1. **Stabilization**: Create a `release/*` branch from `develop`.
2. **Verification**: Run `npm run typecheck` and all smoke tests.
3. **Changelog**: Update `CHANGELOG.md` with the new version and its changes.
4. **Approval**: Open a PR from the release branch to `main`. At least one maintainer review is required.
5. **Tagging**:
   - Use the `Release Milestone` GitHub Action to create the tag and release.
   - Or manually: `git tag -a v1.X.Y -m "Release description" && git push origin v1.X.Y`.
6. **Cleanup**: Merge `main` back into `develop` to sync core updates.

## Emergency Hotfixes
1. Create `hotfix/*` from `main`.
2. Verify and merge to `main` with a patch version bump (e.g., `v1.2.1`).
3. Merge back to `develop` immediately.
