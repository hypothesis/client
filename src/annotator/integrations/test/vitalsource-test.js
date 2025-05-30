import { delay, waitFor } from '@hypothesis/frontend-testing';

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

function resolveURL(relativeURL) {
  return new URL(relativeURL, document.baseURI).toString();
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
      describe: sinon.stub().returns([
        {
          type: 'TextQuoteSelector',
          exact: 'dummy selection',
        },
      ]),
      destroy: sinon.stub(),
      fitSideBySide: sinon.stub().returns(false),
      getAnnotatableRange: sinon.stub().returnsArg(0),
      scrollToAnchor: sinon.stub(),
      sideBySideActive: sinon.stub().returns(false),

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
        'content',
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
      assert.calledWith(
        fakeInjectClient,
        fakeViewer.contentFrame,
        fakeConfig,
        'vitalsource-content',
      );
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
          fakeConfig,
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
        document.createElement('div'),
      );
      await delay(0);

      assert.notCalled(fakeInjectClient);
    });
  });

  class FakeMosaicBookElement {
    constructor() {
      this._format = 'epub';

      this.goToCfi = sinon.stub();
      this.goToURL = sinon.stub();
    }

    selectEPUBBook() {
      this._format = 'epub';
    }

    selectPDFBook() {
      this._format = 'pbk';
    }

    getBookInfo() {
      return {
        format: this._format,
        title: 'Test book title',
        isbn: 'TEST-BOOK-ID',
      };
    }

    async getCurrentPage() {
      if (this._format === 'epub') {
        return {
          absoluteURL: '/pages/chapter_02.xhtml',
          cfi: '/2',
          chapterTitle: 'Chapter two',
          index: undefined,
          page: '20',
        };
      } else if (this._format === 'pbk') {
        return {
          absoluteURL: '/pages/2',
          cfi: '/1',
          index: 1,
          page: '2',
          chapterTitle: 'First chapter',
        };
      } else {
        throw new Error('Unknown book');
      }
    }

    async getPages() {
      const pageData = await this.getCurrentPage();
      const data = [pageData];
      return { ok: true, data };
    }

    async getPageBreaks() {
      let data = [];
      if (this._format === 'epub') {
        data = [
          // Pages before chapter
          {
            cfi: '/0',
            cfiWithoutAssertions: '/0',
            label: '5',
          },
          // Pages within current chapter
          {
            cfi: '/2',
            cfiWithoutAssertions: '/2',
            label: '20',
          },
          {
            cfi: '/2!/2',
            cfiWithoutAssertions: '/2!/2',
            label: '21',
          },
          // Pages after current chapter
          {
            cfi: '/4!/2',
            cfiWithoutAssertions: '/4!/2',
            label: '22',
          },
        ];
      }
      return { ok: true, data };
    }

    async getTOC() {
      if (this._format === 'epub') {
        const toc = [
          {
            cfi: '/1[foo]!/4/10',
            title: 'Chapter one (from TOC)',
          },
          {
            cfi: '/2[bar]!/2/8',
            title: 'Chapter two (from TOC)',
          },
          {
            cfi: '/4[bar]!/2/8',
            title: 'Chapter three (from TOC)',
          },
        ];
        return { ok: true, data: toc };
      } else {
        return { ok: false };
      }
    }
  }

  describe('VitalSourceContentIntegration', () => {
    // List of active integrations.
    let integrations;

    let fakeBookElement;

    /** Create a new integration and add it to the active list. */
    function createIntegration() {
      const integration = new VitalSourceContentIntegration(document.body, {
        bookElement: fakeBookElement,
      });
      integrations.push(integration);
      return integration;
    }

    /** Destroy an integration and remove it from the active list. */
    function destroyIntegration(integration) {
      const idx = integrations.indexOf(integration);
      if (idx === -1) {
        throw new Error('Integration is not in list of active integrations');
      }
      integrations.splice(idx, 1);
      integration.destroy();
    }

    beforeEach(() => {
      integrations = [];
      fakeBookElement = new FakeMosaicBookElement();
    });

    afterEach(() => {
      integrations.forEach(int => int.destroy());
    });

    it('delegates to HTML integration to check if selected content is annotatable', () => {
      const integration = createIntegration();
      const range = new Range();

      assert.equal(integration.getAnnotatableRange(range), range);
      assert.calledWith(fakeHTMLIntegration.getAnnotatableRange, range);
    });

    it('asks sidebar to persist annotations after frame unloads', () => {
      const integration = createIntegration();
      assert.isTrue(integration.persistFrame());
    });

    it('delegates to HTMLIntegration for side-by-side mode', () => {
      const integration = createIntegration();
      assert.calledOnce(FakeHTMLIntegration);

      fakeHTMLIntegration.fitSideBySide.returns(true);
      fakeHTMLIntegration.sideBySideActive.returns(true);
      const layout = { expanded: true, width: 150 };
      const isActive = integration.fitSideBySide(layout);

      assert.isTrue(isActive);
      assert.calledWith(fakeHTMLIntegration.fitSideBySide, layout);
      assert.isTrue(integration.sideBySideActive());
    });

    it('stops mouse events from propagating to parent frame', () => {
      createIntegration();

      const events = ['mouseup', 'mousedown', 'mouseout'];

      for (const eventName of events) {
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

      const root = {};
      const range = new Range();
      await integration.describe(root, range);
      assert.calledWith(fakeHTMLIntegration.describe, root, range);

      const selectors = [{ type: 'TextQuoteSelector', exact: 'foobar' }];
      await integration.anchor(selectors);
      assert.calledWith(fakeHTMLIntegration.anchor, selectors);

      const anchor = {};
      await integration.scrollToAnchor(anchor);
      assert.calledWith(fakeHTMLIntegration.scrollToAnchor, anchor);
    });

    it('adds selector for current EPUB book Content Document', async () => {
      const integration = createIntegration();
      integration.contentContainer();
      assert.calledWith(fakeHTMLIntegration.contentContainer);

      const root = {};
      const range = new Range();
      const selectors = await integration.describe(root, range);

      const cfiSelector = selectors.find(s => s.type === 'EPUBContentSelector');

      assert.ok(cfiSelector);
      assert.deepEqual(cfiSelector, {
        type: 'EPUBContentSelector',
        url: resolveURL('/pages/chapter_02.xhtml'),
        cfi: '/2',
        title: 'Chapter two (from TOC)',
      });

      const pageSelector = selectors.find(s => s.type === 'PageSelector');
      assert.deepEqual(pageSelector, {
        type: 'PageSelector',
        index: 0,
        label: '20',
      });
    });

    it('adds selector for current PDF book page', async () => {
      fakeBookElement.selectPDFBook();

      const integration = createIntegration();
      integration.contentContainer();
      assert.calledWith(fakeHTMLIntegration.contentContainer);

      const root = {};
      const range = new Range();
      const selectors = await integration.describe(root, range);
      const cfiSelector = selectors.find(s => s.type === 'EPUBContentSelector');

      assert.ok(cfiSelector);
      assert.deepEqual(cfiSelector, {
        type: 'EPUBContentSelector',
        url: resolveURL('/pages/2'),
        cfi: '/1',
        title: 'First chapter',
      });

      const pageSelector = selectors.find(s => s.type === 'PageSelector');
      assert.ok(pageSelector);
      assert.deepEqual(pageSelector, {
        type: 'PageSelector',
        index: 1,
        label: '2',
      });
    });

    ['absoluteURL', 'cfi'].forEach(field => {
      it(`throws if page info field "${field}" is missing`, async () => {
        fakeBookElement.selectPDFBook();

        const pageInfo = { ...(await fakeBookElement.getCurrentPage()) };
        delete pageInfo[field];
        fakeBookElement.getCurrentPage = async () => pageInfo;

        const integration = createIntegration();
        integration.contentContainer();
        assert.calledWith(fakeHTMLIntegration.contentContainer);

        const root = {};
        const range = new Range();
        let error;
        try {
          await integration.describe(root, range);
        } catch (err) {
          error = err;
        }

        assert.instanceOf(error, Error);
        assert.equal(
          error.message,
          `Page metadata field "${field}" is missing`,
        );
      });
    });

    describe('#getMetadata', () => {
      it('returns book metadata', async () => {
        const integration = createIntegration();
        const metadata = await integration.getMetadata();
        assert.equal(metadata.title, 'Test book title');
        assert.deepEqual(metadata.link, []);
      });
    });

    describe('#navigateToSegment', () => {
      function createAnnotationWithSelector(selector) {
        return {
          target: [
            {
              selector: [selector],
            },
          ],
        };
      }

      [
        {
          // Annotation with no selectors identifying a segment.
          type: 'TextQuoteSelector',
          exact: 'foo',
        },
        {
          // Segment selector with no CFI or URL
          type: 'EPUBContentSelector',
        },
      ].forEach(selector => {
        it('throws if annotation has no segment info available', () => {
          const integration = createIntegration();
          const ann = createAnnotationWithSelector(selector);
          assert.throws(() => {
            integration.navigateToSegment(ann);
          }, 'No segment information available');

          assert.notCalled(fakeBookElement.goToCfi);
          assert.notCalled(fakeBookElement.goToURL);
        });
      });

      it('navigates to CFI if available', () => {
        const integration = createIntegration();
        const ann = createAnnotationWithSelector({
          type: 'EPUBContentSelector',
          cfi: '/2/4',
          url: resolveURL('/chapters/02.xhtml'),
        });

        integration.navigateToSegment(ann);

        assert.calledWith(fakeBookElement.goToCfi, '/2/4');
      });

      it('navigates to URL if no CFI available', () => {
        const integration = createIntegration();
        const ann = createAnnotationWithSelector({
          type: 'EPUBContentSelector',
          url: resolveURL('/chapters/02.xhtml'),
        });

        integration.navigateToSegment(ann);

        assert.calledWith(fakeBookElement.goToURL, '/chapters/02.xhtml');
      });
    });

    describe('#segmentInfo', () => {
      it('returns metadata for current page/chapter', async () => {
        const integration = createIntegration();
        const segment = await integration.segmentInfo();
        assert.deepEqual(segment, {
          cfi: '/2',
          pages: { start: '20', end: '21' },
          url: resolveURL('/pages/chapter_02.xhtml'),
        });
      });
    });

    describe('#uri', () => {
      beforeEach(() => {
        const bookURI =
          '/books/abc/epub/OPS/xhtml/chapter_001.html?ignoreme#cfi=/foo/bar';
        history.pushState({}, '', bookURI);
      });

      afterEach(async () => {
        const urlChanged = new Promise(resolve => {
          window.addEventListener('popstate', () => resolve(), { once: true });
        });

        history.back();

        await urlChanged;
      });

      it('returns book reader URL', async () => {
        const integration = createIntegration();
        const uri = await integration.uri();
        assert.equal(
          uri,
          'https://bookshelf.vitalsource.com/reader/books/TEST-BOOK-ID',
        );
      });

      it('throws if book ID is missing', async () => {
        fakeBookElement.getBookInfo = () => ({
          format: 'epub',
          title: 'Test book title',
          // `isbn` field is missing
        });

        const integration = createIntegration();
        let error;
        try {
          await integration.uri();
        } catch (err) {
          error = err;
        }

        assert.instanceOf(error, Error);
        assert.equal(error.message, 'Unable to get book ID from VitalSource');
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
            `${window.innerHeight}px`, // "100%" in pixels
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
          pageText,
        );

        const glyphs = FakeImageTextLayer.getCall(0).args[1].map(domRect => ({
          left: domRect.left,
          right: domRect.right,
          top: domRect.top,
          bottom: domRect.bottom,
        }));

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

      it('disables side-by-side mode when destroyed', () => {
        createPageImageAndData();
        const integration = createIntegration();

        integration.fitSideBySide({ expanded: true, width: 100 });
        assert.isTrue(integration.sideBySideActive());

        destroyIntegration(integration);

        assert.isFalse(integration.sideBySideActive());
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

          assert.isTrue(integration.sideBySideActive());
          assert.equal(fakePageImage.parentElement.style.textAlign, 'left');
          assert.equal(fakePageImage.style.width, `${expectedWidth}px`);
          assert.calledOnce(fakeImageTextLayer.updateSync);

          // Deactivate side-by-side mode. Style overrides should be removed.
          integration.fitSideBySide({ expanded: false });

          assert.isFalse(integration.sideBySideActive());
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

          assert.isFalse(integration.sideBySideActive());
          assert.equal(fakePageImage.parentElement.style.textAlign, '');
          assert.equal(fakePageImage.style.width, '');
        });
      });
    });
  });
});
