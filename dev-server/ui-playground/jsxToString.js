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

export default function jsxToString(vnode) {
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return vnode.toString();
  } else if (vnode?.type) {
    const name = componentName(vnode.type);

    // TODO - Add in the `key` prop which is extracted off the props into `vnode.key`.
    let propStr = Object.entries(vnode.props)
      .map(([name, value]) => {
        if (name === 'children') {
          return '';
        }
        // nb. We assume that `value` is something that can easily be stringified
        // using `String(value)`.
        return `${name}="${escapeQuotes(String(value))}"`;
      })
      .join(' ')
      .trim();
    if (propStr.length > 0) {
      propStr = ' ' + propStr;
    }

    const children = vnode.props.children;
    if (children) {
      // TODO - Be smart about splitting children over multiple lines if
      // there are enough of them or the string is too long.
      const childrenStr = Array.isArray(children)
        ? children.map(jsxToString).join('')
        : jsxToString(children);
      return `<${name}${propStr}>${childrenStr}</${name}>`;
    } else {
      // No children - use a self-closing tag.
      return `<${name}${propStr}/>`;
    }
  } else {
    return '';
  }
}
