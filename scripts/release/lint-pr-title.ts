import { validateMessage } from './lint-commits.js';

// This script is intended to be run in CI with the PR title as an argument.
const prTitle = process.argv[2];

if (!prTitle) {
  console.error('❌ No PR title provided.');
  process.exit(1);
}

console.log(`🔍 Validating PR title: "${prTitle}"...`);

if (!validateMessage(prTitle)) {
  console.error(`\n❌ PR title does not follow Conventional Commits: "${prTitle}"`);
  console.error('Expected format: type(scope)?: summary');
  console.error('Example: feat(orchestrator): add adaptive routing');
  process.exit(1);
}

console.log('✅ PR title is valid.');
