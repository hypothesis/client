'use strict';

const RenderingStates = require('../../pdfjs-rendering-states');

/**
 * @typedef {Object} Options
 * @property {Element} container - The container into which the fake PDF viewer
 *           should render the content
 * @property {string[]} content - Array of strings containing the text for each
 *           page
 */

/**
 * A minimal fake implementation of PDF.js' PDFViewerApplication interface.
 *
 * This emulates the parts of PDFViewerApplication that are relevant to
 * anchoring tests.
 *
 * @param {Options} options
 */
function FakePDFViewerApplication(options) {
  function checkBounds(index) {
    if (index < 0 || index >= options.content.length) {
      throw new Error('Invalid page index ' + index.toString());
    }
  }

  this._checkBounds = checkBounds;
  this._content = options.content;
  this._container = options.container;
  this._pages = [];

  const self = this;

  this.pdfViewer = {
    pagesCount: options.content.length,

    getPageView: function (index) {
      checkBounds(index);

      const page = self._pages[index];
      const textLayerEl = page.querySelector('.textLayer');

      return {
        div: page,
        textLayer: textLayerEl ?
          { textLayerDiv: textLayerEl, renderingDone: true } : null,
        renderingState: textLayerEl ? RenderingStates.FINISHED : RenderingStates.INITIAL,
      };
    },

    getPageTextContent: function (index) {
      checkBounds(index);
      return Promise.resolve({
        // The way that the page text is split into items will depend on
        // the PDF and the version of PDF.js - individual text items might be
        // just symbols, words, phrases or whole lines.
        //
        // Here we split items by line which matches the typical output for a
        // born-digital PDF.
        items: options.content[index].split(/\n/).map(function (line) {
          return {str: line};
        }),
      });
    },
  };
}

/**
 * Remove the DOM elements created by the PDF viewer and cleanup any timeouts etc.
 */
FakePDFViewerApplication.prototype.dispose = function () {
  this._pages.forEach(function (pageEl) {
    pageEl.remove();
  });
};

/**
 * Create the DOM structure for a page which matches the structure produced by
 * PDF.js
 *
 * @param {string} content - The text content for the page
 * @param {boolean} rendered - True if the page should be "rendered" or false if
 *        it should be an empty placeholder for a not-yet-rendered page
 * @return {Element} - The root Element for the page
 */
function createPage(content, rendered) {
  const pageEl = document.createElement('div');
  pageEl.classList.add('page');

  if (!rendered) {
    return pageEl;
  }

  const textLayer = document.createElement('div');
  textLayer.classList.add('textLayer');

  content.split(/\n/).forEach(function (item) {
    const itemEl = document.createElement('div');
    itemEl.textContent = item;
    textLayer.appendChild(itemEl);
  });

  pageEl.appendChild(textLayer);
  return pageEl;
}

/**
 * Set the index of the page which is currently visible in the viewport.
 *
 * Pages from `index` up to and including `lastRenderedPage` will be
 * "rendered" and have a text layer available. Other pages will be "un-rendered"
 * with no text layer available, but only a placeholder element for the whole
 * page.
 */
FakePDFViewerApplication.prototype.setCurrentPage = function (index, lastRenderedPage=index) {
  const self = this;

  this._checkBounds(index);

  const pages = this._content.map(function (text, idx) {
    return createPage(text, idx >= index && idx <= lastRenderedPage);
  });

  this._container.innerHTML = '';
  this._pages = pages;
  this._pages.forEach(function (p) { self._container.appendChild(p); });
};

module.exports = FakePDFViewerApplication;
