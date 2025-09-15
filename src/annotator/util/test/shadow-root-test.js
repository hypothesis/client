import {
  createShadowRoot,
  getPropertyStyleSheet,
  resetPropertyStyleSheet,
} from '../shadow-root';

describe('annotator/util/shadow-root', () => {
  let container;
  let preloadedStylesheet;

  beforeEach(() => {
    // Create the stylesheet preload that would normally be added by the boot script.
    preloadedStylesheet = document.createElement('link');
    preloadedStylesheet.rel = 'preload';
    preloadedStylesheet.as = 'style';
    preloadedStylesheet.href = '/build/styles/annotator.css';
    document.head.append(preloadedStylesheet);

    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    resetPropertyStyleSheet();
    preloadedStylesheet.remove();
    container.remove();
  });

  describe('createShadowRoot', () => {
    it('attaches a shadow root to the container', () => {
      const shadowRoot = createShadowRoot(container);

      assert.ok(shadowRoot);
      assert.equal(container.shadowRoot, shadowRoot);
    });

    it('injects stylesheets into the shadow root', () => {
      createShadowRoot(container);

      const linkEl = container.shadowRoot.querySelector('link[rel=stylesheet]');
      assert.ok(linkEl);
      assert.include(linkEl.href, 'annotator.css');
    });

    it('does not inject stylesheets into the shadow root if style is not found', () => {
      const link = document.querySelector(
        'link[rel="preload"][href*="/build/styles/annotator.css"]',
      );
      // Removing the `rel` attribute is enough for the URL to not be found
      link.removeAttribute('rel');

      createShadowRoot(container);

      const linkEl = container.shadowRoot.querySelector('link[rel=stylesheet]');
      assert.isNull(linkEl);
      link.setAttribute('rel', 'stylesheet');
    });

    it('registers CSS @property declarations in a new stylesheet in the main document', async () => {
      const root = createShadowRoot(container);
      const propertySheet = getPropertyStyleSheet();

      // Simulate annotator.css styles loading.
      const fakeSheet = new CSSStyleSheet();
      fakeSheet.replaceSync(`
@property --hyp-test {
  syntax: "*";
  inherits: false;
}

@property --hyp-test-2 {
  syntax: "*";
  inherits: false;
}
  `);
      const link = root.querySelector('link');
      sinon.stub(link, 'sheet').get(() => fakeSheet);

      link.dispatchEvent(new Event('load'));

      // Check that @property rules were copied to style sheet in light DOM.
      assert.instanceOf(propertySheet, CSSStyleSheet);
      assert.include(document.adoptedStyleSheets, propertySheet);
      const propRules = [...propertySheet.rules].filter(
        rule => rule instanceof CSSPropertyRule,
      );
      assert.equal(propRules.length, 2);
    });
  });
});
