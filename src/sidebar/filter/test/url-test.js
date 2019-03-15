'use strict';

const url = require('../url');

describe('url.encode', function() {
  it('urlencodes its input', function() {
    const expect = 'http%3A%2F%2Ffoo.com%2Fhello%20there.pdf';
    const result = url.encode('http://foo.com/hello there.pdf');

    assert.equal(result, expect);
  });

  it('returns the empty string for null values', function() {
    assert.equal(url.encode(null), '');
    assert.equal(url.encode(undefined), '');
  });
});
