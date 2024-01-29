import { escapeCSVValue } from '../csv';

describe('escapeCSVValue', () => {
  [
    { value: 'foo', expected: 'foo' },
    { value: 'foo,bar', expected: '"foo,bar"' },
    { value: 'foo,bar', expected: 'foo,bar', separator: '\t' },
    { value: 'with \r carriage return', expected: '"with \r carriage return"' },
    {
      value: `multiple
    lines`,
      expected: `"multiple
    lines"`,
    },
    { value: 'with "quotes"', expected: '"with ""quotes"""' },
    { value: 'foo\tbar', expected: 'foo\tbar' },
    { value: 'foo\tbar', expected: '"foo\tbar"', separator: '\t' },
  ].forEach(({ value, expected, separator = ',' }) => {
    it('escapes values', () => {
      assert.equal(escapeCSVValue(value, separator), expected);
    });
  });
});
