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

  const linkEl = document.createElement('link');
  linkEl.rel = 'stylesheet';
  linkEl.href = url;
  shadowRoot.appendChild(linkEl);
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

  // @ts-ignore The window doesn't know about the polyfill
  // applyFocusVisiblePolyfill comes from the `focus-visible` package.
  const applyFocusVisible = window.applyFocusVisiblePolyfill;
  if (applyFocusVisible) {
    applyFocusVisible(shadowRoot);
  }

  return shadowRoot;
}
