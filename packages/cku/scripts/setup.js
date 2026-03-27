import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';

function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((child) => {
            copyRecursiveSync(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

const targetDir = path.resolve(process.env.INIT_CWD || process.cwd());
const ckuHome = path.join(targetDir, 'codekit');

console.log('🚀 Initializing Code Kit Ultra (CKU) environment...');

// 1. Create codekit folder
if (!fs.existsSync(ckuHome)) {
    fs.mkdirSync(ckuHome, { recursive: true });
}

// 2. Setup internal monorepo subset
console.log(`📦 Nesting code under: ${ckuHome}`);

// Copy contents from the package into the target codekit folder
const installerDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sourceCodekit = path.join(installerDir, 'codekit');

try {
    if (fs.existsSync(sourceCodekit)) {
        console.log('✨ Moving CKU core modules to local codekit/ folder...');
        copyRecursiveSync(sourceCodekit, ckuHome);
    } else {
        console.warn('⚠️  Source codekit directory missing from installer package.');
    }
} catch (err) {
    console.error(`❌ Failed to populate codekit/ folder: ${err.message}`);
}

// 3. IDE Extension Installation
const isVSCode = process.env.TERM_PROGRAM === 'vscode' || process.env.VSCODE_IPC_HOOK_CLI || process.env.VSCODE_GIT_ASKPASS_NODE;

if (isVSCode) {
    console.log('💻 VS Code detected. Installing IDE extension...');
    try {
        // Here we attempt to find the VSIX if it's already packaged.
        // For development, we assume its in assets/
        const vsixPath = path.join(installerDir, 'assets', 'code-kit-vscode.vsix');
        if (fs.existsSync(vsixPath)) {
            execSync(`code --install-extension "${vsixPath}"`, { stdio: 'inherit' });
        } else {
            console.log('⚠️  VS Code extension VSIX not found in package assets. Skipping extension install.');
        }
    } catch (err) {
        console.warn('⚠️  Failed to install VS Code extension via CLI.');
    }
} else {
    console.log('ℹ️  Current IDE not automatically detected or supported for auto-extension-install.');
}

// 4. Update parent package.json
const parentPkgPath = path.join(targetDir, 'package.json');
if (fs.existsSync(parentPkgPath)) {
    try {
        const pkg = JSON.parse(fs.readFileSync(parentPkgPath, 'utf8'));
        pkg.scripts = pkg.scripts || {};
        pkg.scripts['cku'] = 'node ./codekit/apps/cli/src/index.ts';
        fs.writeFileSync(parentPkgPath, JSON.stringify(pkg, null, 2));
        console.log('✅ Added "cku" script to your root package.json');
    } catch {}
}

console.log(`\n🎉 CKU is ready! \n👉 cd codekit \n👉 npm install \n👉 npm run cku init "My project idea"\n`);
