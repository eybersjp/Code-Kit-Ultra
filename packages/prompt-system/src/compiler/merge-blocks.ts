/**
 * Merges additional named context blocks into a base prompt string.
 *
 * Each block whose value is a non-empty string is appended to the base content
 * separated by a blank line. Block names are emitted as Markdown headings so
 * that the merged output remains readable in audit snapshots.
 *
 * This function deliberately does NOT use Handlebars – it is a plain string
 * concatenation utility used when blocks are resolved outside the template
 * engine (e.g. dynamically injected at runtime after the initial render).
 *
 * @param base    The already-rendered base prompt string.
 * @param blocks  A map of block name → block content strings.
 * @returns       The combined prompt with all non-empty blocks appended.
 */
export function mergeContextBlocks(
  base: string,
  blocks: Record<string, string>,
): string {
  const parts: string[] = [base.trimEnd()];

  for (const [name, content] of Object.entries(blocks)) {
    if (typeof content === 'string' && content.trim().length > 0) {
      parts.push(`\n\n<!-- block: ${name} -->\n${content.trimEnd()}`);
    }
  }

  return parts.join('');
}
