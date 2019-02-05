'use strict';

const PDFMetadata = require('../pdf-metadata');

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
  constructor(url = '') {
    this.url = url;
    this.documentInfo = undefined;
    this.metadata = undefined;
    this.pdfDocument = null;
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
    const event = document.createEvent('Event');
    event.initEvent(eventName, false, false);
    window.dispatchEvent(event);

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
  }
}

describe('annotator/plugin/pdf-metadata', function() {
  [
    // Event dispatched in older PDF.js versions (pre-7bc4bfcc).
    'documentload',
    // Event dispatched in newer PDF.js versions (post-7bc4bfcc).
    'documentloaded',
  ].forEach(eventName => {
    it('waits for the PDF to load before returning metadata', function() {
      const fakeApp = new FakePDFViewerApplication();
      const pdfMetadata = new PDFMetadata(fakeApp);

      fakeApp.finishLoading({
        eventName,
        url: 'http://fake.com',
        fingerprint: 'fakeFingerprint',
      });

      return pdfMetadata.getUri().then(function(uri) {
        assert.equal(uri, 'http://fake.com/');
      });
    });
  });

  it('does not wait for the PDF to load if it has already loaded', function() {
    const fakePDFViewerApplication = new FakePDFViewerApplication();
    fakePDFViewerApplication.finishLoading({
      url: 'http://fake.com',
      fingerprint: 'fakeFingerprint',
    });
    const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);
    return pdfMetadata.getUri().then(function(uri) {
      assert.equal(uri, 'http://fake.com/');
    });
  });

  describe('metadata sources', function() {
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

    beforeEach(function() {
      pdfMetadata = new PDFMetadata(fakePDFViewerApplication);
    });

    describe('#getUri', function() {
      it('returns the non-file URI', function() {
        return pdfMetadata.getUri().then(function(uri) {
          assert.equal(uri, 'http://fake.com/');
        });
      });

      it('returns the fingerprint as a URN when the PDF URL is a local file', function() {
        const fakePDFViewerApplication = new FakePDFViewerApplication();
        fakePDFViewerApplication.finishLoading({
          url: 'file:///test.pdf',
          fingerprint: 'fakeFingerprint',
        });
        const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);

        return pdfMetadata.getUri().then(function(uri) {
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

    describe('#getMetadata', function() {
      it('gets the title from the dc:title field', function() {
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

        return pdfMetadata.getMetadata().then(function(actualMetadata) {
          assert.deepEqual(actualMetadata, expectedMetadata);
        });
      });

      it('gets the title from the documentInfo.Title field', function() {
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

        return pdfMetadata.getMetadata().then(function(actualMetadata) {
          assert.deepEqual(actualMetadata, expectedMetadata);
        });
      });

      it('does not save file:// URLs in document metadata', function() {
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

        return pdfMetadata.getMetadata().then(function(actualMetadata) {
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
