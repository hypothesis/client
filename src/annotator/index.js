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

  console.log(" DASH adding event listener");
  // Listen to 'hypothesisLink' event from Dash
  // Modify the placeholder annotation's text content to the linked Dash document URL
  document.addEventListener('hypothesisLink', async function (e) {
    console.log("DASH got link request!!");
    let username = "bobzel";
    let apiKey = "6879-DnMTKjWjnnLPa0Php7f5Ra2kunZ_X0tMRDbTF220_q0";
    let linkedDocUrl = e.detail;

    let getResponse = await DashUtil.getAnnotation(`?user=acct:${username}@hypothes.is&text=placeholder`);
    if (getResponse && getResponse.rows.length > 0) {
      console.log("DASH: editing annotation");
      let patchResponse = await DashUtil.editAnnotation(getResponse.rows[0].id, linkedDocUrl, apiKey);
      console.log("DASH:" + linkedDocUrl, "edited annotation", patchResponse);
    } else {
      console.log("DASH: no corresponding annotations found");
    }
  })
});
