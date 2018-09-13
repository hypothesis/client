'use strict';

const isBrowserExtension = require('../is-browser-extension');

describe('annotator.config.isBrowserExtension', function() {
  [
    {
      url: 'chrome-extension://abcxyz',
      returns: true,
    },
    {
      url: 'moz-extension://abcxyz',
      returns: true,
    },
    {
      url: 'ms-browser-extension://abcxyz',
      returns: true,
    },
    {
      url: 'http://partner.org',
      returns: false,
    },
    {
      url: 'https://partner.org',
      returns: false,
    },
    // It considers anything not http(s) to be a browser extension.
    {
      url: 'ftp://partner.org',
      returns: true,
    },
  ].forEach(function(test) {
    it('returns ' + test.returns + ' for ' + test.url, function() {
      assert.equal(isBrowserExtension(test.url), test.returns);
    });
  });
});
