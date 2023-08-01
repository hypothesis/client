/**
 * Load stylesheets for annotator UI components into the shadow DOM root.
 */
function loadStyles(shadowRoot: ShadowRoot) {
  // Find the preloaded stylesheet added by the boot script.
  const url = (
    document.querySelector(
      'link[rel="preload"][href*="/build/styles/annotator.css"]',
    ) as HTMLLinkElement | undefined
  )?.href;

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
 * @param container - Container element to render the UI into
 */
export function createShadowRoot(container: HTMLElement): ShadowRoot {
  const shadowRoot = container.attachShadow({ mode: 'open' });
  loadStyles(shadowRoot);

  // @ts-ignore The window doesn't know about the polyfill
  // applyFocusVisiblePolyfill comes from the `focus-visible` package.
  const applyFocusVisible = window.applyFocusVisiblePolyfill;
  if (applyFocusVisible) {
    applyFocusVisible(shadowRoot);
  }

  stopEventPropagation(shadowRoot);
  return shadowRoot;
}

/**
 * Stop bubbling up of several events.
 *
 * This makes the host page a little bit less aware of the annotator activity.
 * It is still possible for the host page to manipulate the events on the capturing
 * face.
 *
 * Another benefit is that click and touchstart typically causes the sidebar to close.
 * By preventing the bubble up of these events, we don't have to individually stop
 * the propagation.
 */
function stopEventPropagation(element: HTMLElement | ShadowRoot) {
  element.addEventListener('mouseup', event => event.stopPropagation());
  element.addEventListener('mousedown', event => event.stopPropagation());
  element.addEventListener('touchstart', event => event.stopPropagation(), {
    passive: true,
  });
}
