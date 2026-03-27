import fs from 'node:fs';
import path from 'node:path';
import { getRootVersion } from './utils.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

const targetVersion = process.argv[2] || getRootVersion();
const date = new Date().toISOString().split('T')[0];
const isDryRun = process.argv.includes('--dry-run');

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

  // If no body provided, we should probably generate a default classified skeleton
  const defaultBody = 
    `### 🚀 Features\n- New version ${targetVersion}\n\n` +
    `### 🐞 Bug Fixes\n- Maintenance updates\n`;

  const finalBody = newBody || defaultBody;

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
      
      changelog = before + versionHeader + '\n\n' + finalBody + '\n' + after.trimStart();
    }
  } else {
    // New entry: Prepend after the main header
    const mainHeaderIdx = changelog.indexOf('\n## '); 
    if (mainHeaderIdx === -1) {
      // No existing versions, just append
      changelog += `\n${versionHeader}\n\n${finalBody}`;
    } else {
      const before = changelog.substring(0, mainHeaderIdx).trimEnd();
      const after = changelog.substring(mainHeaderIdx).trimStart();
      changelog = before + `\n\n${versionHeader}\n\n${finalBody}\n` + after;
    }
  }

  if (isDryRun) {
    console.log(`⚠️ DRY RUN: CHANGELOG.md would be updated for version ${targetVersion}.`);
    console.log('\n--- CHANGELOG PREVIEW ---');
    console.log(changelog.substring(0, 1000) + '...');
  } else {
    fs.writeFileSync(CHANGELOG_PATH, changelog.trim() + '\n');
    console.log(`✅ Updated CHANGELOG.md for v${targetVersion}`);
  }
}

// Logic to read from stdin or a provided file can be added here
const providedBody = process.argv.slice(3).filter(a => !a.startsWith('--')).join(' '); 
updateChangelog(providedBody);
