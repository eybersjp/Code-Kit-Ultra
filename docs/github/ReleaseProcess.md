# Release Process: Code Kit Ultra

This guide explains how to prepare, execute, and verify a release for the Code Kit Ultra platform. We use an automated **Locked Versioning** model to keep all components in sync across the monorepo.

---

## 1. Governance: Choosing the Version Type

We follow Semantic Versioning (SemVer) within a governed mono-repo:

- **MAJOR**: Breaking architectural changes (e.g., identity plane cutover, DB schema overhaul).
- **MINOR**: Feature milestones and Phase completions (e.g., Phase 10 - Self-Learning).
- **PATCH**: Bug fixes, security updates, and maintenance.

---

## 2. Execution: Running the Release Workflow

The primary method for releasing is via the **GitHub Actions** workflow: `version-bump-release.yml`.

1.  Navigate to the **Actions** tab in the repository.
2.  Select the **Manual Release Preparation** workflow.
3.  Click **Run workflow**.
4.  Enter the **Release Type** (`major`, `minor`, `patch`) or an explicit version.
5.  Provide a short **Release Summary** (e.g., "Phase 10.5 Self-Healing Baseline").
6.  Click **Run workflow**.

---

## 3. Automation Details

When the workflow runs, it automatically performs the following steps iteratively:

- **Verifies Health**: Runs `npm run typecheck` to ensure no broken code is released.
- **Syncs Versions**: Updates root `package.json`, `VERSION`, and all workspace `package.json` files.
- **Generates Notes**: Extracts categorized commits (`Added`, `Fixed`, etc.) into `RELEASE_NOTES_vX.Y.Z.md`.
- **Updates Changelog**: Prepends the release data and your summary logic to `CHANGELOG.md`.
- **Commits & Tags**: Commits metadata changes and creates an atomic git tag (e.g., `v1.2.1`).
- **Publishes Release**: Creates a formal GitHub Release using the generated notes as the description.

---

## 4. Manual / Local Release (Fallback)

If you need to run the release pipeline locally (e.g., for early testing before pushing):

```powershell
# 1. Bump version across the monorepo
npm run version:bump [type]

# 2. Generate release metadata and update changelog
npm run release:prepare

# 3. Create the artifact (ZIP)
npm run package:release
```

---

## 5. Recovery: Handling Failed Releases

If a release fails midway through the automation:

- **Before Commit**: No action required. Fix the error (e.g., type error) and re-run.
- **After Commit but Before Push**: Run `git reset --hard HEAD~1` locally to clean up.
- **After Tag/Release Push**:
  1.  Delete the tag locally: `git tag -d vX.Y.Z`
  2.  Delete the tag remotely: `git push --delete origin vX.Y.Z`
  3.  Delete the GitHub Release via the UI.
  4.  Re-run the workflow with the same version number if corrected.

---

## 6. Post-Release Verification

After the workflow completes, human operators must verify:

1.  **Release Artifact**: Check that the GitHub Release has the correct `.md` notes and (if configured) any build assets.
2.  **Tag Integrity**: Ensure the repo is correctly tagged at the release commit.
3.  **Documentation Sync**: Verify that `CHANGELOG.md` at the root contains the new version header and entry.
4.  **VS Code Extension**: If the IDE extension was bumped, verify that it loads correctly and shows the new version in the Status Bar.

---
*Code Kit Ultra: Governance-First Release Management*
