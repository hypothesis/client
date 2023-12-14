import { parseHypothesisSearchQuery, parseFilterQuery } from '../query-parser';

describe('sidebar/helpers/query-parser', () => {
  function isEmptyFilter(filter) {
    return Object.values(filter).every(value => value.length === 0);
  }

  describe('parseHypothesisSearchQuery', () => {
    it('puts a simple search string under the "any" filter', () => {
      const query = 'foo';
      const result = parseHypothesisSearchQuery(query);
      assert.equal(result.any[0], query);
    });

    it('returns an empty filter if input query is empty', () => {
      // Verify `isEmptyFilter` returns false for non-empty query.
      assert.isFalse(isEmptyFilter(parseHypothesisSearchQuery('some query')));

      // Now check various queries which should produce empty filters
      for (let emptyQuery of ['', '""', "''", ' ']) {
        const result = parseHypothesisSearchQuery(emptyQuery);
        assert.isTrue(
          isEmptyFilter(result),
          `expected "${emptyQuery}" to produce empty filter`,
        );
      }
    });

    it('uses the filters as keys in the result object', () => {
      const query = 'user:john text:foo quote:bar group:agroup other';
      const result = parseHypothesisSearchQuery(query);

      assert.equal(result.any[0], 'other');
      assert.equal(result.user[0], 'john');
      assert.equal(result.text[0], 'foo');
      assert.equal(result.quote[0], 'bar');
      assert.equal(result.group[0], 'agroup');
    });

    it('collects the same filters into a list', () => {
      const query =
        'user:john text:foo quote:bar other user:doe text:fuu text:fii';
      const result = parseHypothesisSearchQuery(query);

      assert.equal(result.any[0], 'other');
      assert.equal(result.user[0], 'john');
      assert.equal(result.user[1], 'doe');
      assert.equal(result.text[0], 'foo');
      assert.equal(result.text[1], 'fuu');
      assert.equal(result.text[2], 'fii');
      assert.equal(result.quote[0], 'bar');
    });

    it('preserves data with semicolon characters', () => {
      const query = 'uri:http://test.uri';
      const result = parseHypothesisSearchQuery(query);
      assert.equal(result.uri[0], 'http://test.uri');
    });

    it('collects valid filters and puts invalid into the "any" category', () => {
      const query =
        'uri:test foo:bar text:hey john:doe quote:according hi-fi a:bc';
      const result = parseHypothesisSearchQuery(query);

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

    it('supports quoting terms', () => {
      const parsed = parseHypothesisSearchQuery('user:"Dan Whaley"');
      assert.deepEqual(parsed, {
        user: ['Dan Whaley'],
      });
    });

    it('assigns unquoted terms to "any" category', () => {
      const parsed = parseHypothesisSearchQuery('user:Dan Whaley');
      assert.deepEqual(parsed, {
        any: ['Whaley'],
        user: ['Dan'],
      });
    });
  });

  describe('parseFilterQuery', () => {
    [
      // Empty queries.
      {
        query: '',
        expectedFilter: {},
      },
      {
        query: '  ',
        expectedFilter: {},
      },
      {
        query: '""',
        expectedFilter: {},
      },
      {
        query: "''",
        expectedFilter: {},
      },

      // Simple queries without term filters.
      {
        query: 'one two three',
        expectedFilter: {
          any: {
            operator: 'and',
            terms: ['one', 'two', 'three'],
          },
        },
      },

      // Queries with term filters.
      {
        query: 'tag:foo tag:bar',
        expectedFilter: {
          tag: {
            operator: 'and',
            terms: ['foo', 'bar'],
          },
        },
      },
      {
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
      },
      {
        query: 'user:john user:james',
        expectedFilter: {
          user: {
            operator: 'or',
            terms: ['john', 'james'],
          },
        },
      },
      {
        query: 'uri:https://example.org/article.html',
        expectedFilter: {
          uri: {
            operator: 'or',
            terms: ['https://example.org/article.html'],
          },
        },
      },
      {
        query: 'page:5-10',
        expectedFilter: {
          page: {
            operator: 'or',
            terms: ['5-10'],
          },
        },
      },
      {
        query: 'cfi:/2-/4',
        expectedFilter: {
          cfi: {
            operator: 'or',
            terms: ['/2-/4'],
          },
        },
      },
      // "group:" and "any:" are currently not treated as search fields in
      // the sidebar filter.
      {
        query: 'group:abcd',
        expectedFilter: {
          any: {
            operator: 'and',
            terms: ['group:abcd'],
          },
        },
      },
      {
        query: 'any:foo',
        expectedFilter: {
          any: {
            operator: 'and',
            terms: ['any:foo'],
          },
        },
      },
    ].forEach(({ query, expectedFilter }) => {
      it('parses a query', () => {
        const filter = parseFilterQuery(query);

        // Remove empty facets.
        Object.keys(filter).forEach(k => {
          if (filter[k].terms.length === 0) {
            delete filter[k];
          }
        });

        assert.deepEqual(filter, expectedFilter);
      });
    });

    [
      {
        timeExpr: '8sec',
        expectedSecs: 8,
      },
      {
        timeExpr: '7min',
        expectedSecs: 420,
      },
      {
        timeExpr: '7hour',
        expectedSecs: 7 * 60 * 60,
      },
      {
        timeExpr: '4day',
        expectedSecs: 4 * 60 * 60 * 24,
      },
      {
        timeExpr: '1week',
        expectedSecs: 1 * 60 * 60 * 24 * 7,
      },
      {
        timeExpr: '2month',
        expectedSecs: 2 * 60 * 60 * 24 * 30,
      },
      {
        timeExpr: '2year',
        expectedSecs: 2 * 60 * 60 * 24 * 365,
      },
      {
        timeExpr: '5wibble',
        expectedSecs: null,
      },
    ].forEach(({ timeExpr, expectedSecs }) => {
      it('parses a "since:" query', () => {
        const query = `since:${timeExpr}`;
        const filter = parseFilterQuery(query);

        if (expectedSecs === null) {
          assert.deepEqual(filter.since.terms, []);
        } else {
          assert.deepEqual(filter.since.terms, [expectedSecs]);
        }
      });
    });

    [
      // Standalone filters
      {
        addedFilters: { user: 'fakeusername' },
        expected: {
          user: {
            operator: 'or',
            terms: ['fakeusername'],
          },
        },
      },
      {
        addedFilters: { page: '2-4' },
        expected: {
          page: {
            operator: 'or',
            terms: ['2-4'],
          },
        },
      },
      {
        addedFilters: { cfi: '/2/2-/2/6' },
        expected: {
          cfi: {
            operator: 'or',
            terms: ['/2/2-/2/6'],
          },
        },
      },
      // Combined filters
      {
        addedFilters: { user: 'fakeusername' },
        query: 'user:otheruser',
        expected: {
          user: {
            operator: 'or',
            terms: ['fakeusername', 'otheruser'],
          },
        },
      },
      {
        addedFilters: { user: 'fakeusername' },
        query: 'foo',
        expected: {
          any: {
            operator: 'and',
            terms: ['foo'],
          },
          user: {
            operator: 'or',
            terms: ['fakeusername'],
          },
        },
      },
      {
        addedFilters: { page: '2-4' },
        query: 'page:6',
        expected: {
          page: {
            operator: 'or',
            terms: ['2-4', '6'],
          },
        },
      },
      {
        addedFilters: { cfi: '/2/2-/2/6' },
        query: 'cfi:/4/2-/4/4',
        expected: {
          cfi: {
            operator: 'or',
            terms: ['/2/2-/2/6', '/4/2-/4/4'],
          },
        },
      },
    ].forEach(({ addedFilters, query, expected }) => {
      it('adds additional filters to result', () => {
        const filter = parseFilterQuery(query ?? '', addedFilters);
        // Remove empty facets.
        Object.keys(filter).forEach(k => {
          if (filter[k].terms.length === 0) {
            delete filter[k];
          }
        });
        assert.deepEqual(filter, expected);
      });
    });
  });
});
