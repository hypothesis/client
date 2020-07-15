/* global process */

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
import Guest from './guest';
import PdfSidebar from './pdf-sidebar';
import BucketBarPlugin from './plugin/bucket-bar';
import CrossFramePlugin from './plugin/cross-frame';
import DocumentPlugin from './plugin/document';
import PDFPlugin from './plugin/pdf';
import Sidebar from './sidebar';
import * as DashUtil from './util/dash-util';

const pluginClasses = {
  // UI plugins
  BucketBar: BucketBarPlugin,

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

$.noConflict(true)(function () {
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
  appLinkEl.addEventListener('destroy', function () {
    appLinkEl.parentElement.removeChild(appLinkEl);
    annotator.destroy();
  });

  // Listen to 'hypothesisLink' event from Dash
  // Modify the placeholder annotation's text content to the linked Dash document URL
  document.addEventListener('editRequest', async function (e) {
    console.log("DASH editRequest received");
    let apiKey = e.detail.apiKey;
    let annotationId = e.detail.id;
    let text = e.detail.newText;

    let patchResponse = await DashUtil.editAnnotation(annotationId, apiKey, text); // modify the placeholder annotation
  
    // notify dash that the link has been completed, with the URL of the annotated website
    document.dispatchEvent(new CustomEvent("linkComplete", {
      detail: patchResponse.uri,
      bubbles: true
    }));
  })
});
