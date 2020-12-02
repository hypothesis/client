/**
 * Load stylesheets for annotator UI components into the shadow DOM root.
 */
function loadStyles(shadowRoot) {
  const url = /** @type {HTMLLinkElement|undefined} */ (document.querySelector(
    'link[rel="stylesheet"][href*="/build/styles/annotator.css"]'
  ))?.href;

  if (!url) {
    return;
  }

  // Stylesheet <link> elements are inert inside shadow roots [1]. Until
  // Shadow DOM implementations support external stylesheets [2], grab the
  // relevant CSS files from the current page and `@import` them.
  //
  // [1] http://stackoverflow.com/questions/27746590
  // [2] https://github.com/w3c/webcomponents/issues/530
  //
  // This will unfortunately break if the page blocks inline stylesheets via
  // CSP, but that appears to be rare and if this happens, the user will still
  // get a usable adder, albeit one that uses browser default styles for the
  // toolbar.
  const styleEl = document.createElement('style');
  styleEl.textContent = `@import "${url}";`;
  shadowRoot.appendChild(styleEl);
}

/**
 * Create the shadow root for an annotator UI component and load the annotator
 * CSS styles into it.
 *
 * In browsers that support it, shadow DOM is used to isolate annotator UI
 * components from the host page's styles.
 *
 * @param {HTMLElement} container - Container element to render the UI into
 * @return {HTMLElement|ShadowRoot} -
 *   The element to render the UI into. This may be `container` or the shadow
 *   root.
 */
export function createShadowRoot(container) {
  if (!container.attachShadow) {
    return container;
  }

  const shadowRoot = container.attachShadow({ mode: 'open' });
  loadStyles(shadowRoot);
  return shadowRoot;
}
