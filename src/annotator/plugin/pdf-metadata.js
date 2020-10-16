import { normalizeURI } from '../util/url';

/**
 * @typedef {import('../../types/pdfjs').PDFViewerApplication} PDFViewerApplication
 */

/**
 * @typedef Link
 * @prop {string} href
 */

/**
 * @typedef Metadata
 * @prop {string} title - The document title
 * @prop {Link[]} link - Array of URIs associated with this document
 * @prop {string} documentFingerprint - The fingerprint of this PDF. This is
 *   referred to as the "File Identifier" in the PDF spec. It may be a hash of
 *   part of the content if the PDF file does not have a File Identifier.
 */

/**
 * Wait for a PDFViewerApplication to be initialized.
 *
 * @param {PDFViewerApplication} app
 * @return {Promise<void>}
 */
function pdfViewerInitialized(app) {
  // `initializedPromise` was added in PDF.js v2.4.456.
  // See https://github.com/mozilla/pdf.js/pull/11607. In earlier versions the
  // `initialized` property can be queried.
  if (app.initializedPromise) {
    return app.initializedPromise;
  } else if (app.initialized) {
    return Promise.resolve();
  } else {
    // PDF.js < v2.4.456. The recommended approach is to listen for a `localized`
    // DOM event, but this assumes that PDF.js has been configured to publish
    // events to the DOM. Here we simply poll `app.initialized` because it is
    // easier.
    return new Promise(resolve => {
      const timeout = setInterval(() => {
        if (app.initialized) {
          clearTimeout(timeout);
          resolve();
        }
      }, 5);
    });
  }
}

/**
 * PDFMetadata extracts metadata about a loading/loaded PDF document from a
 * PDF.js PDFViewerApplication object.
 *
 * @example
 * // Invoke in a PDF.js viewer, before or after the PDF has finished loading.
 * const meta = new PDFMetadata(window.PDFViewerApplication)
 * meta.getUri().then(uri => {
 *    // Do something with the URL of the PDF.
 * })
 */
export default class PDFMetadata {
  /**
   * Construct a `PDFMetadata` that returns URIs/metadata associated with a
   * given PDF viewer.
   *
   * @param {PDFViewerApplication} app - The `PDFViewerApplication` global from PDF.js
   */
  constructor(app) {
    /** @type {Promise<PDFViewerApplication>} */
    this._loaded = pdfViewerInitialized(app).then(() => {
      // Check if document has already loaded.
      if (app.downloadComplete) {
        return app;
      }

      return new Promise(resolve => {
        const finish = () => {
          if (app.eventBus) {
            app.eventBus.off('documentload', finish);
            app.eventBus.off('documentloaded', finish);
          } else {
            window.removeEventListener('documentload', finish);
          }
          resolve(app);
        };

        // Listen for "documentloaded" event which signals that the document
        // has been downloaded and the first page has been rendered.
        if (app.eventBus) {
          // PDF.js >= v1.6.210 dispatch events via an internal event bus.
          // PDF.js < v2.5.207 also dispatches events to the DOM.

          // `documentloaded` is the preferred event in PDF.js >= v2.0.943.
          // See https://github.com/mozilla/pdf.js/commit/7bc4bfcc8b7f52b14107f0a551becdf01643c5c2
          app.eventBus.on('documentloaded', finish);

          // `documentload` is dispatched by PDF.js < v2.1.266.
          app.eventBus.on('documentload', finish);
        } else {
          // PDF.js < v1.6.210 dispatches events only to the DOM.
          window.addEventListener('documentload', finish);
        }
      });
    });
  }

  /**
   * Return the URI of the PDF.
   *
   * If the PDF is currently loading, the returned promise resolves once loading
   * is complete.
   *
   * @return {Promise<string>}
   */
  getUri() {
    return this._loaded.then(app => {
      let uri = getPDFURL(app);
      if (!uri) {
        uri = fingerprintToURN(app.pdfDocument.fingerprint);
      }
      return uri;
    });
  }

  /**
   * Returns metadata about the document.
   *
   * If the PDF is currently loading, the returned promise resolves once loading
   * is complete.
   *
   * @return {Promise<Metadata>}
   */
  getMetadata() {
    return this._loaded.then(app => {
      let title = document.title;

      if (
        app.metadata &&
        app.metadata.has('dc:title') &&
        app.metadata.get('dc:title') !== 'Untitled'
      ) {
        title = /** @type {string} */ (app.metadata.get('dc:title'));
      } else if (app.documentInfo && app.documentInfo.Title) {
        title = app.documentInfo.Title;
      }

      const link = [{ href: fingerprintToURN(app.pdfDocument.fingerprint) }];

      const url = getPDFURL(app);
      if (url) {
        link.push({ href: url });
      }

      return {
        title: title,
        link: link,
        documentFingerprint: app.pdfDocument.fingerprint,
      };
    });
  }
}

function fingerprintToURN(fingerprint) {
  return 'urn:x-pdf:' + String(fingerprint);
}

function getPDFURL(app) {
  const url = normalizeURI(app.url);

  // Local file:// URLs should not be saved in document metadata.
  // Entries in document.link should be URIs. In the case of
  // local files, omit the URL.
  if (url.indexOf('file://') !== 0) {
    return url;
  }

  return null;
}
