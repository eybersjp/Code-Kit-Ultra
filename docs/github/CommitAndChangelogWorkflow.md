# Commit and Changelog Workflow: Code Kit Ultra

This guide explains the daily workflow for using Conventional Commits and our automated changelog classification system.

---

## 1. Writing Commits

Always use the **Conventional Commit** format for all work.

**Format**: `type(scope): summary`

**Common Types**:
- `feat`: New features (shown in "Features")
- `fix`: Bug fixes (shown in "Bug Fixes")
- `refactor`: Internal structure (shown in "Refactors")
- `perf`: Faster code (shown in "Performance")
- `docs`: Documentation (shown in "Documentation")
- `ci`, `build`: Tooling and CI (shown in "Build / CI")
- `chore`: Internal tasks (shown in "Maintenance")

**Breaking Changes**:
Add `!` to the type or scope (e.g., `feat(api)!: change contract`). Both the version bump (major) and the changelog highlights (⚠️ Header) will use this.

---

## 2. Managing Pull Requests

When creating a PR, the **PR Title** should follow the commit convention.

- **Why?**: The PR title is the primary source for the final Release Notes and Changelog entry if many commits are squashed.
- **Guidance**: Even if individual commits are informal, keep the PR title professional and conforming (e.g., `feat(auth): transition to session-first auth`).

---

## 3. Automated Validation

1.  **CI Validation**: Every PR is automatically linted for commit compliance. If a commit or PR title does not conform, the **Lint Commit Messages** workflow will fail.
2.  **Local Linting (Optional)**: You can run the linting tool locally:
    ```bash
    npm run lint:commits
    ```

---

## 4. Generating Releases

When performing a release (manually via GitHub Actions or locally):
1.  Run the **version bump** to calculate the new version.
2.  The **Release Notes Generator** will automatically group your commits into sections based on their types.
3.  The **Changelog Update Utility** will prepend the new release with its classified content.

**Falling Back**: If you have non-conforming commits in the history, they will be automatically grouped under **"Other Changes"**. We recommend cleaning these up before tagging the release.

---
*Code Kit Ultra: Reliable Governance and Automated Communication*
