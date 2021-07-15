import { parse, stringify } from '../query-string';

describe('sidebar/util/query-string', () => {
  describe('parse', () => {
    it('returns parsed record', () => {
      const query = '?foo=bar+baz%2Fboop&baz=meep';
      const parsed = parse(query);
      assert.deepEqual(parsed, { foo: 'bar baz/boop', baz: 'meep' });
    });
  });

  describe('stringify', () => {
    it('returns formatted query with sorted params', () => {
      const params = { foo: 'bar baz/boop', baz: 'meep' };
      const formatted = stringify(params);
      assert.equal(formatted, 'baz=meep&foo=bar+baz%2Fboop');
    });
  });
});
