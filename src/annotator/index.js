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

  console.log("DASH adding event listener");
  // Listen to 'hypothesisLink' event from Dash
  // Modify the placeholder annotation's text content to the linked Dash document URL
  document.addEventListener('linkRequest', async function (e) {
    console.log("DASH link request");
    let username = "melissaz";
    let apiKey = "6879-mvJ14m2jrc6-EcXjJtEZc_W3-NN7lGMpANpe2SIHkxY";
    let linkedDocUrl = e.detail.url;
    let linkedDocTitle = e.detail.title;

    let getResponse = await DashUtil.getAnnotation(`?user=acct:${username}@hypothes.is&text=placeholder`); // get the placeholder annotation
    if (getResponse && getResponse.rows.length > 0) {
      let patchResponse = await DashUtil.editAnnotation(getResponse.rows[0].id, apiKey, linkedDocUrl, linkedDocTitle); // modify the placeholder annotation
      console.log(linkedDocUrl, "DASH edited annotation", patchResponse);
      
      // notify dash that the link has been completed, with the URL of the annotated website
      document.dispatchEvent(new CustomEvent("linkComplete", {
        detail: patchResponse.uri,
        bubbles: true
      }));
    } else {
      console.log("DASH no corresponding annotations found");
    }
  })
});
