'use strict';

var searchFilter = require('../search-filter')();

describe('sidebar.search-filter', () => {
  describe('#toObject', () => {
    it('puts a simple search string under the any filter', () => {
      var query = 'foo';
      var result = searchFilter.toObject(query);
      assert.equal(result.any[0], query);
    });

    it('uses the filters as keys in the result object', () => {
      var query = 'user:john text:foo quote:bar group:agroup other';
      var result = searchFilter.toObject(query);

      assert.equal(result.any[0], 'other');
      assert.equal(result.user[0], 'john');
      assert.equal(result.text[0], 'foo');
      assert.equal(result.quote[0], 'bar');
      assert.equal(result.group[0], 'agroup');
    });

    it('collects the same filters into a list', () => {
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

    it('preserves data with semicolon characters', () => {
      var query = 'uri:http://test.uri';
      var result = searchFilter.toObject(query);
      assert.equal(result.uri[0], 'http://test.uri');
    });

    it('collects valid filters and puts invalid into the "any" category', () => {
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

  describe('#generateFacetedFilter', () => {
    [{
      query: 'one two three',
      expectedFilter: {
        any: {
          operator: 'and',
          terms: ['one', 'two', 'three'],
        },
      },
    },{
      query: 'tag:foo tag:bar',
      expectedFilter: {
        tag: {
          operator: 'and',
          terms: ['foo', 'bar'],
        },
      },
    },{
      query: 'quote:inthequote text:inthetext',
      expectedFilter: {
        quote: {
          operator: 'and',
          terms: ['inthequote'],
        },
        text: {
          operator: 'and',
          terms: ['inthetext'],
        },
      },
    },{
      query: 'user:john user:james',
      expectedFilter: {
        user: {
          operator: 'or',
          terms: ['john', 'james'],
        },
      },
    },{
      query: 'uri:https://example.org/article.html',
      expectedFilter: {
        uri: {
          operator: 'or',
          terms: ['https://example.org/article.html'],
        },
      },
    }].forEach(({ query, expectedFilter }) => {
      it('parses a search query', () => {
        var filter = searchFilter.generateFacetedFilter(query);

        // Remove empty facets.
        Object.keys(filter).forEach((k) => {
          if (filter[k].terms.length === 0) {
            delete filter[k];
          }
        });

        assert.deepEqual(filter, expectedFilter);
      });
    });

    [{
      timeExpr: '8sec',
      expectedSecs: 8,
    },{
      timeExpr: '7min',
      expectedSecs: 420,
    },{
      timeExpr: '7hour',
      expectedSecs: 7 * 60 * 60,
    },{
      timeExpr: '4day',
      expectedSecs: 4 * 60 * 60 * 24,
    },{
      timeExpr: '1week',
      expectedSecs: 1 * 60 * 60 * 24 * 7,
    },{
      timeExpr: '2month',
      expectedSecs: 2 * 60 * 60 * 24 * 30,
    },{
      timeExpr: '2year',
      expectedSecs: 2 * 60 * 60 * 24 * 365,
    },{
      timeExpr: '5wibble',
      expectedSecs: null,
    }].forEach(({ timeExpr, expectedSecs }) => {
      it('parses a "since:" query', () => {
        var query = `since:${timeExpr}`;
        var filter = searchFilter.generateFacetedFilter(query);

        if (expectedSecs === null) {
          assert.deepEqual(filter.since.terms, []);
        } else {
          assert.deepEqual(filter.since.terms, [expectedSecs]);
        }
      });
    });
  });
});
