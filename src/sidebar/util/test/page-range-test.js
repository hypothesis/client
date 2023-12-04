import { pageLabelInRange } from '../page-range';

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
  ].forEach(({ label, range, match }) => {
    it('returns true if the label is in the page range', () => {
      assert.equal(pageLabelInRange(label, range), match);
    });
  });
});
