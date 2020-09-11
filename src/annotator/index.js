/* global process */

/**
 * @typedef {import('../types/annotator').HypothesisWindow} HypothesisWindow
 */

import $ from 'jquery';

// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debug checks for Preact components.
if (process.env.NODE_ENV !== 'production') {
  require('preact/debug');
}

// Load icons.
import { registerIcons } from '../shared/components/svg-icon';
import iconSet from './icons';
registerIcons(iconSet);

import configFrom from './config/index';
import CrossFramePlugin from './plugin/cross-frame';
import DocumentPlugin from './plugin/document';
import Guest from './guest';
import PdfSidebar from './pdf-sidebar';
import Sidebar from './sidebar';

// Modules that are still written in CoffeeScript and need to be converted to
// JS.
// @ts-expect-error
import BucketBarPlugin from './plugin/bucket-bar';
// @ts-expect-error
import PDFPlugin from './plugin/pdf';

const pluginClasses = {
  // UI plugins
  BucketBar: BucketBarPlugin,

  // Document type plugins
  PDF: PDFPlugin,
  Document: DocumentPlugin,

  // Cross-frame communication
  CrossFrame: CrossFramePlugin,
};

const window_ = /** @type {HypothesisWindow} */ (window);

// Look up the URL of the sidebar. This element is added to the page by the
// boot script before the "annotator" bundle loads.
const appLinkEl = /** @type {Element} */ (document.querySelector(
  'link[type="application/annotator+html"][rel="sidebar"]'
));

const config = configFrom(window);

$.noConflict(true)(function () {
  const isPDF = typeof window_.PDFViewerApplication !== 'undefined';

  /** @type {new (e: Element, config: any) => Guest} */
  let Klass = isPDF ? PdfSidebar : Sidebar;

  if (config.subFrameIdentifier) {
    // Make sure the PDF plugin is loaded if the subframe contains the PDF.js viewer.
    if (isPDF) {
      config.PDF = {};
    }
    Klass = Guest;

    // Other modules use this to detect if this
    // frame context belongs to hypothesis.
    // Needs to be a global property that's set.
    window_.__hypothesis_frame = true;
  }

  config.pluginClasses = pluginClasses;

  const annotator = new Klass(document.body, config);
  appLinkEl.addEventListener('destroy', function () {
    appLinkEl.remove();
    annotator.destroy();
  });
});
