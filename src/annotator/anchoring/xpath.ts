/**
 * Get the node name for use in generating an xpath expression.
 */
function getNodeName(node: Node): string {
  const nodeName = node.nodeName.toLowerCase();
  return nodeName === '#text' ? 'text()' : nodeName;
}

/**
 * Get the index of the node as it appears in its parent's child list
 */
function getNodePosition(node: Node): number {
  let pos = 0;
  let tmp: Node | null = node;
  while (tmp) {
    if (tmp.nodeName === node.nodeName) {
      pos += 1;
    }
    tmp = tmp.previousSibling;
  }
  return pos;
}

function getPathSegment(node: Node): string {
  const name = getNodeName(node);
  const pos = getNodePosition(node);
  return `${name}[${pos}]`;
}

/**
 * A simple XPath generator which can generate XPaths of the form
 * /tag[index]/tag[index].
 *
 * @param node - The node to generate a path to
 * @param root - Root node to which the returned path is relative
 */
export function xpathFromNode(node: Node, root: Node) {
  let xpath = '';

  let elem: Node | null = node;
  while (elem !== root) {
    if (!elem) {
      throw new Error('Node is not a descendant of root');
    }
    xpath = getPathSegment(elem) + '/' + xpath;
    elem = elem.parentNode;
  }
  xpath = '/' + xpath;
  xpath = xpath.replace(/\/$/, ''); // Remove trailing slash

  return xpath;
}

/**
 * Return the `index`'th immediate child of `element` whose tag name is
 * `nodeName` (case insensitive).
 */
function nthChildOfType(
  element: Element,
  nodeName: string,
  index: number
): Element | null {
  nodeName = nodeName.toUpperCase();

  let matchIndex = -1;
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i];
    if (child.nodeName.toUpperCase() === nodeName) {
      ++matchIndex;
      if (matchIndex === index) {
        return child;
      }
    }
  }

  return null;
}

/**
 * Evaluate a _simple XPath_ relative to a `root` element and return the
 * matching element.
 *
 * A _simple XPath_ is a sequence of one or more `/tagName[index]` strings.
 *
 * Unlike `document.evaluate` this function:
 *
 *  - Only supports simple XPaths
 *  - Is not affected by the document's _type_ (HTML or XML/XHTML)
 *  - Ignores element namespaces when matching element names in the XPath against
 *    elements in the DOM tree
 *  - Is case-insensitive for all elements, not just HTML elements
 *
 * The matching element is returned or `null` if no such element is found.
 * An error is thrown if `xpath` is not a simple XPath.
 */
function evaluateSimpleXPath(xpath: string, root: Element): Element | null {
  const isSimpleXPath =
    xpath.match(/^(\/[A-Za-z0-9-]+(\[[0-9]+\])?)+$/) !== null;
  if (!isSimpleXPath) {
    throw new Error('Expression is not a simple XPath');
  }

  const segments = xpath.split('/');
  let element = root;

  // Remove leading empty segment. The regex above validates that the XPath
  // has at least two segments, with the first being empty and the others non-empty.
  segments.shift();

  for (const segment of segments) {
    let elementName;
    let elementIndex;

    const separatorPos = segment.indexOf('[');
    if (separatorPos !== -1) {
      elementName = segment.slice(0, separatorPos);

      const indexStr = segment.slice(separatorPos + 1, segment.indexOf(']'));
      elementIndex = parseInt(indexStr) - 1;
      if (elementIndex < 0) {
        return null;
      }
    } else {
      elementName = segment;
      elementIndex = 0;
    }

    const child = nthChildOfType(element, elementName, elementIndex);
    if (!child) {
      return null;
    }

    element = child;
  }

  return element;
}

/**
 * Finds an element node using an XPath relative to `root`
 *
 * Example:
 *   node = nodeFromXPath('/main/article[1]/p[3]', document.body)
 */
export function nodeFromXPath(
  xpath: string,
  /* istanbul ignore next */
  root: Element = document.body
): Node | null {
  try {
    return evaluateSimpleXPath(xpath, root);
  } catch (err) {
    return document.evaluate(
      '.' + xpath,
      root,

      // nb. The `namespaceResolver` and `result` arguments are optional in the spec
      // but required in Edge Legacy.
      null /* namespaceResolver */,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null /* result */
    ).singleNodeValue;
  }
}
