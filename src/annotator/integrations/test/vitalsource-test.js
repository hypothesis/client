import { delay, waitFor } from '../../../test-util/wait';
import {
  VitalSourceInjector,
  VitalSourceContentIntegration,
  vitalSourceFrameRole,
  $imports,
} from '../vitalsource';

class FakeVitalSourceViewer {
  constructor() {
    this.bookElement = document.createElement('mosaic-book');
    this.bookElement.attachShadow({ mode: 'open' });

    this.contentFrame = document.createElement('iframe');
    this.bookElement.shadowRoot.append(this.contentFrame);

    document.body.append(this.bookElement);

    this.contentFrame.contentDocument.body.innerHTML = '<p>Initial content</p>';
  }

  destroy() {
    this.bookElement.remove();
  }

  /**
   * Simulate navigation to a different chapter of the book.
   *
   * This process happens in two steps. This method simulates the first step.
   * `finishChapterLoad` simulates the second step.
   */
  beginChapterLoad() {
    this.contentFrame.remove();

    // VS handles navigations by removing the frame and creating a new one,
    // rather than navigating the existing frame.
    this.contentFrame = document.createElement('iframe');
    this.bookElement.shadowRoot.append(this.contentFrame);

    // When the new frame initially loads, it will contain some encoded/encrypted
    // data for the new chapter. VS will then make a form submission to get the
    // decoded HTML.
    //
    // The integration should not inject the client if the frame contains this
    // data content.
    this.contentFrame.contentDocument.body.innerHTML =
      '<div id="page-content">Encrypted content</div>';
  }

  finishChapterLoad(contentHTML = '<p>New content</p>') {
    this.contentFrame.contentDocument.body.innerHTML = contentHTML;
    this.contentFrame.dispatchEvent(new Event('load'));
  }
}

