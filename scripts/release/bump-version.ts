import fs from 'node:fs';
import path from 'node:path';
import { findWorkspacePackages } from './utils.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const ROOT_PKG_PATH = path.join(ROOT_DIR, 'package.json');
const VERSION_FILE_PATH = path.join(ROOT_DIR, 'VERSION');

const args = process.argv.slice(2).filter(a => a !== '--dry-run');
const type = args[0]; // major, minor, patch, or explicit version
const isDryRun = process.argv.includes('--dry-run');

/**
 * Validates SemVer format
 */
function isValidVersion(v: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/.test(v);
}

/**
 * Simple SemVer comparison (returns true if v1 < v2)
 */
function isVersionLower(v1: string, v2: string): boolean {
  const parts1 = v1.split('-')[0].split('.').map(Number);
  const parts2 = v2.split('-')[0].split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] < parts2[i]) return true;
    if (parts1[i] > parts2[i]) return false;
  }
  return false;
}

/**
 * Increments version
 */
function increment(current: string, type: string): string {
  const [v, pre] = current.split('-');
  const parts = v.split('.').map(Number);
  
  if (type === 'major') parts[0]++;
  if (type === 'minor') parts[1]++;
  if (type === 'patch') parts[2]++;
  
  if (type === 'major' || type === 'minor') parts[2] = 0;
  if (type === 'major') parts[1] = 0;
  
  return parts.join('.');
}

async function run() {
  if (!type) {
    console.error('Usage: tsx bump-version.ts <major|minor|patch|version> [--dry-run]');
    process.exit(1);
  }

  // 1. Determine current version
  let currentVersion = '1.2.0'; // Default baseline
  if (fs.existsSync(ROOT_PKG_PATH)) {
    const pkg = JSON.parse(fs.readFileSync(ROOT_PKG_PATH, 'utf8'));
    if (pkg.version) currentVersion = pkg.version;
    else if (fs.existsSync(VERSION_FILE_PATH)) {
      currentVersion = fs.readFileSync(VERSION_FILE_PATH, 'utf8').trim().split('-')[0];
    }
  }

  // 2. Determine target version
  let targetVersion = '';
  if (['major', 'minor', 'patch'].includes(type)) {
    targetVersion = increment(currentVersion, type);
  } else {
    targetVersion = type;
  }

  // 3. Safety checks
  if (!isValidVersion(targetVersion)) {
    console.error(`❌ Invalid version format: ${targetVersion}`);
    process.exit(1);
  }

  if (!isVersionLower(currentVersion, targetVersion) && currentVersion !== targetVersion) {
    console.error(`❌ Target version (${targetVersion}) must be higher than current version (${currentVersion})`);
    process.exit(1);
  }

  // 4. Find files to update
  const filesToUpdate = findWorkspacePackages();
  if (fs.existsSync(VERSION_FILE_PATH)) {
    filesToUpdate.push(VERSION_FILE_PATH);
  }

  console.log('--------------------------------------------------');
  console.log(`🚀 Bumping version: ${currentVersion} -> ${targetVersion}`);
  if (isDryRun) console.log('⚠️  DRY RUN MODE ENABLED');
  console.log('--------------------------------------------------');

  const updatedFiles: string[] = [];

  if (isDryRun) {
    console.log('⚠️ DRY RUN: No files were modified.');
    for (const file of filesToUpdate) {
      updatedFiles.push(path.relative(ROOT_DIR, file));
    }
  } else {
    for (const file of filesToUpdate) {
      const relativePath = path.relative(ROOT_DIR, file);
      
      if (file.endsWith('package.json')) {
        const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
        pkg.version = targetVersion;
        fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
        updatedFiles.push(relativePath);
      } else if (file.endsWith('VERSION')) {
        fs.writeFileSync(file, targetVersion + '\n');
        updatedFiles.push(relativePath);
      }
    }
    console.log('✅ Version bump complete.');
  }

  console.log('\nModified Files (Affected):');
  updatedFiles.forEach(f => console.log(` - ${f}`));
  console.log('--------------------------------------------------');
}

run();
