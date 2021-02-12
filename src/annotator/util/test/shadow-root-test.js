import { createShadowRoot } from '../shadow-root';

describe('annotator/util/shadow-root', () => {
  let applyFocusVisiblePolyfill;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    applyFocusVisiblePolyfill = window.applyFocusVisiblePolyfill;
    window.applyFocusVisiblePolyfill = sinon.stub();
  });

  afterEach(() => {
    container.remove();
    window.applyFocusVisiblePolyfill = applyFocusVisiblePolyfill;
  });
  describe('createShadowRoot', () => {
    it('attaches a shadow root to the container', () => {
      const shadowRoot = createShadowRoot(container);

      assert.ok(shadowRoot);
      assert.equal(container.shadowRoot, shadowRoot);
    });

    it('does not attach a shadow root if Shadow DOM is unavailable', () => {
      container.attachShadow = null;
      const shadowRoot = createShadowRoot(container);

      assert.equal(shadowRoot, container);
    });

    it('injects stylesheets into the shadow root', () => {
      createShadowRoot(container);

      const linkEl = container.shadowRoot.querySelector('link[rel=stylesheet]');
      assert.ok(linkEl);
      assert.include(linkEl.href, 'annotator.css');
    });

    it('applies the applyFocusVisiblePolyfill if exists', () => {
      const shadowRoot = createShadowRoot(container);

      assert.calledWith(window.applyFocusVisiblePolyfill, shadowRoot);
    });

    it('does not inject stylesheets into the shadow root if style is not found', () => {
      const link = document.querySelector(
        'link[rel="stylesheet"][href*="/build/styles/annotator.css"]'
      );
      // Removing the `rel` attribute is enough for the URL to not be found
      link.removeAttribute('rel');

      createShadowRoot(container);

      const linkEl = container.shadowRoot.querySelector('link[rel=stylesheet]');
      assert.isNull(linkEl);
      link.setAttribute('rel', 'stylesheet');
    });
  });
});
