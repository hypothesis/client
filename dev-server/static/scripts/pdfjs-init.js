'use strict';

/* global PDFViewerApplication, PDFViewerApplicationOptions */

// Listen for `webviewerloaded` event to configure the viewer after its files
// have been loaded but before it is initialized.
document.addEventListener('webviewerloaded', () => {
  // Prevent loading of default viewer PDF.
  PDFViewerApplicationOptions.set('defaultUrl', '');

  // Read configuration rendered into template as global vars.
  const documentUrl = window.DOCUMENT_URL;
  const url = window.PDF_URL;
  const clientEmbedUrl = window.CLIENT_URL;

  PDFViewerApplication.initializedPromise.then(() => {
    // Load the Hypothesis client.
    const embedScript = document.createElement('script');
    embedScript.src = clientEmbedUrl;
    document.body.appendChild(embedScript);

    // Load the PDF specified in the URL.
    //
    // This is done after the viewer components are initialized to avoid some
    // race conditions in `PDFViewerApplication` if the PDF finishes loading
    // (eg. from the HTTP cache) before the viewer is fully initialized.
    //
    // See https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#can-i-specify-a-different-pdf-in-the-default-viewer
    // and https://github.com/mozilla/pdf.js/issues/10435#issuecomment-452706770
    PDFViewerApplication.open({
      // Load PDF through Via to work around CORS restrictions.
      url,

      // Make sure `PDFViewerApplication.url` returns the original URL, as this
      // is the URL associated with annotations.
      originalUrl: documentUrl,
    });
  });
});
