import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'README.md',
  'LAUNCH.md',
  'ANNOUNCEMENT.md',
  'RELEASE_NOTES.md',
  'docs/QUICKSTART.md',
  'docs/LIVE_DEMO_CHECKLIST.md',
  'docs/LAUNCH_PACK.md',
  'docs/RELEASE_CHECKLIST.md',
  'docs/RUNBOOK.md',
  'docs/ROLLBACK.md',
  'docs/DISASTER_RECOVERY.md',
  'docs/KNOWN_FAILURE_MODES.md',
  'docs/USER_FEEDBACK_LOG.md',
  'scripts/demo.sh',
  'scripts/demo-crm.sh',
  'scripts/demo-internal-tool.sh'
];

const packageFile = path.join(ROOT, 'package.json');

function assertExists(relativePath: string): void {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

function assertPackageScript(name: string): void {
  const rawPackage = fs.readFileSync(packageFile, 'utf-8');
  const pkg = JSON.parse(rawPackage) as { scripts?: Record<string, string> };
  if (!pkg.scripts?.[name]) {
    throw new Error(`Missing script entry in package.json: ${name}`);
  }
}

function assertContains(relativePath: string, expected: string): void {
  const filePath = path.join(ROOT, relativePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes(expected)) {
    throw new Error(`Expected ${relativePath} to include ${JSON.stringify(expected)}`);
  }
}

function main(): void {
  console.log('🔍 Validating Phase 5 launch readiness...');

  requiredFiles.forEach(assertExists);
  assertPackageScript('demo');
  assertPackageScript('validate-launch');
  assertPackageScript('test:phase5');

  assertContains('docs/LIVE_DEMO_CHECKLIST.md', 'npm run demo');
  assertContains('docs/DEMO_VARIANTS.md', 'npm run demo');

  console.log('✅ Phase 5 launch readiness validation passed.');
}

try {
  main();
  process.exit(0);
} catch (error) {
  console.error(`❌ Phase 5 launch readiness validation failed.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
