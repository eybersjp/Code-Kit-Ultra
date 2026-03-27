#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

// ─── helpers ────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  return spawnSync(cmd, { shell: true, stdio: 'inherit', ...opts });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // skip heavy dirs
      if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Walk every package.json under `root` and replace any
 * "workspace:*" (or "workspace:^x.y.z") value with the real
 * version declared in that package's own package.json, or "latest".
 */
function patchWorkspaceDeps(root) {
  // Build a map of package-name → version from all nested package.json files
  const versionMap = {};
  function scanVersions(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgPath = path.join(dir, entry.name, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (p.name && p.version) versionMap[p.name] = p.version;
        } catch {}
        scanVersions(path.join(dir, entry.name));
      }
    }
  }
  scanVersions(root);

  function patchFile(pkgPath) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      let changed = false;
      for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        if (!pkg[section]) continue;
        for (const [name, ver] of Object.entries(pkg[section])) {
          if (typeof ver === 'string' && ver.startsWith('workspace:')) {
            const resolved = versionMap[name] ? `^${versionMap[name]}` : 'latest';
            pkg[section][name] = resolved;
            changed = true;
          }
        }
      }
      if (changed) fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    } catch {}
  }

  function walkAndPatch(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkAndPatch(full);
      } else if (entry.name === 'package.json') {
        patchFile(full);
      }
    }
  }
  walkAndPatch(root);
}

// ─── IDE extension detection ─────────────────────────────────────────────────

function detectVSCode() {
  // Env vars set by VS Code terminal
  if (
    process.env.TERM_PROGRAM === 'vscode' ||
    process.env.VSCODE_IPC_HOOK_CLI ||
    process.env.VSCODE_GIT_ASKPASS_NODE ||
    process.env.VSCODE_INJECTION
  ) return 'vscode';

  // Try to resolve `code` binary — if it works we're in a Code-compatible env
  const probe = spawnSync('code', ['--version'], { shell: true });
  if (probe.status === 0) return 'vscode';

  return null;
}

function installVSCodeExtension(vsixPath) {
  if (!fs.existsSync(vsixPath)) {
    console.warn('⚠️  VSIX not found at:', vsixPath);
    return false;
  }
  console.log('💻 Installing VS Code extension from:', vsixPath);
  // Try both `code` and `code-insiders`
  for (const bin of ['code', 'code-insiders']) {
    const result = spawnSync(bin, ['--install-extension', vsixPath], {
      shell: true,
      stdio: 'inherit',
    });
    if (result.status === 0) {
      console.log(`✅ Extension installed via "${bin}".`);
      return true;
    }
  }
  console.warn('⚠️  Could not auto-install extension. Please open VS Code and run:');
  console.warn(`   Extensions → Install from VSIX → ${vsixPath}`);
  return false;
}

// ─── main ───────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// INIT_CWD is set by npm to the directory where `npm install` was run.
// We use that as the user's project root.
const targetDir = path.resolve(process.env.INIT_CWD || process.cwd());
const ckuHome = path.join(targetDir, 'codekit');
const installerDir = path.resolve(__dirname, '..'); // packages/cku/

console.log('\n🚀 Initializing Code Kit Ultra (CKU) environment...\n');
console.log('   Target directory:', targetDir);

// 1. Populate codekit/
const sourceCodekit = path.join(installerDir, 'codekit');
if (fs.existsSync(sourceCodekit)) {
  console.log('📦 Copying CKU core to ./codekit/...');
  copyDir(sourceCodekit, ckuHome);

  // Patch workspace:* in the destination BEFORE any npm install happens there
  console.log('🔧 Resolving workspace:* dependencies...');
  patchWorkspaceDeps(ckuHome);
  console.log('   workspace:* references resolved.');
} else {
  console.warn('⚠️  Source codekit/ directory not found in package. Skipping code population.');
}

// 2. Install VS Code extension
const ide = detectVSCode();
if (ide === 'vscode') {
  const vsixPath = path.join(installerDir, 'assets', 'code-kit-vscode.vsix');
  installVSCodeExtension(vsixPath);
} else {
  console.log('ℹ️  VS Code not detected in this terminal session.');
  const vsixPath = path.join(installerDir, 'assets', 'code-kit-vscode.vsix');
  if (fs.existsSync(vsixPath)) {
    console.log('   To install the extension manually run:');
    console.log(`   code --install-extension "${vsixPath}"`);
  }
}

// 3. Inject cku script into parent package.json (if present)
const parentPkgPath = path.join(targetDir, 'package.json');
if (fs.existsSync(parentPkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(parentPkgPath, 'utf8'));
    pkg.scripts = pkg.scripts || {};
    if (!pkg.scripts['cku']) {
      pkg.scripts['cku'] = 'npx tsx ./codekit/apps/cli/src/index.ts';
      fs.writeFileSync(parentPkgPath, JSON.stringify(pkg, null, 2));
      console.log('\n✅ Added "cku" script to your package.json');
    }
  } catch { /* non-critical */ }
}

console.log('\n🎉 CKU is ready!');
console.log('   Run \x1b[36mnpm run cku /ck-doctor\x1b[0m to verify.');
console.log('   Run \x1b[36mnpm run cku /ck-init "Your project idea"\x1b[0m to begin.\n');
