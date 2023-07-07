import { isObject } from '../is-object';

describe('isObject', () => {
  [
    { value: {}, expectedResult: true },
    { value: { foo: 'bar' }, expectedResult: true },
    { value: [], expectedResult: true },
    { value: new Event(''), expectedResult: true },
    { value: new Error(''), expectedResult: true },
    { value: null, expectedResult: false },
    { value: undefined, expectedResult: false },
    { value: 'foo', expectedResult: false },
    { value: 123, expectedResult: false },
    { value: () => {}, expectedResult: false },
  ].forEach(({ value, expectedResult }) => {
    it('returns expected result', () => {
      assert.equal(expectedResult, isObject(value));
    });
  });
});
