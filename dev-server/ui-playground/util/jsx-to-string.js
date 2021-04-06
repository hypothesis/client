/**
 * Escape `str` for use in a "-quoted string.
 *
 * @param {string} str
 */
function escapeQuotes(str) {
  return str.replace(/"/g, '\\"');
}

function componentName(type) {
  if (typeof type === 'string') {
    return type;
  } else {
    return type.displayName || type.name;
  }
}

/**
 * Indent a multi-line string by `indent` spaces.
 *
 * @param {string} str
 * @param {number} indent
 */
function indentLines(str, indent) {
  const indentStr = ' '.repeat(indent);
  const lines = str.split('\n');
  return lines.map(line => indentStr + line).join('\n');
}

/**
 * Render a JSX expression as a code string.
 *
 * Currently this only supports serializing props with simple types (strings,
 * booleans, numbers).
 *
 * @example
 *   jsxToString(<Widget expanded={true} label="Thing"/>) // returns `<Widget expanded label="Thing"/>`
 *
 * @param {import('preact').ComponentChildren} vnode
 * @return {string}
 */
export function jsxToString(vnode) {
  if (
    typeof vnode === 'string' ||
    typeof vnode === 'number' ||
    typeof vnode === 'bigint'
  ) {
    return vnode.toString();
  } else if (typeof vnode === 'boolean') {
    return '';
  } else if (vnode && 'type' in vnode) {
    const name = componentName(vnode.type);

    // nb. The special `key` and `ref` props are not included in `vnode.props`.
    // `ref` is not serializable to a string and `key` is generally set dynamically
    // (eg. from an index or item ID) so it doesn't make sense to include it either.
    let propStr = Object.entries(vnode.props)
      .map(([name, value]) => {
        if (name === 'children') {
          return '';
        }

        // Boolean props are assumed to default to `false`, in which case they
        // can be omitted.
        if (typeof value === 'boolean') {
          return value ? name : '';
        }

        const valueStr =
          typeof value === 'string' ? `"${escapeQuotes(value)}"` : `{${value}}`;
        return `${name}=${valueStr}`;
      })
      .join(' ')
      .trim();
    if (propStr.length > 0) {
      propStr = ' ' + propStr;
    }

    const children = vnode.props.children;
    if (children) {
      let childrenStr = Array.isArray(children)
        ? children.map(jsxToString).join('\n')
        : jsxToString(children);
      childrenStr = indentLines(childrenStr, 2);
      return `<${name}${propStr}>\n${childrenStr}\n</${name}>`;
    } else {
      // No children - use a self-closing tag.
      return `<${name}${propStr} />`;
    }
  } else {
    return '';
  }
}
