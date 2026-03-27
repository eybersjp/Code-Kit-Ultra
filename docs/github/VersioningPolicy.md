# Versioning Policy: Code Kit Ultra

This document defines the official versioning strategy for the Code Kit Ultra repository. To ensure stability for human operators and automated consumption, we adhere to a **governed, synchronized, and predictable** versioning model.

---

## 1. Versioning Model

**Locked Monorepo Versioning**
Code Kit Ultra uses a single repo-wide version. All applications (`apps/*`), extensions (`extensions/*`), and shared utilities (`packages/*`) share the exact same version number at any given point in time.

- **Why**: The Code Kit Ultra ecosystem is tightly coupled. A specific version of the VS Code extension requires a specific version of the Control Service and specific shared event contracts.
- **Simplicity**: One tag (`v1.2.0`) represents the entire system state.

---

## 2. SemVer Interpretation (`MAJOR.MINOR.PATCH`)

We follow [Semantic Versioning 2.0.0](https://semver.org/), interpreted through the lens of a governed autonomous platform.

### **MAJOR (`X.0.0`)**
Significant architectural breakthroughs or breaking interface changes.
- **Example**: Changing the core identity plane (e.g., migrating from API keys to mandatory sessions).
- **Example**: Moving from a local-first to a cloud-native delivery model.
- **Impact**: Requires manual intervention or a major upgrade path.

### **MINOR (`0.X.0`)**
Feature-complete milestones and "Phase" releases.
- **Example**: Completion of **Phase 10 (Self-Learning)**.
- **Example**: Introducing a new core capability (e.g., adding `packages/healing`).
- **Impact**: All components are updated, but backward compatibility is generally maintained.

### **PATCH (`0.0.X`)**
Security patches, bug fixes, and maintenance updates.
- **Example**: Fixing a race condition in the `orchestrator`.
- **Example**: Updating the VS Code extension for a specific IDE version fix.
- **Impact**: Low-risk, drop-in replacement.

---

## 3. Phase-Based Milestones

We map repository **Phases** to SemVer ranges to provide a clear roadmap:

| Phase | Milestone Name | Version Range (Expected) |
| :--- | :--- | :--- |
| **Phase 1-6** | Vertical Slice / Antigravity | `v1.0.x` |
| **Phase 7-9** | Governance & SaaS Foundation | `v1.1.x` |
| **Phase 10** | Autonomous Learning | `v1.2.0` |
| **Phase 10.5** | Self-Healing / Production | `v1.2.1-1.3.0` |

---

## 4. Tagging Rules

1.  **Format**: Every release must be tagged with `vMAJOR.MINOR.PATCH` (e.g., `v1.2.0`).
2.  **Pre-releases**: For internal testing or phase-completion candidates, use `-alpha`, `-beta`, or `-rc` (e.g., `v1.2.0-rc.1`).
3.  **Stability**: Once a tag is published (e.g., `v1.2.0`), its contents are **immutable**. Corrections must be issued as a new PATCH (`v1.2.1`).

---

## 5. Changelog & Release Notes

### **`CHANGELOG.md`**
The source of truth for technical changes.
- Must follow the **"Keep a Changelog"** format.
- Sections: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Every PR must update the `Unreleased` section.

### **Release Notes (`RELEASE_NOTES_vX.Y.Z.md`)**
The human-readable "What's New" document.
- High-level value propositions.
- Screenshots/GIFs of new features.
- Special instructions for human operators (Action Required).

---

## 6. Examples

### **Example 1: Phase 10 Milestone Release**
- **Trigger**: Full completion of Phase 10 requirements.
- **New Version**: `v1.2.0`
- **Scope**: All packages updated to 1.2.0.
- **Artifact**: `RELEASE_NOTES_v1.2.0.md` created.

### **Example 2: Patch Fix Release**
- **Trigger**: Critical bug found in the `auth` middleware.
- **New Version**: `v1.2.1`
- **Scope**: Minor code change in one package, but all packages are bumped to 1.2.1 for consistency.
- **Artifact**: Updated `CHANGELOG.md` under `[1.2.1] - FIXED`.

### **Example 3: Major Architecture Release**
- **Trigger**: Transition to "Code Kit Ultra 2.0" with multi-region support and breaking DB schema changes.
- **New Version**: `v2.0.0`
- **Scope**: Global repo-wide bump.
- **Artifact**: `UPGRADE_GUIDE_v2.md` created.

---

## 7. Compliance

Failure to follow the versioning policy during a release invalidates the release artifact. All automated release pipelines will fail if:
- Root `package.json` version != Workspace package versions.
- Git tag does not match root `package.json`.
- `CHANGELOG.md` is not updated for the current version.
