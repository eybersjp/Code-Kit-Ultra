import fs from "node:fs";
import path from "node:path";

const required = [
  ".env.example",
  "README.md",
  "CHANGELOG.md",
  "RELEASE.md",
  "RELEASE_NOTES.md",
  "SECURITY.md",
  "SUPPORT.md",
  "VERSION",
  "docs/QUICKSTART.md",
  "docs/RUNBOOK.md",
  "docs/ROLLBACK.md",
  "docs/DISASTER_RECOVERY.md",
  "docs/KNOWN_FAILURE_MODES.md",
  "scripts/bootstrap.sh",
  "scripts/preflight-check.sh",
  "scripts/package-release.sh",
  "scripts/validate-docs.sh",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  ".github/workflows/validate-config.yml",
  ".github/workflows/package-artifacts.yml",
  "config/runtime-hardening.json"
];

for (const file of required) {
  if (!fs.existsSync(path.resolve(file))) throw new Error(`Missing required file: ${file}`);
}

console.log("Smoke test passed");