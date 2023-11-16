/**
 * Remove leading and trailing empty lines from a string.
 */
const trimEmptyLines = (str: string): string =>
  str.replace(/^\s*\n|\n\s*$/g, '');

/**
 * Remove leading indentation from each line of a string.
 */
function unIndent(str: string) {
  // Match the smallest indentation
  const match = str.match(/^[ \t]*(?=\S)/gm);
  const indent = match && Math.min(...match.map(el => el.length));

  if (indent) {
    const regexp = new RegExp(`^ {${indent}}`, 'gm');
    return str.replace(regexp, '');
  }

  return str;
}

/**
 * Render a handlebars-like template with the given data.
 * For multiline templates, it removes leading and trailing newlines.
 * It also removes leading indentation from each line, so that the template can
 * be indented for readability.
 *
 * Example usage:
 *  const result = render(
 *    'Hello {{ name }}!',
 *    { name: 'World' }
 *  );
 *
 *  console.log(result); // Hello World!
 */
export const renderTemplate = (
  template: string,
  data: Record<string, string>,
): string => {
  return unIndent(trimEmptyLines(template)).replace(
    /{{\s*(.*?)\s*}}/g,
    (match, variable) => data[variable.trim()] ?? match,
  );
};
