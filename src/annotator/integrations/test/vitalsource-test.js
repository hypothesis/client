import { delay } from '../../../test-util/wait';
import {
  VitalSourceContainerIntegration,
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
  }

  destroy() {
    this.bookElement.remove();
  }

  /** Simulate navigation to a different chapter of the book. */
  loadNextChapter() {
    this.contentFrame.remove();

    // VS handles navigations by removing the frame and creating a new one,
    // rather than navigating the existing frame.
    this.contentFrame = document.createElement('iframe');
    this.bookElement.shadowRoot.append(this.contentFrame);
  }
}

describe('annotator/integrations/vitalsource', () => {
  let fakeViewer;
  let FakeHTMLIntegration;
  let fakeHTMLIntegration;

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

    $imports.$mock({
      './html': { HTMLIntegration: FakeHTMLIntegration },
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

  describe('VitalSourceContainerIntegration', () => {
    let fakeGuest;
    let integration;

    beforeEach(() => {
      fakeGuest = {
        injectClient: sinon.stub(),
      };
      integration = new VitalSourceContainerIntegration(fakeGuest);
    });

    afterEach(() => {
      integration.destroy();
    });

    it('throws if constructed outside the VitalSource book reader', () => {
      fakeViewer.destroy();
      assert.throws(() => {
        new VitalSourceContainerIntegration(fakeGuest);
      }, 'Book container element not found');
    });

    it('injects client into content frame', () => {
      assert.calledWith(fakeGuest.injectClient, fakeViewer.contentFrame);
    });

    it('re-injects client when content frame is changed', async () => {
      fakeGuest.injectClient.resetHistory();

      fakeViewer.loadNextChapter();
      await delay(0);

      assert.calledWith(fakeGuest.injectClient, fakeViewer.contentFrame);
    });

    it('does not allow annotation in the container frame', async () => {
      assert.equal(integration.canAnnotate(), false);

      // Briefly check the results of the stub methods.
      assert.instanceOf(await integration.anchor(), Range);
      assert.throws(() => integration.describe());
      assert.equal(integration.fitSideBySide(), false);
      assert.deepEqual(await integration.getMetadata(), {
        title: '',
        link: [],
      });
      assert.equal(await integration.uri(), document.location.href);
      assert.equal(integration.contentContainer(), document.body);
      await integration.scrollToAnchor({}); // nb. No assert, this does nothing.
    });
  });

  describe('VitalSourceContentIntegration', () => {
    let integration;

    beforeEach(() => {
      integration = new VitalSourceContentIntegration();
    });

    afterEach(() => {
      integration.destroy();
    });

    it('allows annotation', () => {
      assert.equal(integration.canAnnotate(), true);
    });

    it('does not support side-by-side mode', () => {
      assert.equal(integration.fitSideBySide(), false);
    });

    it('stops mouse events from propagating to parent frame', () => {
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
      await integration.contentContainer();
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
  });
});
