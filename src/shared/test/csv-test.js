import { escapeCSVValue } from '../csv';

describe('escapeCSVValue', () => {
  [
    { value: 'foo', expected: 'foo' },
    { value: 'foo,bar', expected: '"foo,bar"' },
    { value: 'with \r carriage return', expected: '"with \r carriage return"' },
    {
      value: `multiple
    lines`,
      expected: `"multiple
    lines"`,
    },
    { value: 'with "quotes"', expected: '"with ""quotes"""' },
  ].forEach(({ value, expected }) => {
    it('escapes values', () => {
      assert.equal(escapeCSVValue(value), expected);
    });
  });
});
