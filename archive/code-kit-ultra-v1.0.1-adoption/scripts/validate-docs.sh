#!/usr/bin/env bash
set -e

for f in README.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md ROADMAP.md FAQ.md CHANGELOG.md RELEASE_NOTES.md LAUNCH.md ANNOUNCEMENT.md SECURITY.md SUPPORT.md docs/QUICKSTART.md docs/WHY_CODE_KIT_ULTRA.md docs/FIRST_RUN_TUTORIAL.md docs/USE_CASES.md docs/FEATURE_MATRIX.md docs/INSTALL_IN_10_MINUTES.md docs/RELEASE_CHECKLIST.md docs/RUNBOOK.md docs/ROLLBACK.md docs/DISASTER_RECOVERY.md docs/KNOWN_FAILURE_MODES.md; do
  if [ ! -f "$f" ]; then
    echo "Missing doc: $f"
    exit 1
  fi
done

echo "Docs validation passed"