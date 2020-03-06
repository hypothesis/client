/* global process */

import $ from 'jquery';

// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debug checks for Preact components.
if (process.env.NODE_ENV !== 'production') {
  require('preact/debug');
}

import configFrom from './config/index';
import Guest from './guest';
import PdfSidebar from './pdf-sidebar';
import BucketBarPlugin from './plugin/bucket-bar';
import CrossFramePlugin from './plugin/cross-frame';
import DocumentPlugin from './plugin/document';
import PDFPlugin from './plugin/pdf';
import ToolbarPlugin from './plugin/toolbar';
import Sidebar from './sidebar';

const pluginClasses = {
  // UI plugins
  BucketBar: BucketBarPlugin,
  Toolbar: ToolbarPlugin,

  // Document type plugins
  PDF: PDFPlugin,
  Document: DocumentPlugin,

  // Cross-frame communication
  CrossFrame: CrossFramePlugin,
};

const appLinkEl = document.querySelector(
  'link[type="application/annotator+html"][rel="sidebar"]'
);
const config = configFrom(window);

$.noConflict(true)(function() {
  let Klass = window.PDFViewerApplication ? PdfSidebar : Sidebar;

  if (config.hasOwnProperty('constructor')) {
    Klass = config.constructor;
    delete config.constructor;
  }

  if (config.subFrameIdentifier) {
    // Make sure the PDF plugin is loaded if the subframe contains the PDF.js viewer.
    if (typeof window.PDFViewerApplication !== 'undefined') {
      config.PDF = {};
    }
    Klass = Guest;

    // Other modules use this to detect if this
    // frame context belongs to hypothesis.
    // Needs to be a global property that's set.
    window.__hypothesis_frame = true;
  }

  config.pluginClasses = pluginClasses;

  const annotator = new Klass(document.body, config);
  appLinkEl.addEventListener('destroy', function() {
    appLinkEl.parentElement.removeChild(appLinkEl);
    annotator.destroy();
  });
});
