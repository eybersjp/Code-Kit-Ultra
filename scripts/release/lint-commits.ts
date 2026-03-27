import { execSync } from 'node:child_process';

const TYPES = [
  'feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'build', 'ci', 'chore', 'revert', 'security'
];

/**
 * Validates a single commit message against Conventional Commits.
 */
export function validateMessage(msg: string): boolean {
  const regex = new RegExp(`^(${TYPES.join('|')})(\\(.+\\))?!?: .+$`);
  return regex.test(msg.split('\n')[0]);
}

/**
 * Lints all commits in a given range (default: last 5)
 */
function lintCommits(range: string = 'HEAD~5..HEAD') {
  console.log(`🔍 Linting commit messages in range: ${range}...`);
  
  let logs = '';
  try {
    logs = execSync(`git log ${range} --oneline --no-merges`, { encoding: 'utf8' }).trim();
  } catch (e) {
    console.warn('⚠️ Could not fetch git logs for linting.');
    return;
  }

  const lines = logs.split('\n');
  let failures = 0;

  for (const line of lines) {
    const hash = line.substring(0, line.indexOf(' '));
    const msg = line.substring(line.indexOf(' ') + 1);

    if (!validateMessage(msg)) {
      console.error(`❌ Non-conforming commit at ${hash}: "${msg}"`);
      failures++;
    } else {
      console.log(`✅ ${hash}: ${msg}`);
    }
  }

  if (failures > 0) {
    console.error(`\n🛑 Found ${failures} non-conforming commit(s).`);
    process.exit(1);
  } else {
    console.log('\n✨ All commits follow Conventional Commits conventions.');
  }
}

const rangeArg = process.argv[2];
lintCommits(rangeArg);
