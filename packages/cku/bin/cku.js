#!/usr/bin/env node
const path = require('node:path');
const { spawn } = require('node:child_process');

// The bin should call the nested CLI in codekit/ folder
const ckuHome = path.join(process.cwd(), 'codekit');
const cliPath = path.join(ckuHome, 'apps', 'cli', 'src', 'index.ts');

if (!require('node:fs').existsSync(cliPath)) {
    console.error('❌  CKU environment not fully initialized or nested codekit/ missing.');
    console.error('    Try running: npm install cku --force');
    process.exit(1);
}

// In real life, we would use ts-node or just spawn tsx if it's there
const child = spawn('npx', ['tsx', cliPath, ...process.argv.slice(2)], { stdio: 'inherit' });

child.on('close', (code) => {
    process.exit(code);
});
