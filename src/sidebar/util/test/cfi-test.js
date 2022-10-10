import { compareCFIs, stripCFIAssertions } from '../cfi';

describe('sidebar/util/cfi', () => {
  describe('stripCFIAssertions', () => {
    it('returns CFI without assertions unchanged', () => {
      assert.equal(stripCFIAssertions('/1/2/3/10'), '/1/2/3/10');
    });

    it('removes assertions from CFI', () => {
      assert.equal(stripCFIAssertions('/1/2[chap4ref]'), '/1/2');
    });

    it('ignores escaped characters', () => {
      assert.equal(stripCFIAssertions('/1/2[chap4^[ignoreme^]ref]'), '/1/2');
    });
  });

  describe('compareCFIs', () => {
    [
      // Trivial cases
      {
        a: '/2/4',
        b: '/2/1',
        expected: 1,
      },
      {
        a: '/2/1',
        b: '/2/4',
        expected: -1,
      },
      {
        a: '/2/4',
        b: '/2/4',
        expected: 0,
      },
      // Check numeric steps are treated as numbers and not as strings.
      {
        a: '/2/3',
        b: '/2/10',
        expected: -1,
      },
      {
        a: '/2/10',
        b: '/2/3',
        expected: 1,
      },
      // Check that assertions are ignored.
      {
        a: '/2/4[foo]',
        b: '/2/4[bar]',
        expected: 0,
      },
      // CFIs with many steps
      {
        a: '/1/2/3/4/5/6/a/b/c',
        b: '/1/2/3/4/5/7/a/b/c',
        expected: -1,
      },
      // Check that steps that can't be parsed as numbers are handled as
      // strings.
      {
        a: '/2/4/def',
        b: '/2/4/abc',
        expected: 1,
      },
      // Empty CFIs
      {
        a: '',
        b: '',
        expected: 0,
      },
    ].forEach(({ a, b, expected }) => {
      it('compares CFIs', () => {
        assert.equal(
          compareCFIs(a, b),
          expected,
          `comparing CFIs "${a}" and "${b}" failed`
        );
      });
    });
  });
});
