import { delay } from '../../../test-util/wait';
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
      '<div>Encrypted content</div>';
  }

  finishChapterLoad() {
    this.contentFrame.contentDocument.body.innerHTML = '<p>New content</p>';
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
      scrollToAnchor: sinon.stub(),
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

    it('injects client into content frame', () => {
      assert.calledWith(fakeInjectClient, fakeViewer.contentFrame, fakeConfig);
    });

    it('re-injects client when content frame is changed', async () => {
      fakeInjectClient.resetHistory();

      fakeViewer.beginChapterLoad();
      await delay(0);
      assert.notCalled(fakeInjectClient);

      fakeViewer.finishChapterLoad();
      await delay(0);
      assert.calledWith(fakeInjectClient, fakeViewer.contentFrame, fakeConfig);
    });

    it("doesn't re-inject if content frame is removed", async () => {
      fakeInjectClient.resetHistory();

      // Remove the content frame. This will trigger a re-injection check, but
      // do nothing as there is no content frame.
      fakeViewer.contentFrame.remove();
      await delay(0);

      assert.notCalled(fakeInjectClient);
    });

    it("doesn't re-inject if content frame siblings change", async () => {
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

    it('does not support side-by-side mode', () => {
      const integration = createIntegration();
      assert.equal(integration.fitSideBySide(), false);
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
    });
  });
});
