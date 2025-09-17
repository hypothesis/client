/**
 * Stylesheet injected into the main document in order to declare CSS custom
 * properties which are used within shadow DOM.
 *
 * This is needed to work around https://github.com/tailwindlabs/tailwindcss/issues/15005.
 *
 * See also https://developer.chrome.com/docs/css-ui/css-names#property
 * and https://github.com/w3c/csswg-drafts/issues/10541.
 */
let propertyStyleSheet: CSSStyleSheet | undefined;

// For use in tests.
export function getPropertyStyleSheet() {
  return propertyStyleSheet;
}

// For use in tests.
export function resetPropertyStyleSheet() {
  propertyStyleSheet = undefined;
}

/**
 * Load stylesheets for annotator UI components into the shadow DOM root.
 */
function loadStyles(shadowRoot: ShadowRoot): Promise<void> {
  // Find the preloaded stylesheet added by the boot script.
  const url = (
    document.querySelector(
      'link[rel="preload"][href*="/build/styles/annotator.css"]',
    ) as HTMLLinkElement | undefined
  )?.href;

  if (!url) {
    return Promise.resolve();
  }

  const linkEl = document.createElement('link');
  linkEl.rel = 'stylesheet';
  linkEl.href = url;

  // Enable JS to read the response. Needed for the @property workaround below.
  linkEl.crossOrigin = 'anonymous';

  // Prevent the frontend part of pywb (wombat) in viahtml from removing the
  // `crossorigin` attribute.
  //
  // See https://github.com/webrecorder/wombat/blob/7433dede629b1c919c4c9c1e2c2daf1ac6665973/src/wombat.js#L2422
  linkEl.removeAttribute = () => {};

  shadowRoot.appendChild(linkEl);

  // When styles are loaded for the first time, wait for the stylesheet to load,
  // then extract `@property` declarations and append them to a stylesheet in
  // the top-level document.
  if (propertyStyleSheet === undefined) {
    propertyStyleSheet = new CSSStyleSheet();
    const sheet = propertyStyleSheet;

    linkEl.addEventListener(
      'load',
      () => {
        /* istanbul ignore next */
        if (!linkEl.sheet) {
          return;
        }
        for (const rule of linkEl.sheet.rules) {
          if (rule instanceof CSSPropertyRule) {
            sheet.insertRule(rule.cssText);
          }
        }
        document.adoptedStyleSheets.push(sheet);
      },
      { once: true },
    );
  }

  return new Promise(resolve => {
    linkEl.addEventListener('load', () => resolve());
  });
}

export type ShadowRootContainer = {
  shadowRoot: ShadowRoot;

  /** Promise that resolves when styles have completed loading. */
  stylesLoaded: Promise<void>;
};

/**
 * Create the shadow root for an annotator UI component and load the annotator
 * CSS styles into it.
 *
 * @param container - Container element to render the UI into
 */
export function createShadowRoot(container: HTMLElement): ShadowRootContainer {
  const shadowRoot = container.attachShadow({ mode: 'open' });
  const stylesLoaded = loadStyles(shadowRoot);
  return { shadowRoot, stylesLoaded };
}
