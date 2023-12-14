function trimLeadingEmptyLines(str: string): string {
  return str.replace(/^\s*\n/g, '');
}

function trimTrailingEmptyLines(str: string): string {
  return str.replace(/\n\s*$/g, '');
}

/**
 * Remove specified indentation from each line of a string.
 */
function dedentStr(str: string, indent: number) {
  const indentRegexp = new RegExp(`^ {${indent}}`, 'gm');
  return str.replace(indentRegexp, '');
}

/**
 * Remove common indentation from each line of every string, then interpolate
 * params verbatim.
 */
function dedent(strings: string[], ...params: any[]) {
  // Match the smallest indentation among all lines of the full string before
  // interpolating params
  const match = strings.join('').match(/^[ \t]*(?=\S)/gm);
  const smallestIndent = match ? Math.min(...match.map(el => el.length)) : 0;

  // Dedent every individual string while interpolating params
  // Those strings which are not the beginning of a line will have zero-indent
  // and dedenting will have no effect
  let result = '';
  for (const [i, param] of params.entries()) {
    result += dedentStr(strings[i], smallestIndent);
    result += param;
  }

  return result + dedentStr(strings[strings.length - 1], smallestIndent);
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
 *   ${var}
 *   Fourth line`);
 *     }
 *   }
 *
 * to this:
 *   function foo(arg) {
 *     if (arg === 3) {
 *       console.log(trimAndDedent`
 *         First line
 *         Second line
 *         ${var}
 *         Fourth line
 *       `);
 *     }
 *   }
 */
export function trimAndDedent(
  strings: TemplateStringsArray,
  ...params: any[]
): string {
  if (strings.length < 2) {
    // Trim leading and trailing empty lines from first (and only) string
    const trimmedLines = [
      trimLeadingEmptyLines(trimTrailingEmptyLines(strings[0])),
    ];
    return dedent(trimmedLines, ...params);
  }

  const firstString = strings[0];
  const lastString = strings[strings.length - 1];
  const middle = strings.slice(1, strings.length - 1);

  // Trim empty leading lines from first string, and empty trailing lines from last one
  const trimmedLines = [
    trimLeadingEmptyLines(firstString),
    ...middle,
    trimTrailingEmptyLines(lastString),
  ];

  return dedent(trimmedLines, ...params);
}
