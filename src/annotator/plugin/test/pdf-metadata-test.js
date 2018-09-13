'use strict';

const PDFMetadata = require('../pdf-metadata');

describe('pdf-metadata', function () {
  it('waits for the PDF to load before returning metadata', function () {
    const fakeApp = {};
    const pdfMetadata = new PDFMetadata(fakeApp);

    const event = document.createEvent('Event');
    event.initEvent('documentload', false, false);
    fakeApp.url = 'http://fake.com';
    fakeApp.documentFingerprint = 'fakeFingerprint';
    window.dispatchEvent(event);

    return pdfMetadata.getUri().then(function (uri) {
      assert.equal(uri, 'http://fake.com/');
    });
  });

  it('does not wait for the PDF to load if it has already loaded', function () {
    const fakePDFViewerApplication = {
      url: 'http://fake.com',
      documentFingerprint: 'fakeFingerprint',
    };
    const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);
    return pdfMetadata.getUri().then(function (uri) {
      assert.equal(uri, 'http://fake.com/');
    });
  });

  describe('metadata sources', function () {
    let pdfMetadata;
    const fakePDFViewerApplication = {
      documentFingerprint: 'fakeFingerprint',
      documentInfo: {
        Title: 'fakeTitle',
      },
      metadata: {
        metadata: {
          'dc:title': 'fakeTitle',
        },
      },
      url: 'http://fake.com/',
    };

    beforeEach(function () {
      pdfMetadata = new PDFMetadata(fakePDFViewerApplication);
    });

    describe('#getUri', function () {
      it('returns the non-file URI', function() {
        return pdfMetadata.getUri().then(function (uri) {
          assert.equal(uri, 'http://fake.com/');
        });
      });

      it('returns the fingerprint as a URN when the PDF URL is a local file', function () {
        const fakePDFViewerApplication = {
          url: 'file:///test.pdf',
          documentFingerprint: 'fakeFingerprint',
        };
        const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);

        return pdfMetadata.getUri().then(function (uri) {
          assert.equal(uri, 'urn:x-pdf:fakeFingerprint');
        });
      });

      it('resolves relative URLs', () => {
        const fakePDFViewerApplication = {
          url: 'index.php?action=download&file_id=wibble',
          documentFingerprint: 'fakeFingerprint',
        };
        const pdfMetadata = new PDFMetadata(fakePDFViewerApplication);

        return pdfMetadata.getUri().then(uri => {
          const expected = new URL(fakePDFViewerApplication.url,
                                 document.location.href).toString();
          assert.equal(uri, expected);
        });
      });
    });

    describe('#getMetadata', function () {
      it('gets the title from the dc:title field', function () {
        const expectedMetadata = {
          title: 'dcTitle',
          link: [{href: 'urn:x-pdf:' + fakePDFViewerApplication.documentFingerprint},
            {href: fakePDFViewerApplication.url}],
          documentFingerprint: fakePDFViewerApplication.documentFingerprint,
        };

        fakePDFViewerApplication.metadata.has = sinon.stub().returns(true);
        fakePDFViewerApplication.metadata.get = sinon.stub().returns('dcTitle');

        return pdfMetadata.getMetadata().then(function (actualMetadata) {
          assert.deepEqual(actualMetadata, expectedMetadata);
        });
      });

      it('gets the title from the documentInfo.Title field', function () {
        const expectedMetadata = {
          title: fakePDFViewerApplication.documentInfo.Title,
          link: [{href: 'urn:x-pdf:' + fakePDFViewerApplication.documentFingerprint},
            {href: fakePDFViewerApplication.url}],
          documentFingerprint: fakePDFViewerApplication.documentFingerprint,
        };

        fakePDFViewerApplication.metadata.has = sinon.stub().returns(false);

        return pdfMetadata.getMetadata().then(function (actualMetadata) {
          assert.deepEqual(actualMetadata, expectedMetadata);
        });
      });

      it('does not save file:// URLs in document metadata', function () {
        let pdfMetadata;
        const fakePDFViewerApplication = {
          documentFingerprint: 'fakeFingerprint',
          url: 'file://fake.pdf',
        };
        const expectedMetadata = {
          link: [{href: 'urn:x-pdf:' + fakePDFViewerApplication.documentFingerprint}],
        };

        pdfMetadata = new PDFMetadata(fakePDFViewerApplication);

        return pdfMetadata.getMetadata().then(function (actualMetadata) {
          assert.equal(actualMetadata.link.length, 1);
          assert.equal(actualMetadata.link[0].href, expectedMetadata.link[0].href);
        });
      });
    });
  });
});
