import {
  cfiInRange,
  compareCFIs,
  documentCFI,
  stripCFIAssertions,
} from '../cfi';

describe('sidebar/util/cfi', () => {
  describe('stripCFIAssertions', () => {
    it('returns CFI without assertions unchanged', () => {
      assert.equal(stripCFIAssertions('/1/2/3/10'), '/1/2/3/10');
    });

    it('removes assertions from CFI', () => {
      assert.equal(stripCFIAssertions('/1/2[chap4ref]'), '/1/2');
      assert.equal(
        stripCFIAssertions('/1[part1ref]/2[chapter2ref]/3[subsectionref]'),
        '/1/2/3',
      );
    });

    it('ignores escaped characters', () => {
      assert.equal(stripCFIAssertions('/1/2[chap4^[ignoreme^]ref]'), '/1/2');
      assert.equal(stripCFIAssertions('/1/2[a^[b^]]/3[c^[d^]]'), '/1/2/3');
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
      // CFIs of unequal length
      {
        a: '/2/4/8',
        b: '/2/4',
        expected: 1,
      },
      {
        a: '/2/4',
        b: '/2/4/8',
        expected: -1,
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
      // strings. Non-numeric steps are not allowed by the grammar, but we
      // try to handle them gracefully.
      {
        a: '/2/4/def',
        b: '/2/4/abc',
        expected: 1,
      },
      // Number steps sort before string steps.
      {
        a: '/2/4',
        b: '/2/-',
        expected: -1,
      },
      // Empty CFIs
      {
        a: '',
        b: '',
        expected: 0,
      },
      // CFIs with step indirections. Only the part before the step indirection
      // is considered.
      {
        a: '/2!/4',
        b: '/2!/8',
        expected: 0,
      },
      {
        a: '/2!/4',
        b: '/4!/8',
        expected: -1,
      },
      {
        a: '/4!/8',
        b: '/2!/4',
        expected: 1,
      },
    ].forEach(({ a, b, expected }) => {
      it('compares CFIs', () => {
        assert.equal(
          compareCFIs(a, b),
          expected,
          `comparing CFIs "${a}" and "${b}" failed`,
        );
      });
    });
  });

  describe('documentCFI', () => {
    it('returns part of CFI before first step indirection', () => {
      // Typical CFI with one step indirection.
      assert.equal(documentCFI('/2/4/8!/10/12'), '/2/4/8');

      // Rarer case of CFI with multiple step indirections.
      assert.equal(documentCFI('/2/4/8!/10/12!/2/4'), '/2/4/8');
    });

    it('strips assertions', () => {
      assert.equal(
        documentCFI('/6/152[;vnd.vst.idref=ch13_01]!/4/2[ch13_sec_1]'),
        '/6/152',
      );
    });
  });

  describe('cfiInRange', () => {
    [
      // CFI before start of range
      {
        cfi: '/2',
        start: '/4',
        end: '/6',
        expected: false,
      },
      // CFI at start of range
      {
        cfi: '/2',
        start: '/2',
        end: '/3',
        expected: true,
      },
      // CFI in middle of range
      {
        cfi: '/4',
        start: '/2',
        end: '/6',
        expected: true,
      },
      // CFI at start and end of empty range
      {
        cfi: '/2',
        start: '/2',
        end: '/2',
        expected: false,
      },
      // CFI after end of range
      {
        cfi: '/6',
        start: '/2',
        end: '/4',
        expected: false,
      },
      // CFIs with step indirections. Only the part before the first step
      // indirection is considered.
      {
        cfi: '/6',
        start: '/6!/2',
        end: '/8!/4',
        expected: true,
      },
    ].forEach(({ cfi, start, end, expected }) => {
      it('should return true if the cfi is in the range [start, end)', () => {
        assert.equal(cfiInRange(cfi, start, end), expected);
      });
    });
  });
});
