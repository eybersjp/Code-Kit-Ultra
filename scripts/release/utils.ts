import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');

/**
 * Reads root package.json version
 */
export function getRootVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return pkg.version || '0.0.0';
}

/**
 * Finds all package.json files in the workspaces
 */
export function findWorkspacePackages(): string[] {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const workspaces: string[] = pkg.workspaces || [];
  const files: string[] = [];

  for (const workspace of workspaces) {
    const baseDir = path.join(ROOT_DIR, workspace.replace('/*', ''));
    if (!fs.existsSync(baseDir)) continue;

    const dirs = fs.readdirSync(baseDir);
    for (const dir of dirs) {
      const pkgPath = path.join(baseDir, dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        files.push(pkgPath);
      }
    }
  }

  // Also include root
  files.push(path.join(ROOT_DIR, 'package.json'));
  return files;
}

/**
 * Runs a git command and returns the output
 */
export function git(args: string): string {
  return execSync(`git ${args}`, { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
}

/**
 * Get the latest tag
 */
export function getLatestTag(): string {
  try {
    return git('describe --tags --abbrev=0');
  } catch {
    return '';
  }
}
