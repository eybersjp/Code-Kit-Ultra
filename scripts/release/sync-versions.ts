import fs from 'node:fs';
import { findWorkspacePackages } from './utils.js';

const targetVersion = process.argv[2];

if (!targetVersion || !/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/.test(targetVersion)) {
  console.error('Usage: tsx sync-versions.ts <version>');
  process.exit(1);
}

/**
 * Syncs the given version to all package.json files in the monorepo.
 */
function syncVersions(version: string) {
  const packageFiles = findWorkspacePackages();

  console.log(`🚀 Synchronizing monorepo to version: ${version}`);

  for (const pkgPath of packageFiles) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const oldVersion = pkg.version;

    if (oldVersion === version) {
      console.log(`   - ${pkg.name} is already at ${version}`);
      continue;
    }

    pkg.version = version;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`   - Updated ${pkg.name}: ${oldVersion} -> ${version}`);
  }

  console.log('\n✅ All packages are now at ' + version);
}

syncVersions(targetVersion);
