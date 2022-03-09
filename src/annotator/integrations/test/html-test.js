import { HTMLIntegration, $imports } from '../html';

describe('HTMLIntegration', () => {
  let fakeHTMLAnchoring;
  let fakeHTMLMetadata;
  let fakeGuessMainContentArea;
  let fakePreserveScrollPosition;
  let fakeScrollElementIntoView;

  beforeEach(() => {
    fakeHTMLAnchoring = {
      anchor: sinon.stub(),
      describe: sinon.stub(),
    };

    fakeHTMLMetadata = {
      getDocumentMetadata: sinon.stub().returns({ title: 'Example site' }),
      uri: sinon.stub().returns('https://example.com/'),
    };

    fakeScrollElementIntoView = sinon.stub().resolves();

    fakeGuessMainContentArea = sinon.stub().returns(null);
    fakePreserveScrollPosition = sinon.stub().yields();

    const HTMLMetadata = sinon.stub().returns(fakeHTMLMetadata);
    $imports.$mock({
      '../anchoring/html': fakeHTMLAnchoring,
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

  it('implements `anchor` and `destroy` using HTML anchoring', () => {
    const integration = new HTMLIntegration();
    assert.equal(integration.anchor, fakeHTMLAnchoring.anchor);
    assert.equal(integration.describe, fakeHTMLAnchoring.describe);
  });

  describe('#canAnnotate', () => {
    it('is always true', () => {
      const integration = new HTMLIntegration();
      const range = new Range();
      assert.isTrue(integration.canAnnotate(range));
    });
  });

  describe('#contentContainer', () => {
    it('returns body by default', () => {
      const integration = new HTMLIntegration();
      assert.equal(integration.contentContainer(), document.body);
    });
  });

  describe('#destroy', () => {
    it('does nothing', () => {
      new HTMLIntegration().destroy();
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

    function createIntegration() {
      const integration = new HTMLIntegration();
      integration.sideBySideEnabled = true;
      return integration;
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
      new HTMLIntegration().fitSideBySide({});
    });

    context('when enabled', () => {
      it('sets left and right margins on body element when activated', () => {
        const integration = createIntegration();

        integration.fitSideBySide({ expanded: true, width: sidebarWidth });

        assert.deepEqual(getMargins(), [padding, sidebarWidth + padding]);
      });

      it('does not set left and right margins if there is not enough room to enable', () => {
        const integration = createIntegration();

        // Minimum available content width for side-by-side is 480
        // window.innerWidth (800) - 321 = 479 --> too small
        integration.fitSideBySide({ expanded: true, width: 321 });

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
    });
  });

  describe('#getMetadata', () => {
    it('returns document metadata', async () => {
      const integration = new HTMLIntegration();
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

      const integration = new HTMLIntegration();
      await integration.scrollToAnchor(anchor);

      assert.calledOnce(fakeScrollElementIntoView);
      assert.calledWith(fakeScrollElementIntoView, highlight);
    });

    it('does nothing if anchor has no highlights', async () => {
      const anchor = {};

      const integration = new HTMLIntegration();
      await integration.scrollToAnchor(anchor);

      assert.notCalled(fakeScrollElementIntoView);
    });
  });

  describe('#uri', () => {
    it('returns main document URL', async () => {
      const integration = new HTMLIntegration();
      assert.deepEqual(await integration.uri(), 'https://example.com/');
    });
  });
});
