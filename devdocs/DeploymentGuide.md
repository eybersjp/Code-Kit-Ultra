# Deployment & Configuration Guide

## 1. Prerequisites
- **Node.js**: v22.10.0 or higher.
- **NPM**: v10.x or higher.
- **Git**: v2.40.x or higher.

## 2. Local Installation
For a local developer environment, follow these steps:
1. **Clone**: `git clone git@github.com:eybersjp/Code-Kit-Ultra.git`
2. **Install**: `npm install`
3. **Link**: `npm link` (optional, makes `ck` command globally available).

## 3. Configuration

### 3.1 Environment Variables
Create a `.env` file in the root to override default system behavior.
- `CK_REPO_ROOT`: Custom path for `.codekit` storage.
- `CK_LOG_LEVEL`: `debug`, `info`, `warn`, or `error`.

### 3.2 Registry Customization
Modify `config/skill-registry.json` to add internal team implementation skills.

## 4. Packaging for Release
To package a release for distribution:
1. **Lint & Typecheck**: `npm run preflight`
2. **Bundle**: System runs as ESM modules directly. No bundling required.
3. **Checksums**: `npm run checksums` (generates integrity hashes for the release package).
4. **Publish**: `gh release create v...` (using the GitHub CLI).

## 5. Deployment Pipelines
- **CI**: Automated GitHub Actions run `typecheck`, `lint`, and `test:smoke` on every PR.
- **CD**: Successful merges to `main` trigger a draft release creation.
