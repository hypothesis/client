import EventEmitter from 'tiny-emitter';

import PDFMetadata from '../pdf-metadata';

/**
 * Fake implementation of PDF.js `window.PDFViewerApplication.metadata`.
 */
class FakeMetadata {
  /**
   * Initialize the metadata dictionary.
   *
   * @param {Object} metadata - A key/value dictionary of metadata fields.
   */
  constructor(metadata) {
    this._metadata = metadata;
  }

  get(key) {
    return this._metadata[key];
  }

  has(key) {
    return this._metadata.hasOwnProperty(key);
  }
}

/**
 * Fake implementation of PDF.js `window.PDFViewerApplication.pdfDocument`.
 */
class FakePDFDocumentProxy {
  constructor({ fingerprint }) {
    this.fingerprint = fingerprint;
  }
}

/**
 * Fake implementation of PDF.js `window.PDFViewerApplication` entry point.
 *
 * This fake only implements the parts that concern document metadata.
 */
class FakePDFViewerApplication {
  /**
   * Initialize the "PDF viewer" as it would be when loading a document or
   * when a document fails to load.
   *
   * @param {string} url - Fake PDF URL
   * @param {Object} options -
   *   Options to simulate APIs of different versions of PDF.js.
   *
   *   @prop {boolean} domEvents - Whether events are emitted on the DOM
   *   @prop {boolean} eventBusEvents - Whether the `eventBus` API is enabled
   *   @prop {boolean} initializedPromise - Whether the `initializedPromise` API is enabled
   */
  constructor(
    url = '',
    { domEvents = false, eventBusEvents = true, initializedPromise = true } = {}
  ) {
    this.url = url;
    this.documentInfo = undefined;
    this.metadata = undefined;
    this.pdfDocument = null;
    this.dispatchDOMEvents = domEvents;
    this.initialized = false;

    // Use `EventEmitter` as a fake version of PDF.js's `EventBus` class as the
    // API for subscribing to events is the same.
    if (eventBusEvents) {
      this.eventBus = new EventEmitter();
    }

    const initPromise = new Promise(resolve => {
      this._resolveInitializedPromise = () => {
        this.initialized = true;
        resolve();
      };
    });

    if (initializedPromise) {
      this.initializedPromise = initPromise;
    }
  }

  /**
   * Simulate completion of PDF document loading.
   */
  finishLoading({
    url,
    fingerprint,
    metadata,
    title,
    eventName = 'documentload',
  }) {
    this.url = url;
    this.downloadComplete = true;
    this.documentInfo = {};

    if (typeof title !== undefined) {
      this.documentInfo.Title = title;
    }

    if (metadata) {
      this.metadata = new FakeMetadata(metadata);
    }

    this.pdfDocument = new FakePDFDocumentProxy({ fingerprint });

    if (this.dispatchDOMEvents) {
      const event = document.createEvent('Event');
      event.initEvent(eventName, false, false);
      window.dispatchEvent(event);
    }
    this.eventBus?.emit(eventName);
  }

