'use strict';

const urlUtil = require('../url-util');

describe('url-util', function() {
  describe('replaceURLParams()', function() {
    it('should replace params in URLs', function() {
      const replaced = urlUtil.replaceURLParams('http://foo.com/things/:id', {
        id: 'test',
      });
      assert.equal(replaced.url, 'http://foo.com/things/test');
    });

    it('should URL encode params in URLs', function() {
      const replaced = urlUtil.replaceURLParams('http://foo.com/things/:id', {
        id: 'foo=bar',
      });
      assert.equal(replaced.url, 'http://foo.com/things/foo%3Dbar');
    });

    it('should return unused params', function() {
      const replaced = urlUtil.replaceURLParams('http://foo.com/:id', {
        id: 'test',
        q: 'unused',
      });
      assert.deepEqual(replaced.params, { q: 'unused' });
    });
  });
});
