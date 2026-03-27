import { git, getLatestTag } from './utils.js';

/**
 * Basic changelog generator that pulls commit messages between tags.
 */
function generateChangelog() {
  const latestTag = getLatestTag();
  console.log(`\n📄 Generating changelog since ${latestTag || 'beginning'}...`);

  const range = latestTag ? `${latestTag}..HEAD` : 'HEAD';
  const logs = git(`log ${range} --oneline --no-merges`);

  if (!logs) {
    console.log('No new commits found.');
    return;
  }

  const lines = logs.split('\n');
  const sections: Record<string, string[]> = {
    features: [],
    fixes: [],
    docs: [],
    other: [],
  };

  for (const line of lines) {
    const msg = line.substring(line.indexOf(' ') + 1);
    if (msg.startsWith('feat:')) sections.features.push(msg.replace('feat:', '').trim());
    else if (msg.startsWith('fix:')) sections.fixes.push(msg.replace('fix:', '').trim());
    else if (msg.startsWith('docs:')) sections.docs.push(msg.replace('docs:', '').trim());
    else sections.other.push(msg);
  }

  console.log('\n## Unreleased');

  if (sections.features.length > 0) {
    console.log('\n### Added');
    sections.features.forEach(f => console.log(`- ${f}`));
  }

  if (sections.fixes.length > 0) {
    console.log('\n### Fixed');
    sections.fixes.forEach(f => console.log(`- ${f}`));
  }

  if (sections.docs.length > 0) {
    console.log('\n### Docs');
    sections.docs.forEach(f => console.log(`- ${f}`));
  }
}

generateChangelog();