  /**
   * Simulate PDF viewer initialization completing.
   *
   * At this point the event bus becomes available.
   */
  completeInit() {
    this._resolveInitializedPromise();
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('annotator/plugin/pdf-metadata', function () {
  [
    {
      // PDF.js < 1.6.210: `documentload` event dispatched via DOM.
      eventName: 'documentload',
      domEvents: true,
      eventBusEvents: false,
      initializedPromise: false,
    },
    {
      // PDF.js >= 1.6.210: Event dispatch moved to internal event bus.
      eventName: 'documentload',
      domEvents: false,
      eventBusEvents: true,
      initializedPromise: false,
    },
    {
      // PDF.js >= 2.1.266: Deprecated `documentload` event was removed.
      eventName: 'documentloaded',
      domEvents: false,
      eventBusEvents: true,
      initializedPromise: false,
    },
    {
      // PDF.js >= 2.4.456: `initializedPromise` API was introduced.
      eventName: 'documentloaded',
      domEvents: false,
      eventBusEvents: true,
      initializedPromise: true,
    },
  ].forEach(
    ({ eventName, domEvents, eventBusEvents, initializedPromise }, i) => {
      it(`waits for PDF to load (${i})`, async () => {
        const fakeApp = new FakePDFViewerApplication('', {
          domEvents,
          eventBusEvents,
          initializedPromise,
        });
        const pdfMetadata = new PDFMetadata(fakeApp);

        fakeApp.completeInit();

        // Request the PDF URL before the document has finished loading.
        const uriPromise = pdfMetadata.getUri();

        // Simulate a short delay in completing PDF.js initialization and
        // loading the PDF.
        //
        // Note that this delay is longer than the `app.initialized` polling
        // interval in `pdfViewerInitialized`.
        await delay(10);

        fakeApp.finishLoading({
          eventName,
          url: 'http://fake.com',
          fingerprint: 'fakeFingerprint',
        });

        assert.equal(await uriPromise, 'http://fake.com/');
      });
    }
  );

  // The `initializedPromise` param simulates different versions of PDF.js with
  // and without the `PDFViewerApplication.initializedPromise` API.
  [true, false].forEach(initializedPromise => {
    it('does not wait for the PDF to load if it has already loaded', function () {
      const fakePDFViewerApplication = new FakePDFViewerApplication('', {
        initializedPromise,
      });
      fakePDFViewerApplication.completeInit();
      fakePDFViewerApplication.finishLoading({
        url: 'http://fake.com',
        fingerprint: 'fakeFingerprint',
      });
      const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);
      return pdfMetadata.getUri().then(function (uri) {
        assert.equal(uri, 'http://fake.com/');
      });
    });
  });

  describe('metadata sources', function () {
    let pdfMetadata;
    const fakePDFViewerApplication = new FakePDFViewerApplication();
    fakePDFViewerApplication.completeInit();
    fakePDFViewerApplication.finishLoading({
      fingerprint: 'fakeFingerprint',
      title: 'fakeTitle',
      metadata: {
        'dc:title': 'dcFakeTitle',
      },
      url: 'http://fake.com/',
    });

    beforeEach(function () {
      pdfMetadata = new PDFMetadata(fakePDFViewerApplication);
    });

    describe('#getUri', function () {
      it('returns the non-file URI', function () {
        return pdfMetadata.getUri().then(function (uri) {
          assert.equal(uri, 'http://fake.com/');
        });
      });

      it('returns the fingerprint as a URN when the PDF URL is a local file', function () {
        const fakePDFViewerApplication = new FakePDFViewerApplication();
        fakePDFViewerApplication.completeInit();
        fakePDFViewerApplication.finishLoading({
          url: 'file:///test.pdf',
          fingerprint: 'fakeFingerprint',
        });
        const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);

        return pdfMetadata.getUri().then(function (uri) {
          assert.equal(uri, 'urn:x-pdf:fakeFingerprint');
        });
      });

      it('resolves relative URLs', () => {
        const fakePDFViewerApplication = new FakePDFViewerApplication();
        fakePDFViewerApplication.completeInit();
        fakePDFViewerApplication.finishLoading({
          url: 'index.php?action=download&file_id=wibble',
          fingerprint: 'fakeFingerprint',
        });
        const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);

        return pdfMetadata.getUri().then(uri => {
          const expected = new URL(
            fakePDFViewerApplication.url,
            document.location.href
          ).toString();
          assert.equal(uri, expected);
        });
      });
    });

    describe('#getMetadata', function () {
      it('gets the title from the dc:title field', function () {
        const expectedMetadata = {
          title: 'dcFakeTitle',
          link: [
            {
              href:
                'urn:x-pdf:' + fakePDFViewerApplication.pdfDocument.fingerprint,
            },
            { href: fakePDFViewerApplication.url },
          ],
          documentFingerprint: fakePDFViewerApplication.pdfDocument.fingerprint,
        };

        return pdfMetadata.getMetadata().then(function (actualMetadata) {
          assert.deepEqual(actualMetadata, expectedMetadata);
        });
      });

      it('gets the title from the documentInfo.Title field', function () {
        const expectedMetadata = {
          title: fakePDFViewerApplication.documentInfo.Title,
          link: [
            {
              href:
                'urn:x-pdf:' + fakePDFViewerApplication.pdfDocument.fingerprint,
            },
            { href: fakePDFViewerApplication.url },
          ],
          documentFingerprint: fakePDFViewerApplication.pdfDocument.fingerprint,
        };

        fakePDFViewerApplication.metadata.has = sinon.stub().returns(false);

        return pdfMetadata.getMetadata().then(function (actualMetadata) {
          assert.deepEqual(actualMetadata, expectedMetadata);
        });
      });

      it('does not save file:// URLs in document metadata', function () {
        let pdfMetadata;
        const fakePDFViewerApplication = new FakePDFViewerApplication();
        fakePDFViewerApplication.completeInit();
        fakePDFViewerApplication.finishLoading({
          fingerprint: 'fakeFingerprint',
          url: 'file://fake.pdf',
        });
        const expectedMetadata = {
          link: [
            {
              href:
                'urn:x-pdf:' + fakePDFViewerApplication.pdfDocument.fingerprint,
            },
          ],
        };

        pdfMetadata = new PDFMetadata(fakePDFViewerApplication);

        return pdfMetadata.getMetadata().then(function (actualMetadata) {
          assert.equal(actualMetadata.link.length, 1);
          assert.equal(
            actualMetadata.link[0].href,
            expectedMetadata.link[0].href
          );
        });
      });
    });
  });
});