describe('annotator/integrations/vitalsource', () => {
  let fakeViewer;
  let FakeHTMLIntegration;
  let fakeHTMLIntegration;
  let fakeInjectClient;

  beforeEach(() => {
    fakeViewer = new FakeVitalSourceViewer();

    fakeHTMLIntegration = {
      anchor: sinon.stub(),
      contentContainer: sinon.stub(),
      describe: sinon.stub(),
      destroy: sinon.stub(),
      fitSideBySide: sinon.stub().returns(false),
      scrollToAnchor: sinon.stub(),
      sideBySideEnabled: false,
    };

    FakeHTMLIntegration = sinon.stub().returns(fakeHTMLIntegration);

    fakeInjectClient = sinon.stub();

    $imports.$mock({
      './html': { HTMLIntegration: FakeHTMLIntegration },
      '../hypothesis-injector': { injectClient: fakeInjectClient },
    });
  });

  afterEach(() => {
    fakeViewer.destroy();
    $imports.$restore();
  });

  describe('vitalSourceFrameRole', () => {
    it('returns "container" if book container element is found', () => {
      assert.equal(vitalSourceFrameRole(), 'container');
    });

    it('returns "content" if the book container element is found in the parent document', () => {
      assert.equal(
        vitalSourceFrameRole(fakeViewer.contentFrame.contentWindow),
        'content'
      );
    });

    it('returns `null` if the book container element is not found', () => {
      fakeViewer.destroy();
      assert.isNull(vitalSourceFrameRole());
    });
  });

  describe('VitalSourceInjector', () => {
    let fakeConfig;
    let injector;

    beforeEach(() => {
      fakeConfig = {
        clientUrl: 'https://hypothes.is',
      };
      injector = new VitalSourceInjector(fakeConfig);
    });

    afterEach(() => {
      injector.destroy();
    });

    it('throws if constructed outside the VitalSource book reader', () => {
      fakeViewer.destroy();
      assert.throws(() => {
        new VitalSourceInjector(fakeConfig);
      }, 'Book container element not found');
    });

    it('injects client into content frame', async () => {
      await waitFor(() => fakeInjectClient.called);
      assert.calledWith(fakeInjectClient, fakeViewer.contentFrame, fakeConfig);
    });

    [
      // Typical EPUB book chapter which contains text paragraphs.
      '<p>New content</p>',

      // "Great Book" EPUBs used in the freely available classic texts in VitalSource.
      // These don't use `<p>` elements :(
      '<div class="para">New content</div>',

      // Book chapters which don't contain text content.
      '<img src="cover-image.png">',
    ].forEach(newChapterContent => {
      it('re-injects client when content frame is changed', async () => {
        fakeInjectClient.resetHistory();

        fakeViewer.beginChapterLoad();
        await delay(0);
        assert.notCalled(fakeInjectClient);

        fakeViewer.finishChapterLoad(newChapterContent);
        await waitFor(() => fakeInjectClient.called);
        assert.calledWith(
          fakeInjectClient,
          fakeViewer.contentFrame,
          fakeConfig
        );
      });
    });

    it("doesn't re-inject if content frame is removed", async () => {
      await waitFor(() => fakeInjectClient.called);
      fakeInjectClient.resetHistory();

      // Remove the content frame. This will trigger a re-injection check, but
      // do nothing as there is no content frame.
      fakeViewer.contentFrame.remove();
      await delay(0);

      assert.notCalled(fakeInjectClient);
    });

    it("doesn't re-inject if content frame siblings change", async () => {
      await waitFor(() => fakeInjectClient.called);
      fakeInjectClient.resetHistory();

      // Modify the DOM tree. This will trigger a re-injection check, but do
      // nothing as we've already handled the current frame.
      fakeViewer.contentFrame.insertAdjacentElement(
        'afterend',
        document.createElement('div')
      );
      await delay(0);

      assert.notCalled(fakeInjectClient);
    });
  });

  describe('VitalSourceContentIntegration', () => {
    let integrations;

    function createIntegration() {
      const integration = new VitalSourceContentIntegration();
      integrations.push(integration);
      return integration;
    }

    beforeEach(() => {
      integrations = [];
    });

    afterEach(() => {
      integrations.forEach(int => int.destroy());
    });

    it('allows annotation', () => {
      const integration = createIntegration();
      assert.equal(integration.canAnnotate(), true);
    });

    it('delegates to HTMLIntegration for side-by-side mode', () => {
      const integration = createIntegration();
      fakeHTMLIntegration.fitSideBySide.returns(true);
      assert.isTrue(fakeHTMLIntegration.sideBySideEnabled);

      const layout = { expanded: true, width: 150 };
      const isActive = integration.fitSideBySide(layout);

      assert.isTrue(isActive);
      assert.calledWith(fakeHTMLIntegration.fitSideBySide, layout);
    });

    it('stops mouse events from propagating to parent frame', () => {
      createIntegration();

      const events = ['mousedown', 'mouseup', 'mouseout'];

      for (let eventName of events) {
        const listener = sinon.stub();
        document.addEventListener(eventName, listener);

        const event = new Event(eventName, { bubbles: true });
        document.body.dispatchEvent(event);
        assert.notCalled(listener);

        document.removeEventListener(eventName, listener);
      }
    });

    it('delegates to HTML integration for anchoring', async () => {
      const integration = createIntegration();
      integration.contentContainer();
      assert.calledWith(fakeHTMLIntegration.contentContainer);

      const range = new Range();
      await integration.describe(range);
      assert.calledWith(fakeHTMLIntegration.describe, range);

      const selectors = [{ type: 'TextQuoteSelector', exact: 'foobar' }];
      await integration.anchor(selectors);
      assert.calledWith(fakeHTMLIntegration.anchor, selectors);

      const anchor = {};
      await integration.scrollToAnchor(anchor);
      assert.calledWith(fakeHTMLIntegration.scrollToAnchor, anchor);
    });

    describe('#getMetadata', () => {
      it('returns book metadata', async () => {
        const integration = createIntegration();
        const metadata = await integration.getMetadata();
        assert.equal(metadata.title, document.title);
        assert.deepEqual(metadata.link, []);
      });
    });

    describe('#uri', () => {
      beforeEach(() => {
        const bookURI =
          '/books/abc/epub/OPS/xhtml/chapter_001.html?ignoreme#cfi=/foo/bar';
        history.pushState({}, '', bookURI);
      });

      afterEach(() => {
        history.back();
      });

      it('returns book URL excluding query string', async () => {
        const integration = createIntegration();
        const uri = await integration.uri();
        const parsedURL = new URL(uri);
        assert.equal(parsedURL.hostname, document.location.hostname);
        assert.equal(
          parsedURL.pathname,
          '/books/abc/epub/OPS/xhtml/chapter_001.html'
        );
        assert.equal(parsedURL.search, '');
      });
    });

    context('in PDF documents', () => {
      let FakeImageTextLayer;
      let fakeImageTextLayer;

      let fakePageImage;

      const pageText = 'test page text';

      beforeEach(() => {
        fakeImageTextLayer = {
          container: document.createElement('div'),
          destroy: sinon.stub(),
          updateSync: sinon.stub(),
        };
        FakeImageTextLayer = sinon.stub().returns(fakeImageTextLayer);

        $imports.$mock({
          './image-text-layer': { ImageTextLayer: FakeImageTextLayer },
        });
      });

      afterEach(() => {
        fakePageImage?.remove();
        delete window.innerPageData;
      });

      function createPageImageAndData() {
        window.innerPageData = {
          glyphs: {
            glyphs: [...pageText].map((char, index) => ({
              l: index,
              t: index,
              r: index + 1,
              b: index + 1,
            })),
          },
          words: pageText,
        };

        fakePageImage = document.createElement('img');
        fakePageImage.id = 'pbk-page';
        document.body.append(fakePageImage);
      }

      it('does not create hidden text layer in EPUB documents', () => {
        createIntegration();
        assert.notCalled(FakeImageTextLayer);
      });

      it('installs scrolling workaround for tall frames', async () => {
        // Create a shadow DOM and iframe structure that matches the relevant
        // parts of the real VS reader.
        const bookElement = document.createElement('mosaic-book');
        const shadowRoot = bookElement.attachShadow({ mode: 'open' });
        document.body.append(bookElement);

        const frame = document.createElement('iframe');
        frame.style.height = '2000px';
        frame.setAttribute('scrolling', 'no');
        shadowRoot.append(frame);

        const frameElementStub = sinon
          .stub(window, 'frameElement')
          .get(() => frame);
        try {
          createIntegration();

          assert.isFalse(frame.hasAttribute('scrolling'));
          assert.equal(
            getComputedStyle(frame).height,
            `${window.innerHeight}px` // "100%" in pixels
          );

          // Try re-adding the scrolling attribute. It should get re-removed.
          frame.setAttribute('scrolling', 'no');
          await delay(0);

          assert.isFalse(frame.hasAttribute('scrolling'));
        } finally {
          frameElementStub.restore();
          bookElement.remove();
        }
      });

      it('creates hidden text layer in PDF documents', () => {
        createPageImageAndData();
        createIntegration();

        assert.calledWith(
          FakeImageTextLayer,
          fakePageImage,
          sinon.match.array,
          pageText
        );

        const glyphs = FakeImageTextLayer.getCall(0).args[1];
        const expectedGlyphs = window.innerPageData.glyphs.glyphs.map(g => ({
          left: g.l / 100,
          right: g.r / 100,
          top: g.t / 100,
          bottom: g.b / 100,
        }));
        assert.deepEqual(glyphs, expectedGlyphs);

        assert.equal(fakeImageTextLayer.container.style.zIndex, '100');
      });

      it('removes hidden text layer when destroyed', () => {
        createPageImageAndData();
        const integration = createIntegration();

        integration.destroy();

        assert.calledOnce(fakeImageTextLayer.destroy);
      });

      context('when side-by-side mode is toggled', () => {
        it('resizes page image', () => {
          createPageImageAndData();
          const integration = createIntegration();

          // Activate side-by-side mode. Page image should be resized to fit
          // alongside sidebar.
          // Minimum threshold for enabling side-by-side mode is 480px
          const sidebarWidth = window.innerWidth - 481;
          const expectedWidth = window.innerWidth - sidebarWidth;
          integration.fitSideBySide({ expanded: true, width: sidebarWidth });
          assert.equal(fakePageImage.parentElement.style.textAlign, 'left');
          assert.equal(fakePageImage.style.width, `${expectedWidth}px`);
          assert.calledOnce(fakeImageTextLayer.updateSync);

          // Deactivate side-by-side mode. Style overrides should be removed.
          integration.fitSideBySide({ expanded: false });
          assert.equal(fakePageImage.parentElement.style.textAlign, '');
          assert.equal(fakePageImage.style.width, '');
          assert.calledTwice(fakeImageTextLayer.updateSync);
        });

        it('does not resize page image if there is not enough space', () => {
          createPageImageAndData();
          const integration = createIntegration();

          // This will leave less than 480px available to the main content
          const sidebarWidth = window.innerWidth - 479;
          integration.fitSideBySide({ expanded: true, width: sidebarWidth });
          assert.equal(fakePageImage.parentElement.style.textAlign, '');
          assert.equal(fakePageImage.style.width, '');
        });
      });
    });
  });
});
