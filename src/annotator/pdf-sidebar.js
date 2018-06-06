'use strict';

const Sidebar = require('./sidebar');

const DEFAULT_CONFIG = {
  TextSelection: {},
  PDF: {},
  BucketBar: {
    container: '.annotator-frame',
    scrollables: ['#viewerContainer'],
  },
  Toolbar: {
    container: '.annotator-frame',
  },
};

class PdfSidebar extends Sidebar {
  constructor(element, config) {
    super(element, Object.assign({}, DEFAULT_CONFIG, config));
  }
}

module.exports = PdfSidebar;
