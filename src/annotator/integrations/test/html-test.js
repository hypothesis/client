import { delay } from '../../../test-util/wait';
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

  it('implements `anchor` and `destroy` using HTML anchoring', async () => {
    const integration = createIntegration();
    const root = {};
    const selectors = [];

    const range = await integration.anchor(root, selectors);
    assert.calledWith(fakeHTMLAnchoring.anchor, root, selectors);

    integration.describe(root, range);
    assert.calledWith(fakeHTMLAnchoring.describe, root, range);
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
        new RangeError('Range contains no non-whitespace text')
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
    it('cleans up feature flag listeners', () => {
      sinon.spy(features, 'on');
      sinon.spy(features, 'off');

      const integration = createIntegration();
      assert.called(features.on);

      const listeners = features.on.args;
      integration.destroy();

      for (let [event, callback] of listeners) {
        assert.calledWith(features.off, event, callback);
      }
    });
  });

  describe('#fitSideBySide', () => {
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

    const sidebarWidth = 200;
    const padding = 12;

    // Generate a dummy response for `guessMainContentArea`. This response
    // is what would be returned when the content fills the full width of the
    // viewport, mins space for an open sidebar and some padding.
    //
    // The sidebar space is included because `fitSideBySide` adjusts the margins
    // on the body before calling `guessMainContentArea`.
    function fullWidthContentRect() {
      return new DOMRect(
        0,
        0,
        window.innerWidth - sidebarWidth - padding,
        window.innerHeight
      );
    }

    beforeEach(() => {
      // By default, pretend that the content fills the page.
      fakeGuessMainContentArea.returns(fullWidthContentRect());
    });

    afterEach(() => {
      // Reset any styles applied by `fitSideBySide`.
      document.body.style.marginLeft = '';
      document.body.style.marginRight = '';
    });

    it('does nothing when disabled', () => {
      const integration = createIntegration();
      integration.fitSideBySide({});
      assert.isFalse(integration.sideBySideActive());
    });

    context('when enabled', () => {
      beforeEach(() => {
        features.update({ html_side_by_side: true });
      });

      it('sets left and right margins on body element when activated', () => {
        const integration = createIntegration();

        integration.fitSideBySide({ expanded: true, width: sidebarWidth });

        assert.isTrue(integration.sideBySideActive());
        assert.deepEqual(getMargins(), [padding, sidebarWidth + padding]);
      });

      it('does not set left and right margins if there is not enough room to enable', () => {
        const integration = createIntegration();

        // Minimum available content width for side-by-side is 480
        // window.innerWidth (800) - 321 = 479 --> too small
        integration.fitSideBySide({ expanded: true, width: 321 });

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

        assert.deepEqual(getMargins(), [padding, sidebarWidth + padding - 100]);
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
            parseInt(window.getComputedStyle(element).marginLeft, 10)
          );
          const rightMargin = Math.floor(
            parseInt(window.getComputedStyle(element).marginRight, 10)
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

        before(() => {
          appendBodyStyles(document);
        });

        after(() => {
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
          assert.deepEqual(getComputedMargins(document.body), [
            autoMargin,
            112,
          ]);
        });

        it('may move the main content to the left to make room for sidebar', () => {
          const integration = createIntegration();

          // Will result in right margin of 262 (250 + 12 padding)
          integration.fitSideBySide({ expanded: true, width: 250 });

          // The amount of space available to the left of the body is now _less_
          // than the original auto-left-margin. This is fine: let the auto
          // margin re-adjust to the available amount of space (move to the left):
          const updatedMargins = getComputedMargins(document.body);
          const expectedLeftMargin = Math.floor(
            window.innerWidth - bodyWidth - 262
          );
          assert.equal(updatedMargins[0], expectedLeftMargin);
          assert.isBelow(updatedMargins[0], autoMargin);
        });
      });

      it('sets an html class on the element if side by side is activated', () => {
        const integration = createIntegration();

        integration.fitSideBySide({ expanded: true, width: 100 });

        assert.isTrue(
          integration.container.classList.contains(
            'hypothesis-sidebyside-active'
          )
        );

        integration.fitSideBySide({ expanded: false, width: 100 });

        assert.isFalse(
          integration.container.classList.contains(
            'hypothesis-sidebyside-active'
          )
        );
      });
    });

    const isSideBySideActive = () => {
      const [left, right] = getMargins();
      return left !== null || right !== null;
    };

    it('side-by-side is enabled/disabled when feature flag changes', () => {
      const integration = createIntegration();

      integration.fitSideBySide({ expanded: true, width: sidebarWidth });
      assert.isFalse(isSideBySideActive());

      features.update({ html_side_by_side: true });
      assert.isTrue(isSideBySideActive());

      features.update({ html_side_by_side: false });
      assert.isFalse(isSideBySideActive());
    });

    it('manual side-by-side is not changed by enabled feature flag', () => {
      features.update({ html_side_by_side: true });
      const integration = createIntegration({ mode: 'manual' });

      integration.fitSideBySide({ expanded: true, width: sidebarWidth });
      assert.isFalse(isSideBySideActive());

      // Even if the feature flag is enabled, side-by-side stays disabled/manual
      features.update({ html_side_by_side: true });
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
