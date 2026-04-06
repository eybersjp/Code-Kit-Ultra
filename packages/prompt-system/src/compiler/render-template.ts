import Handlebars from 'handlebars';
import type { PromptBuildContext } from '../contracts.js';

/**
 * Renders a Handlebars template against the given build context.
 *
 * All entries in `partials` are registered on an isolated Handlebars
 * environment before the template is compiled. The `noEscape` option is set so
 * that context values that contain Markdown or other special characters are
 * not HTML-entity-encoded.
 *
 * @param templateSource  Raw Handlebars template string (e.g. from system.md).
 * @param context         The fully-resolved PromptBuildContext.
 * @param partials        Map of partial name → partial source string.
 * @returns               The fully-rendered prompt string.
 */
export function renderTemplate(
  templateSource: string,
  context: PromptBuildContext,
  partials: Record<string, string>,
): string {
  // Create a fresh Handlebars environment so partial registrations do not
  // leak between calls in long-running processes.
  const hbs = Handlebars.create();

  // Register all supplied partials before compiling the main template.
  for (const [name, source] of Object.entries(partials)) {
    hbs.registerPartial(name, source);
  }

  // Register a handful of useful helpers that templates may rely on.
  hbs.registerHelper('json', (value: unknown) =>
    JSON.stringify(value, null, 2),
  );

  hbs.registerHelper('join', (arr: unknown, separator: unknown) => {
    if (!Array.isArray(arr)) return '';
    const sep = typeof separator === 'string' ? separator : ', ';
    return arr.join(sep);
  });

  hbs.registerHelper('ifEq', function (
    this: unknown,
    a: unknown,
    b: unknown,
    options: Handlebars.HelperOptions,
  ) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  hbs.registerHelper('ifContains', function (
    this: unknown,
    arr: unknown,
    value: unknown,
    options: Handlebars.HelperOptions,
  ) {
    const inArray = Array.isArray(arr) && arr.includes(value);
    return inArray ? options.fn(this) : options.inverse(this);
  });

  const compiledTemplate = hbs.compile(templateSource, { noEscape: true });

  return compiledTemplate(context);
}
