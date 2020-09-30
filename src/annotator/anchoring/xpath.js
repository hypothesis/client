import { simpleXPathJQuery, simpleXPathPure } from './xpath-util';

/**
 * Wrapper for simpleXPath. Attempts to call the jquery
 * version, and if that excepts, then falls back to pure js
 * version.
 */
export function xpathFromNode(el, relativeRoot) {
  let result;
  try {
    result = simpleXPathJQuery(el, relativeRoot);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(
      'jQuery-based XPath construction failed! Falling back to manual.'
    );
    result = simpleXPathPure(el, relativeRoot);
  }
  return result;
}

/**
 * Finds an element node using an XPath relative to `root`
 *
 * Example:
 *   node = nodeFromXPath('/html/body/div/p[2]')
 *
 * @param {string} xpath
 * @param {Node} root
 */
export function nodeFromXPath(xpath, root = document) {
  return document.evaluate(
    '.' + xpath,
    root,
    null /* nsResolver */,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null /* result */
  ).singleNodeValue;
}
