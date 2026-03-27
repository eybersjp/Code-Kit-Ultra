# Code Kit Ultra Git Workflow

This document defines the branching strategy, pull request flow, and release policies for Code Kit Ultra.

## Branching Model

We follow a structured branching model to ensure production stability and integration quality.

### Primary Branches
- **`main`**: The production-ready baseline. All code in `main` must be verified and stable.
- **`develop`**: The integration branch. Feature branches merge into `develop`.

### Supporting Branches
- **`feature/*`**: Short-lived branches for new features or improvements. Branched from `develop`.
- **`release/*`**: Stabilization and release preparation. Branched from `develop`.
- **`hotfix/*`**: Urgent production corrections. Branched from `main`.

## Naming Conventions
- **Feature**: `feature/feature-name` (e.g., `feature/login-migration`)
- **Release**: `release/vX.Y.Z` (e.g., `release/v1.2.0`)
- **Hotfix**: `hotfix/issue-description` (e.g., `hotfix/auth-leak-fix`)

## Pull Request Flow
1. **Source**: Always open a PR from your feature/hotfix branch.
2. **Review**: At least one approval is required from a maintainer listed in `CODEOWNERS`.
3. **Verification**: CI status checks (Typecheck, Test) must pass.
4. **Merge**: Use "Squash and Merge" for features. Use "Create a Merge Commit" for releases.

## Release Tagging Policy
- All releases to `main` must be tagged with matching semantic versioning (e.g., `v1.2.0`).
- Use annotated tags with a descriptive summary of the milestone.

## Rollback Principles
- **Immediate Revert**: If a merge to `main` breaks production, immediately revert the merge commit.
- **Hotfix First**: For non-blocking issues, promote a `hotfix/*` branch through the standard pipeline.
