import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageFile = path.join(ROOT, 'package.json');

const requiredFiles = [
  'docs/06_validation/PRODUCTION_READINESS.md',
  'docs/06_validation/GO_NO_GO_CHECKLIST.md',
  'docs/06_validation/SECURITY_AUDIT.md',
  'docs/CURRENT_STATE_REVIEW_2026-04-25.md',
  'docs/RECOMMENDED_ACTION_PLAN_2026-04-25.md',
  'docs/06_validation/FIRST_CUSTOMER_IMPLEMENTATION_PLAN.md',
];

function assertExists(relativePath: string): void {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

function assertContains(relativePath: string, expected: string): void {
  const absolutePath = path.join(ROOT, relativePath);
  const content = fs.readFileSync(absolutePath, 'utf-8');
  if (!content.includes(expected)) {
    throw new Error(`Expected ${relativePath} to include ${JSON.stringify(expected)}`);
  }
}

function assertScript(name: string): void {
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf-8')) as {
    scripts?: Record<string, string>;
  };
  if (!pkg.scripts?.[name]) {
    throw new Error(`Missing required script: ${name}`);
  }
}

function main(): void {
  console.log('🔍 Validating first-customer readiness baseline...');

  requiredFiles.forEach(assertExists);

  assertContains('docs/06_validation/GO_NO_GO_CHECKLIST.md', 'Gate 4 — Product Gate');
  assertContains('docs/06_validation/PRODUCTION_READINESS.md', 'HARD GATE');
  assertContains('docs/06_validation/SECURITY_AUDIT.md', 'Critical (P0)');
  assertContains('docs/06_validation/FIRST_CUSTOMER_IMPLEMENTATION_PLAN.md', 'Exit Criteria (Launch Ready)');

  assertScript('typecheck');
  assertScript('test:auth');
  assertScript('test:governance');
  assertScript('test:smoke');

  console.log('✅ First-customer readiness baseline is present.');
}

try {
  main();
  process.exit(0);
} catch (error) {
  console.error('❌ First-customer readiness baseline validation failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

