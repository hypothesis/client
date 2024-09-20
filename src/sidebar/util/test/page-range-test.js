import {
  RangeOverlap,
  pageLabelInRange,
  pageRangeOverlap,
} from '../page-range';

describe('pageLabelInRange', () => {
  [
    // Single item range
    {
      label: '10',
      range: '10',
      match: true,
    },
    {
      label: '9',
      range: '10',
      match: false,
    },

    // Number in middle of range
    {
      label: '5',
      range: '4-8',
      match: true,
    },

    // Number at start of range
    {
      label: '4',
      range: '4-8',
      match: true,
    },

    // Number at end of range
    {
      label: '8',
      range: '4-8',
      match: true,
    },

    // Number before range
    {
      label: '3',
      range: '4-8',
      match: false,
    },

    // Number after range
    {
      label: '9',
      range: '4-8',
      match: false,
    },

    // Range unbounded at start
    {
      label: '5',
      range: '-8',
      match: true,
    },

    // Range unbounded at end
    {
      label: '5',
      range: '4-',
      match: true,
    },

    // Open range
    {
      label: '5',
      range: '-',
      match: true,
    },

    // Non-numeric single item
    {
      label: 'foo',
      range: 'foo',
      match: true,
    },
    {
      label: 'foo',
      range: 'bar',
      match: false,
    },

    // Non-numeric range
    {
      label: 'foo',
      range: 'foo-bar',
      match: false,
    },

    // Empty label
    {
      label: '',
      range: '1-2',
      match: false,
    },

    // Empty range
    {
      label: '1',
      range: '',
      match: false,
    },
  ].forEach(({ label, range, match }) => {
    it('returns true if the label is in the page range', () => {
      assert.equal(pageLabelInRange(label, range), match);
    });
  });
});

const RO = RangeOverlap;

describe('pageRangesOverlap', () => {
  [
    // Matching single page
    {
      rangeA: '1',
      rangeB: '1',
      overlap: RO.Overlap,
    },
    // Non-matching single page
    {
      rangeA: '1',
      rangeB: '2',
      overlap: RO.NoOverlap,
    },
    // Overlapping numeric ranges
    {
      rangeA: '1-2',
      rangeB: '2-4',
      overlap: RO.Overlap,
    },
    {
      rangeA: '2-4',
      rangeB: '1-2',
      overlap: RO.Overlap,
    },
    // Inverted numeric ranges. These are implicitly normalized.
    {
      rangeA: '2-1',
      rangeB: '4-2',
      overlap: RO.Overlap,
    },
    // Half-open ranges
    {
      rangeA: '1-',
      rangeB: '-3',
      overlap: RO.Overlap,
    },
    // Non-overlapping numeric ranges
    {
      rangeA: '1-2',
      rangeB: '3-4',
      overlap: RO.NoOverlap,
    },
    {
      rangeA: '3-4',
      rangeB: '1-2',
      overlap: RO.NoOverlap,
    },
    // Relation is undefined if either of the ranges is non-numeric.
    {
      rangeA: 'ii',
      rangeB: '3-4',
      overlap: RO.Unknown,
    },
    {
      rangeA: 'i-iii',
      rangeB: 'iii-iv',
      overlap: RO.Unknown,
    },
    {
      rangeA: '1-ii',
      rangeB: 'ii-3',
      overlap: RO.Unknown,
    },
    // As a special case, matching non-numeric ranges overlap.
    {
      rangeA: 'ii',
      rangeB: 'ii',
      overlap: RO.Overlap,
    },
  ].forEach(({ rangeA, rangeB, overlap }) => {
    it('returns whether two ranges overlap', () => {
      assert.strictEqual(pageRangeOverlap(rangeA, rangeB), overlap);
    });
  });
});
