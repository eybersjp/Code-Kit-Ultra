import fs from 'node:fs';
import path from 'node:path';
import { getRootVersion } from './utils.js';

const rootDir = path.resolve(import.meta.dirname, '../../');

/**
 * Prepares a template for the release notes based on the current version.
 */
function prepareReleaseNotes() {
  const version = process.argv[2] || getRootVersion();
  const filePath = path.join(rootDir, `RELEASE_NOTES_v${version}.md`);

  if (fs.existsSync(filePath)) {
    console.warn(`⚠️ Release notes already exist at ${filePath}`);
    return;
  }

  const content = `# Release Notes — Code Kit Ultra v${version}

## 🔖 Version
**v${version}**

## 🎯 Highlights
- [High-level feature summary]

## 🛠️ Performance & Hygiene
- [Refactorings or performance gains]

## 🤝 Next Steps
- [What human operators should focus on next]

## 📁 Artifacts
Run the release script to generate the distribution ZIP.
`;

  fs.writeFileSync(filePath, content);
  console.log(`✅ Prepared release notes template: ${filePath}`);
}

prepareReleaseNotes();
