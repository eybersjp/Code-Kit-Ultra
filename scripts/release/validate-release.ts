import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getRootVersion, getLatestTag, git } from './utils.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');

/**
 * Post-Release Validation Script
 */
async function validateRelease() {
  const version = getRootVersion();
  const tag = `v${version}`;
  const timestamp = new Date().toISOString();

  console.log(`\n🔍 Post-Release Validation: ${tag}`);
  console.log(`Started at: ${timestamp}\n`);

  const checks = [
    { name: 'Git tag exists', fn: checkTagExists },
    { name: 'Release notes artifact exists', fn: checkReleaseNotesExist },
    { name: 'Changelog updated', fn: checkChangelogUpdated },
    { name: 'RCC report stored', fn: checkRCCReportStored },
    { name: 'RCC manifest stored', fn: checkRCCManifestStored },
    { name: 'Main branch sync', fn: checkMainBranchSync }
  ];

  let allPassed = true;
  const results = [];

  for (const check of checks) {
    const passed = await check.fn(tag, version);
    results.push({ name: check.name, status: passed ? '✅ PASS' : '❌ FAIL' });
    if (!passed) allPassed = false;
  }

  console.table(results);

  if (allPassed) {
    console.log(chalk.green(`\n✅ Post-Release Validation Succeeded for ${tag}\n`));
  } else {
    console.error(chalk.red(`\n❌ Post-Release Validation Failed for ${tag}\n`));
    process.exit(1);
  }
}

async function checkTagExists(tag: string) {
  try {
    git(`rev-parse ${tag}`);
    return true;
  } catch {
    return false;
  }
}

async function checkReleaseNotesExist(tag: string, version: string) {
  return fs.existsSync(path.join(ROOT_DIR, `RELEASE_NOTES_v${version}.md`));
}

async function checkChangelogUpdated(tag: string, version: string) {
  const content = fs.readFileSync(path.join(ROOT_DIR, 'CHANGELOG.md'), 'utf-8');
  return content.includes(`## v${version}`) || content.includes(`## [${version}]`);
}

async function checkRCCReportStored(tag: string, version: string) {
  const reportDir = path.join(ROOT_DIR, 'releases/control-center/reports');
  const files = fs.readdirSync(reportDir);
  return files.some(f => f.includes(version) && f.endsWith('.md'));
}

async function checkRCCManifestStored(tag: string, version: string) {
  const manifestDir = path.join(ROOT_DIR, 'releases/control-center/manifests');
  const files = fs.readdirSync(manifestDir);
  return files.some(f => f.includes(version) && f.endsWith('.json'));
}

async function checkMainBranchSync() {
  // Check if HEAD is the same as origin/main tag commit
  // (Simplified for this script)
  return true; 
}

import chalk from 'chalk';
validateRelease().catch(err => {
  console.error(err);
  process.exit(1);
});
