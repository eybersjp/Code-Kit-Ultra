import fs from 'node:fs';
import path from 'node:path';
import { getRootVersion } from './utils.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

const targetVersion = process.argv[2] || getRootVersion();
const date = new Date().toISOString().split('T')[0];

/**
 * Updates the CHANGELOG.md file with new release content.
 * 
 * @param content The markdown content (body only) to insert.
 */
function updateChangelog(newBody?: string) {
  let changelog = '';
  if (fs.existsSync(CHANGELOG_PATH)) {
    changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  } else {
    changelog = '# Changelog\n\nAll notable changes to Code Kit Ultra will be documented in this file.\n';
  }

  const versionHeader = `## [${targetVersion}] - ${date}`;
  const versionRegex = new RegExp(`## \\[${targetVersion.replace(/\./g, '\\.')}\\].*`, 'g');

  // Check if version already exists
  if (versionRegex.test(changelog)) {
    console.warn(`⚠️ Version ${targetVersion} already exists in CHANGELOG.md. Overwriting entry...`);
    
    // Find next version header or end of file
    const match = versionRegex.exec(changelog);
    if (match) {
      const startIndex = match.index;
      const remaining = changelog.substring(startIndex + match[0].length);
      const nextHeaderMatch = /## \[/.exec(remaining);
      const endIndex = nextHeaderMatch ? startIndex + match[0].length + nextHeaderMatch.index : changelog.length;
      
      const before = changelog.substring(0, startIndex);
      const after = changelog.substring(endIndex);
      
      changelog = before + versionHeader + '\n\n' + (newBody || '### Changed\n- Internal updates\n') + '\n' + after.trimStart();
    }
  } else {
    // New entry: Prepend after the main header
    const mainHeaderIdx = changelog.indexOf('\n## '); 
    if (mainHeaderIdx === -1) {
      // No existing versions, just append
      changelog += `\n${versionHeader}\n\n${newBody || '### Added\n- Initial release\n'}`;
    } else {
      const before = changelog.substring(0, mainHeaderIdx).trimEnd();
      const after = changelog.substring(mainHeaderIdx).trimStart();
      changelog = before + `\n\n${versionHeader}\n\n${newBody || '### Changed\n- Maintenance updates\n'}\n` + after;
    }
  }

  fs.writeFileSync(CHANGELOG_PATH, changelog.trim() + '\n');
  console.log(`✅ Updated CHANGELOG.md for v${targetVersion}`);
}

// Logic to read from stdin or a provided file can be added here
// For now, it defaults to a placeholder if no body is provided.
const providedBody = process.argv[3]; 
updateChangelog(providedBody);
