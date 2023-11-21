/**
 * Remove leading and trailing empty lines from a string.
 */
function trimEmptyLines(str: string): string {
  return str.replace(/^\s*\n|\n\s*$/g, '');
}

/**
 * Remove common indentation from each line of a string.
 */
function dedent(str: string) {
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
 * Remove leading and trailing empty lines from a string, then remove common
 * indentation from each line.
 *
 * This is useful to improve readability for multi-line template literals,
 * where you don't want to
 *  1) start the first line right after the first backtick.
 *  2) indent the string inconsistently with the rest of the code.
 *
 * This function allows to move from this:
 *   function foo(arg) {
 *     if (arg === 3) {
 *       console.log(`First line
 *   Second line
 *   Third line`);
 *     }
 *   }
 *
 * to this:
 *   function foo(arg) {
 *     if (arg === 3) {
 *       console.log(trimAndDedent(`
 *         First line
 *         Second line
 *         Third line
 *       `));
 *     }
 *   }
 */
export function trimAndDedent(str: string): string {
  return dedent(trimEmptyLines(str));
}
