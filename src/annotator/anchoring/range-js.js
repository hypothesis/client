import { findChild, simpleXPathJQuery, simpleXPathPure } from './xpath-util';

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
 * Finds an element node using an xpath relative to the document root.
 */
export function nodeFromXPath(xpath, root) {
  const steps = xpath.substring(1).split('/');
  let node = root;
  steps.forEach(step => {
    let [name, idx] = step.split('[');
    idx = idx ? parseInt(idx.split(']')[0]) : 1;
    node = findChild(node, name.toLowerCase(), idx);
  });
  return node;
}
