# Milestone Release Dashboard Specification

## Purpose
The Milestone Release Dashboard (MRD) provides a centralized, high-visibility control point for every major phase or milestone release of Code Kit Ultra. It serves both engineering teams (for verification and readiness) and leadership (for progress and governance visibility).

## Data Model (Internal)
The dashboard is backed by a machine-readable JSON structure which is then rendered into a human-friendly Markdown report.

### Core Identity
- `milestoneName`: String. High-level name of the phase (e.g., "Phase 10: Self-Learning").
- `version`: String. Semantic version (e.g., "1.2.0").
- `tag`: String. Git tag associated with the release (e.g., "v1.2.0-phase10").
- `releaseDate`: String (ISO 8601).
- `branch`: String. Active branch being released.
- `commitHash`: String. Full Git SHA of the release commit.

### Verification State
- `typecheck`: "PASS" | "FAIL".
- `smokeTests`: "PASS" | "FAIL" | "PARTIAL".
- `envValidation`: "PASS" | "FAIL".
- `securityAudit`: "PASS" | "FAIL" | "PENDING".
- `verificationNotes`: String. Detailed output or context on failures.

### Release Context
- `releaseSummary`: String. Executive summary of the release goals and impact.
- `changelogPreview`: Array of objects (type, description). Distilled from CHANGELOG.md.
- `releaseNotesSummary`: Array of strings. Key highlights from RELEASE_NOTES.md.

### Governance & Risk
- `blockers`: Array of strings. Active items preventing release.
- `risks`: Array of strings. Areas of concern or technical debt acknowledged.
- `rollbackNotes`: String. Quick-start instructions for reverting in production.

### Artifact Checklist
- `versionFileUpdated`: Boolean.
- `tagCreated`: Boolean.
- `changelogUpdated`: Boolean.
- `releaseNotesGenerated`: Boolean.
- `deploymentArtifactsBuilt`: Boolean.

## Input / Output
- **Inputs**: Automated (git, local files) and Manual (workflow_dispatch params).
- **Outputs**:
  - `releases/milestones/[DATE]-[VERSION].md`: Human-readable report.
  - `releases/milestones/[DATE]-[VERSION].json`: Machine-readable summary.

## Dashboard Layout (Markdown)
1. **Title**: Milestone Release Dashboard: [Milestone Name]
2. **Metadata Table**: Version, Tag, Branch, Commit, Date.
3. **Verification Summary**: Large visual indicators (PASS/FAIL) for CI status.
4. **Highlights Section**: Bullets for key release notes.
5. **Change Summary**: Categorized commit/changelog data.
6. **Artifact Checklist**: Table showing readiness states.
7. **Governance**: Blockers, Risks, and Rollback strategy.
8. **Next Actions**: Final steps before release closure.

## Failure Handling
If verification steps (e.g., smoke tests) fail, the dashboard MUST explicitly report "BLOCKED" and show failure details in the Notes section.
