import { delay } from '@hypothesis/frontend-testing';

import { FeatureFlags } from '../../features';
import { HTMLIntegration, $imports } from '../html';

class FakeTextRange {
  static trimmedRange(range) {
    return range;
  }
}

describe('HTMLIntegration', () => {
  let features;
  let fakeHTMLAnchoring;
  let fakeHTMLMetadata;
  let fakeGuessMainContentArea;
  let fakePreserveScrollPosition;
  let fakeScrollElementIntoView;
  let notifyNavigation;

  beforeEach(() => {
    features = new FeatureFlags();

    fakeHTMLAnchoring = {
      anchor: sinon.stub(),
      describe: sinon.stub(),
    };

    fakeHTMLMetadata = {
      getDocumentMetadata: sinon.stub().returns({ title: 'Example site' }),
      uri: sinon.stub().returns('https://example.com/'),
    };

    class FakeNavigationObserver {
      constructor(callback) {
        notifyNavigation = callback;
        this.disconnect = sinon.stub();
      }
    }

    fakeScrollElementIntoView = sinon.stub().resolves();

    fakeGuessMainContentArea = sinon.stub().returns(null);
    fakePreserveScrollPosition = sinon.stub().yields();

    const HTMLMetadata = sinon.stub().returns(fakeHTMLMetadata);
    $imports.$mock({
      '../anchoring/html': fakeHTMLAnchoring,
      '../anchoring/text-range': { TextRange: FakeTextRange },
      '../util/navigation-observer': {
        NavigationObserver: FakeNavigationObserver,
      },
      '../util/scroll': {
        scrollElementIntoView: fakeScrollElementIntoView,
      },
      './html-metadata': { HTMLMetadata },
      './html-side-by-side': {
        guessMainContentArea: fakeGuessMainContentArea,
        preserveScrollPosition: fakePreserveScrollPosition,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createIntegration(sideBySideOptions) {
    return new HTMLIntegration({ features, sideBySideOptions });
  }

  function getMargins() {
    const bodyStyle = document.body.style;
    const leftMargin = bodyStyle.marginLeft
      ? parseInt(bodyStyle.marginLeft)
      : null;
    const rightMargin = bodyStyle.marginRight
      ? parseInt(bodyStyle.marginRight)
      : null;
    return [leftMargin, rightMargin];
  }

  // Fixed amount of padding used in side-by-side mode. See
  // `HTMLIntegration._activateSideBySide`.
  const sideBySidePadding = 12;

  // Value used for width of sidebar in various tests.
  const sidebarWidth = 200;

  // Generate a dummy response for `guessMainContentArea`. This response
  // is what would be returned when the content fills the full width of the
  // viewport, minus space for an open sidebar and some padding.
  //
  // The sidebar space is included because `fitSideBySide` adjusts the margins
  // on the body before calling `guessMainContentArea`.
  function fullWidthContentRect() {
    return new DOMRect(
      0,
      0,
      window.innerWidth - sidebarWidth - sideBySidePadding,
      window.innerHeight,
    );
  }

  it('implements `anchor` using HTML anchoring', async () => {
    const integration = createIntegration();
    const root = {};
    const selectors = [];

    await integration.anchor(root, selectors);
    assert.calledWith(fakeHTMLAnchoring.anchor, root, selectors);
  });

  describe('#describe', () => {
    it('describes DOM ranges', () => {
      const integration = createIntegration();
      const root = {};

      const range = document.createRange();
      integration.describe(root, range);
      assert.calledWith(fakeHTMLAnchoring.describe, root, range);
    });

    it('throws if passed a shape', () => {
      const integration = createIntegration();
      const root = {};

      const shape = { type: 'point', x: 0, y: 0 };
      assert.throws(() => {
        integration.describe(root, shape);
      }, 'Unsupported region type');
      assert.notCalled(fakeHTMLAnchoring.describe);
    });
  });

  describe('#getAnnotatableRange', () => {
    let fakeTrimmedRange;

    beforeEach(() => {
      fakeTrimmedRange = sinon.stub(FakeTextRange, 'trimmedRange');
    });

    afterEach(() => {
      FakeTextRange.trimmedRange.restore();
    });

    it('returns a trimmed range if range-trimming is successful', () => {
      const integration = createIntegration();
      const range = new Range();
      fakeTrimmedRange.returns(range);
      assert.equal(integration.getAnnotatableRange(range), range);
    });

    it('returns null if range-trimming encounters a RangeError', () => {
      fakeTrimmedRange.throws(
        new RangeError('Range contains no non-whitespace text'),
      );
      const integration = createIntegration();
      const range = new Range();
      assert.isNull(integration.getAnnotatableRange(range));
    });

    it('throws if range-trimming encounters non-RangeError errors', () => {
      fakeTrimmedRange.throws(new Error('non-handled Error'));
      const integration = createIntegration();
      const range = new Range();
      assert.throws(() => integration.getAnnotatableRange(range));
    });
  });

  describe('#contentContainer', () => {
    it('returns body by default', () => {
      const integration = createIntegration();
      assert.equal(integration.contentContainer(), document.body);
    });
  });

  describe('#destroy', () => {
    it('undoes side-by-side mode changes', () => {
      const padding = sideBySidePadding;

      fakeGuessMainContentArea.returns(fullWidthContentRect());

      const integration = createIntegration();
      integration.fitSideBySide({ expanded: true, width: sidebarWidth });
      assert.isTrue(integration.sideBySideActive());
      assert.deepEqual(getMargins(), [padding, sidebarWidth + padding]);

      integration.destroy();

      assert.deepEqual(getMargins(), [null, null]);
    });

    it('cleans up feature flag listeners', () => {
      sinon.spy(features, 'on');
      sinon.spy(features, 'off');

      const integration = createIntegration();
      assert.called(features.on);

      const listeners = features.on.args;
      integration.destroy();

      for (const [event, callback] of listeners) {
        assert.calledWith(features.off, event, callback);
      }
    });
  });

  describe('#fitSideBySide', () => {
    beforeEach(() => {
      // By default, pretend that the content fills the page.
      fakeGuessMainContentArea.returns(fullWidthContentRect());
    });

    afterEach(() => {
      // Reset any styles applied by `fitSideBySide`.
      document.body.style.marginLeft = '';
      document.body.style.marginRight = '';
    });

    it('sets left and right margins on body element when activated', () => {
      const integration = createIntegration();

      integration.fitSideBySide({ expanded: true, width: sidebarWidth });

      assert.isTrue(integration.sideBySideActive());
      assert.deepEqual(getMargins(), [
        sideBySidePadding,
        sidebarWidth + sideBySidePadding,
      ]);
    });

    it('does not set left and right margins if there is not enough room to enable', () => {
      const integration = createIntegration();

      // Minimum content width for side-by-side to activate.
      const minSideBySideWidth = 480;

      // Create a sidebar width which leaves less than `minSideBySideWidth` px
      // available for the content.
      const sidebarWidth = window.innerWidth - minSideBySideWidth + 1;
      assert.isAbove(sidebarWidth, 1);
      integration.fitSideBySide({ expanded: true, width: sidebarWidth });

      assert.isFalse(integration.sideBySideActive());
      assert.deepEqual(getMargins(), [null, null]);
    });

    it('allows sidebar to overlap non-main content on the side of the page', () => {
      const integration = createIntegration();

      const contentRect = fullWidthContentRect();

      // Pretend there is some content to the right of the main content
      // in the document (eg. related stories, ads).
      contentRect.width -= 100;
      fakeGuessMainContentArea.returns(contentRect);

      integration.fitSideBySide({ expanded: true, width: sidebarWidth });

      assert.deepEqual(getMargins(), [
        sideBySidePadding,
        sidebarWidth + sideBySidePadding - 100,
      ]);
    });

    it('does nothing if the content area cannot be determined', () => {
      const integration = createIntegration();
      fakeGuessMainContentArea.returns(null);

      integration.fitSideBySide({ expanded: true, width: sidebarWidth });

      assert.deepEqual(getMargins(), [null, null]);
    });

    it('saves and restores the scroll position after adjusting margins', () => {
      const integration = createIntegration();

      integration.fitSideBySide({ expanded: true, width: sidebarWidth });

      assert.calledOnce(fakePreserveScrollPosition);
    });

    it('removes margins on body element when side-by-side mode is deactivated', () => {
      const integration = createIntegration();

      integration.fitSideBySide({ expanded: true, width: sidebarWidth });
      assert.notDeepEqual(getMargins(), [null, null]);

      integration.fitSideBySide({ expanded: false });
      assert.deepEqual(getMargins(), [null, null]);
    });

    context('main content area has margin:auto', () => {
      const bodyWidth = 400;
      const autoMargin = Math.floor((window.innerWidth - bodyWidth) / 2);

      function getComputedMargins(element) {
        const leftMargin = Math.floor(
          parseInt(window.getComputedStyle(element).marginLeft, 10),
        );
        const rightMargin = Math.floor(
          parseInt(window.getComputedStyle(element).marginRight, 10),
        );
        return [leftMargin, rightMargin];
      }

      // Add a style node to set a max-width and auto margins on the body
      function appendBodyStyles(document_) {
        const el = document_.createElement('style');
        el.type = 'text/css';
        el.textContent = `body { margin: 0 auto; max-width: ${bodyWidth}px }`;
        el.classList.add('js-style-test');
        document_.body.appendChild(el);
      }

      beforeAll(() => {
        appendBodyStyles(document);
      });

      afterAll(() => {
        // Remove test styles
        const elements = document.querySelectorAll('.js-style-test');
        for (let i = 0; i < elements.length; i++) {
          elements[i].remove();
        }
      });

      beforeEach(() => {
        // In these tests, we're treating the body element as the
        // main content area.
        //
        // `guessMainContent` area is called _after_ a right margin is set
        // on the body, so we'll return here the updated computed left and
        // right position of the body to emulate a real-life result
        fakeGuessMainContentArea.callsFake(bodyEl => {
          const margins = getComputedMargins(bodyEl);
          return { left: margins[0], right: window.innerWidth - margins[1] };
        });
      });

      it('should not move the main content to the right', () => {
        const integration = createIntegration();
        // Before enabling side-by-side, the horizontal margins on the body
        // are derived based on `margin: auto` in the stylesheet
        assert.deepEqual(getComputedMargins(document.body), [
          autoMargin,
          autoMargin,
        ]);

        // Will result in a right margin of 112px (100 + 12 padding)
        integration.fitSideBySide({ expanded: true, width: 100 });

        // Without intervention, the left margin would have _increased_ to
        // balance out the remaining space, that is:
        // innerWidth - bodyWidth - 112 > 200
        //
        // To prevent content jumping to the right, implementation sets left
        // margin to original auto margin
        assert.deepEqual(getComputedMargins(document.body), [autoMargin, 112]);
      });

      it('may move the main content to the left to make room for sidebar', () => {
        const integration = createIntegration();
        const [leftMargin, rightMargin] = getComputedMargins(document.body);

        // Choose a sidebar width that doesn't require moving the main content.
        assert.isAbove(rightMargin, 100);
        integration.fitSideBySide({ expanded: true, width: 100 });
        let [newLeftMargin] = getComputedMargins(document.body);
        assert.equal(newLeftMargin, leftMargin);

        // Choose a sidebar width that does require moving the main content.
        integration.fitSideBySide({ expanded: true, width: rightMargin });

        [newLeftMargin] = getComputedMargins(document.body);
        assert.isBelow(newLeftMargin, leftMargin);
      });
    });

    it('sets an html class on the element if side by side is activated', () => {
      const integration = createIntegration();

      integration.fitSideBySide({ expanded: true, width: 100 });

      assert.isTrue(
        integration.container.classList.contains(
          'hypothesis-sidebyside-active',
        ),
      );

      integration.fitSideBySide({ expanded: false, width: 100 });

      assert.isFalse(
        integration.container.classList.contains(
          'hypothesis-sidebyside-active',
        ),
      );
    });

    const isSideBySideActive = () => {
      const [left, right] = getMargins();
      return left !== null || right !== null;
    };

    it('side-by-side does not activate in "manual" mode', () => {
      const integration = createIntegration({ mode: 'manual' });
      integration.fitSideBySide({ expanded: true, width: sidebarWidth });
      assert.isFalse(isSideBySideActive());
    });
  });

  describe('#getMetadata', () => {
    it('returns document metadata', async () => {
      const integration = createIntegration();
      assert.deepEqual(await integration.getMetadata(), {
        title: 'Example site',
      });
    });
  });

  describe('#scrollToAnchor', () => {
    let highlight;

    beforeEach(() => {
      highlight = document.createElement('div');
      document.body.appendChild(highlight);
    });

    afterEach(() => {
      highlight.remove();
    });

    it('scrolls to first highlight of anchor', async () => {
      const anchor = { highlights: [highlight] };

      const integration = createIntegration();
      await integration.scrollToAnchor(anchor);

      assert.calledOnce(fakeScrollElementIntoView);
      assert.calledWith(fakeScrollElementIntoView, highlight);
    });

    it('does nothing if anchor has no highlights', async () => {
      const anchor = {};

      const integration = createIntegration();
      await integration.scrollToAnchor(anchor);

      assert.notCalled(fakeScrollElementIntoView);
    });
  });

  describe('#uri', () => {
    it('returns main document URL', async () => {
      const integration = createIntegration();
      assert.deepEqual(await integration.uri(), 'https://example.com/');
    });
  });

  it('emits "uriChanged" event when URL changes after a navigation', () => {
    const integration = createIntegration();
    const onURIChanged = sinon.stub();
    integration.on('uriChanged', onURIChanged);

    fakeHTMLMetadata.uri.returns('https://example.com/new-url');
    notifyNavigation();

    assert.calledWith(onURIChanged, 'https://example.com/new-url');
  });

  it('emits "uriChanged" event when URL changes after a <head> change', async () => {
    const linkEl = document.createElement('link');
    linkEl.rel = 'dummy';
    linkEl.href = 'https://example.com/dummy';

    const integration = createIntegration();
    const onURIChanged = sinon.stub();
    integration.on('uriChanged', onURIChanged);

    try {
      document.head.append(linkEl);
      fakeHTMLMetadata.uri.returns('https://example.com/new-url');

      await delay(0); // Wait for MutationObserver

      assert.calledWith(onURIChanged, 'https://example.com/new-url');
    } finally {
      linkEl.remove();
    }
  });

  it('does not emit "uriChanged" if URL has not changed after a navigation', () => {
    const integration = createIntegration();
    const onURIChanged = sinon.stub();
    integration.on('uriChanged', onURIChanged);

    // Report a navigation, but do not change the URL returned by `fakeHTMLMetadata.uri`.
    //
    // This can happen if the page has a `<link rel=canonical>` that gets used
    // as the document URI instead of the URL in the URL bar.
    notifyNavigation();

    assert.notCalled(onURIChanged);
  });

  it('does not emit "uriChanged" if URL has not changed after a <head> change', async () => {
    const linkEl = document.createElement('link');
    linkEl.rel = 'dummy';
    linkEl.href = 'https://example.com/dummy';

    const integration = createIntegration();
    const onURIChanged = sinon.stub();
    integration.on('uriChanged', onURIChanged);

    try {
      document.head.append(linkEl);

      await delay(0); // Wait for MutationObserver

      assert.notCalled(onURIChanged);
    } finally {
      linkEl.remove();
    }
  });
});
