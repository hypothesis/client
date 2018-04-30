'use strict';

const { normalizeURI } = require('../util/url');

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
class PDFMetadata {
  /**
   * Construct a `PDFMetadata` that returns URIs/metadata associated with a
   * given PDF viewer.
   *
   * @param {PDFViewerApplication} app
   */
  constructor(app) {
    this._loaded = new Promise(resolve => {
      var finish = () => {
        window.removeEventListener('documentload', finish);
        resolve(app);
      };

      if (app.documentFingerprint) {
        resolve(app);
      } else {
        window.addEventListener('documentload', finish);
      }
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
      var uri = getPDFURL(app);
      if (!uri) {
        uri = fingerprintToURN(app.documentFingerprint);
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
      var title = document.title;

      if (app.metadata && app.metadata.has('dc:title') && app.metadata.get('dc:title') !== 'Untitled') {
        title = app.metadata.get('dc:title');
      } else if (app.documentInfo && app.documentInfo.Title) {
        title = app.documentInfo.Title;
      }

      var link = [
        {href: fingerprintToURN(app.documentFingerprint)},
      ];

      var url = getPDFURL(app);
      if (url) {
        link.push({href: url});
      }

      return {
        title: title,
        link: link,
        documentFingerprint: app.documentFingerprint,
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

module.exports = PDFMetadata;
