import { hasOwn } from '../has-own';

describe('hasOwn', () => {
  [
    [{ foo: 'bar' }, 'foo', true],
    [{ foo: 'bar' }, 'baz', false],
    [Object.create(null), 'foo', false],
    [{ hasOwnProperty: 'foo' }, 'hasOwnProperty', true],
  ].forEach(([object, property, expected]) => {
    it('returns true if object has own property', () => {
      assert.equal(hasOwn(object, property), expected);
    });
  });
});
