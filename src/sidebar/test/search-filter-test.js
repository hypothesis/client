'use strict';

var searchFilter = require('../search-filter')();

describe('sidebar.search-filter', function() {
  describe('#toObject', function() {
    it('puts a simple search string under the any filter', function() {
      var query = 'foo';
      var result = searchFilter.toObject(query);
      assert.equal(result.any[0], query);
    });

    it('uses the filters as keys in the result object', function() {
      var query = 'user:john text:foo quote:bar group:agroup other';
      var result = searchFilter.toObject(query);

      assert.equal(result.any[0], 'other');
      assert.equal(result.user[0], 'john');
      assert.equal(result.text[0], 'foo');
      assert.equal(result.quote[0], 'bar');
      assert.equal(result.group[0], 'agroup');
    });

    it('collects the same filters into a list', function() {
      var query = 'user:john text:foo quote:bar other user:doe text:fuu text:fii';
      var result = searchFilter.toObject(query);

      assert.equal(result.any[0], 'other');
      assert.equal(result.user[0], 'john');
      assert.equal(result.user[1], 'doe');
      assert.equal(result.text[0], 'foo');
      assert.equal(result.text[1], 'fuu');
      assert.equal(result.text[2], 'fii');
      assert.equal(result.quote[0], 'bar');
    });

    it('preserves data with semicolon characters', function() {
      var query = 'uri:http://test.uri';
      var result = searchFilter.toObject(query);
      assert.equal(result.uri[0], 'http://test.uri');
    });

    it('collects valid filters and puts invalid into the "any" category', function() {
      var query = 'uri:test foo:bar text:hey john:doe quote:according hi-fi a:bc';
      var result = searchFilter.toObject(query);

      assert.isUndefined(result.foo);
      assert.isUndefined(result.john);
      assert.isUndefined(result.a);
      assert.equal(result.uri[0], 'test');
      assert.equal(result.text[0], 'hey');
      assert.equal(result.quote[0], 'according');
      assert.equal(result.any[0], 'foo:bar');
      assert.equal(result.any[1], 'john:doe');
      assert.equal(result.any[2], 'hi-fi');
      assert.equal(result.any[3], 'a:bc');
    });
  });
});
