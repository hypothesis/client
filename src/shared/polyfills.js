'use strict';

// ES2015 polyfills
require('core-js/es6/promise');
require('core-js/es6/map');
require('core-js/es6/set');
require('core-js/es6/symbol');
require('core-js/fn/array/find');
require('core-js/fn/array/find-index');
require('core-js/fn/array/from');
require('core-js/fn/array/includes');
require('core-js/fn/object/assign');
require('core-js/fn/string/ends-with');
require('core-js/fn/string/starts-with');

// ES2017
require('core-js/fn/object/values');

// URL constructor, required by IE 10/11,
// early versions of Microsoft Edge.
try {
  var url = new window.URL('https://hypothes.is');

  // Some browsers (eg. PhantomJS 2.x) include a `URL` constructor which works
  // but is broken.
  if (url.hostname !== 'hypothes.is') {
    throw new Error('Broken URL constructor');
  }
} catch (err) {
  require('js-polyfills/url');
}
