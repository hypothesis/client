'use strict';

require('../shared/polyfills');

var Annotator = require('annotator');

// Polyfills

// document.evaluate() implementation,
// required by IE 10, 11
//
// This sets `window.wgxpath`
if (!window.document.evaluate) {
  require('./vendor/wgxpath.install');
}
var g = Annotator.Util.getGlobal();
if (g.wgxpath) {
  g.wgxpath.install();
}

// Applications
Annotator.Guest = require('./guest');
Annotator.Host = require('./host');
Annotator.Sidebar = require('./sidebar');
Annotator.PdfSidebar = require('./pdf-sidebar');

// UI plugins
Annotator.Plugin.BucketBar = require('./plugin/bucket-bar');
Annotator.Plugin.Toolbar = require('./plugin/toolbar');

// Document type plugins
Annotator.Plugin.PDF = require('./plugin/pdf');
require('./vendor/annotator.document');  // Does not export the plugin :(

// Cross-frame communication
Annotator.Plugin.CrossFrame = require('./plugin/cross-frame');
Annotator.Plugin.CrossFrame.AnnotationSync = require('./annotation-sync');
Annotator.Plugin.CrossFrame.Bridge = require('../shared/bridge');
Annotator.Plugin.CrossFrame.Discovery = require('../shared/discovery');

var appLinkEl =
  document.querySelector('link[type="application/annotator+html"]');
var options = require('./config')(window);

Annotator.noConflict().$.noConflict(true)(function() {
  var Klass = window.PDFViewerApplication ?
      Annotator.PdfSidebar :
      Annotator.Sidebar;
  if (options.hasOwnProperty('constructor')) {
    Klass = options.constructor;
    delete options.constructor;
  }

  window.annotator = new Klass(document.body, options);
  appLinkEl.addEventListener('destroy', function () {
    appLinkEl.parentElement.removeChild(appLinkEl);
    window.annotator.destroy();
    window.annotator = undefined;
  });
});
