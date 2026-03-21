import fs from "node:fs";
import path from "node:path";

const required = [
  "README.md", "LICENSE", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "ROADMAP.md", "FAQ.md", "CHANGELOG.md", "RELEASE_NOTES.md", "LAUNCH.md", "ANNOUNCEMENT.md", ".env.example", "docs/QUICKSTART.md", "docs/WHY_CODE_KIT_ULTRA.md", "docs/FIRST_RUN_TUTORIAL.md", "docs/USE_CASES.md", "docs/FEATURE_MATRIX.md", "docs/INSTALL_IN_10_MINUTES.md", ".github/ISSUE_TEMPLATE/bug_report.md", ".github/ISSUE_TEMPLATE/feature_request.md", ".github/pull_request_template.md", ".github/DISCUSSION_TEMPLATE/ideas.md", ".github/workflows/public-release.yml", "scripts/build-public-release.sh", "scripts/generate-checksums.sh"
];

for (const file of required) {
  if (!fs.existsSync(path.resolve(file))) {
    console.log(`MISSING: ${file}`);
  } else {
    console.log(`OK: ${file}`);
  }
}
