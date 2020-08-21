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
   */
  constructor(url = '', { domEvents = false, eventBusEvents = true } = {}) {
    this.url = url;
    this.documentInfo = undefined;
    this.metadata = undefined;
    this.pdfDocument = null;
    this.dispatchDOMEvents = domEvents;

    // Use `EventEmitter` as a fake version of PDF.js's `EventBus` class as the
    // API for subscribing to events is the same.
    if (eventBusEvents) {
      this.eventBus = new EventEmitter();
    }

    this.initializedPromise = new Promise(resolve => {
      this._resolveInitializedPromise = resolve;
    });
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
      // Oldest PDF.js versions (pre-2.x)
      eventName: 'documentload',
      domEvents: true,
      eventBusEvents: false,
    },
    {
      // Newer PDF.js versions (~ < 2.5.x)
      eventName: 'documentloaded',
      domEvents: true,
      eventBusEvents: false,
    },
    {
      // Current PDF.js versions (>= 2.5.x)
      eventName: 'documentloaded',
      domEvents: false,
      eventBusEvents: true,
    },
  ].forEach(({ eventName, domEvents = false, eventBusEvents = false }, i) => {
    it(`waits for PDF to load (${i})`, async () => {
      const fakeApp = new FakePDFViewerApplication('', {
        domEvents,
        eventBusEvents,
      });
      const pdfMetadata = new PDFMetadata(fakeApp);

      fakeApp.completeInit();

      // Give `PDFMetadata` a chance to register the "documentloaded" event listener.
      await delay(0);

      fakeApp.finishLoading({
        eventName,
        url: 'http://fake.com',
        fingerprint: 'fakeFingerprint',
      });

      assert.equal(await pdfMetadata.getUri(), 'http://fake.com/');
    });
  });

  it('does not wait for the PDF to load if it has already loaded', function () {
    const fakePDFViewerApplication = new FakePDFViewerApplication();
    fakePDFViewerApplication.finishLoading({
      url: 'http://fake.com',
      fingerprint: 'fakeFingerprint',
    });
    const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);
    return pdfMetadata.getUri().then(function (uri) {
      assert.equal(uri, 'http://fake.com/');
    });
  });

  describe('metadata sources', function () {
    let pdfMetadata;
    const fakePDFViewerApplication = new FakePDFViewerApplication();
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
